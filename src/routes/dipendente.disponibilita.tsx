import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GIORNI } from "@/lib/date-utils";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/dipendente/disponibilita")({
  component: DisponibilitaPage,
});

interface Form {
  giorno_settimana: number;
  ora_inizio: string;
  ora_fine: string;
  tipo: "disponibile" | "non_disponibile" | "preferito";
}

const TIPO_LABEL: Record<string, { label: string; cls: string }> = {
  disponibile: { label: "Disponibile", cls: "bg-turno-mattina text-turno-mattina-foreground" },
  preferito: { label: "Preferito", cls: "bg-turno-pomeriggio text-turno-pomeriggio-foreground" },
  non_disponibile: { label: "Non disponibile", cls: "bg-destructive/15 text-destructive" },
};

function DisponibilitaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({
    giorno_settimana: 0,
    ora_inizio: "09:00",
    ora_fine: "18:00",
    tipo: "disponibile",
  });

  const { data: rows = [] } = useQuery({
    enabled: !!user,
    queryKey: ["disponibilita", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("disponibilita")
        .select("*")
        .order("giorno_settimana")
        .order("ora_inizio");
      return data ?? [];
    },
  });

  const salva = async () => {
    if (!user) return;
    if (form.ora_fine <= form.ora_inizio) {
      toast.error("L'ora di fine deve essere dopo l'ora di inizio");
      return;
    }
    const { error } = await supabase.from("disponibilita").insert({
      dipendente_id: user.id,
      giorno_settimana: form.giorno_settimana,
      ora_inizio: form.ora_inizio,
      ora_fine: form.ora_fine,
      tipo: form.tipo,
    });
    if (error) {
      toast.error("Errore", { description: error.message });
    } else {
      toast.success("Disponibilità aggiunta");
      qc.invalidateQueries({ queryKey: ["disponibilita"] });
      setOpen(false);
    }
  };

  const elimina = async (id: string) => {
    const { error } = await supabase.from("disponibilita").delete().eq("id", id);
    if (error) toast.error("Errore eliminazione");
    else {
      toast.success("Eliminata");
      qc.invalidateQueries({ queryKey: ["disponibilita"] });
    }
  };

  const perGiorno = (g: number) => rows.filter((r) => r.giorno_settimana === g);

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
          <Link to="/dipendente/profilo" className="inline-flex items-center gap-1 text-sm opacity-90 mb-2">
            <ArrowLeft className="h-4 w-4" /> Profilo
          </Link>
          <h1 className="text-2xl font-bold">Le mie disponibilità</h1>
          <p className="text-sm opacity-90 mt-1">Indica quando puoi (o non puoi) lavorare</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-4 space-y-3 pb-4">
        <Button className="w-full" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Aggiungi fascia
        </Button>

        {GIORNI.map((nome, i) => {
          const items = perGiorno(i);
          if (items.length === 0) return null;
          return (
            <Card key={i} className="p-4 border-0 shadow-sm">
              <div className="font-semibold mb-2">{nome}</div>
              <div className="space-y-2">
                {items.map((r) => {
                  const meta = TIPO_LABEL[r.tipo];
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={meta.cls}>{meta.label}</Badge>
                        <span className="text-sm">
                          {r.ora_inizio.slice(0, 5)} – {r.ora_fine.slice(0, 5)}
                        </span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => elimina(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {rows.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground border-0 shadow-sm">
            Non hai ancora indicato nessuna disponibilità.
          </Card>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova fascia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Giorno</Label>
              <Select
                value={String(form.giorno_settimana)}
                onValueChange={(v) => setForm({ ...form, giorno_settimana: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GIORNI.map((g, i) => (
                    <SelectItem key={i} value={String(i)}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dalle</Label>
                <Input type="time" value={form.ora_inizio} onChange={(e) => setForm({ ...form, ora_inizio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Alle</Label>
                <Input type="time" value={form.ora_fine} onChange={(e) => setForm({ ...form, ora_fine: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: Form["tipo"]) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponibile">Disponibile</SelectItem>
                  <SelectItem value="preferito">Preferito</SelectItem>
                  <SelectItem value="non_disponibile">Non disponibile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={salva}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
