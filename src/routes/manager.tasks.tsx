import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ListChecks, Camera, CheckCircle2 } from "lucide-react";
import { isoData, fmtData } from "@/lib/date-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/tasks")({
  component: ManagerTasks,
});

const GIORNI = [
  { v: 1, l: "Lun" },
  { v: 2, l: "Mar" },
  { v: 3, l: "Mer" },
  { v: 4, l: "Gio" },
  { v: 5, l: "Ven" },
  { v: 6, l: "Sab" },
  { v: 7, l: "Dom" },
];

function ManagerTasks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [ricorrenza, setRicorrenza] = useState<"daily" | "weekly">("daily");
  const [giorni, setGiorni] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [assegnatoA, setAssegnatoA] = useState<string>("__all__");
  const [reparto, setReparto] = useState("");
  const [richiedeFoto, setRichiedeFoto] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_template")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti-tutti"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome, reparto");
      return data ?? [];
    },
  });

  const reset = () => {
    setTitolo("");
    setDescrizione("");
    setRicorrenza("daily");
    setGiorni([1, 2, 3, 4, 5, 6, 7]);
    setAssegnatoA("__all__");
    setReparto("");
    setRichiedeFoto(false);
  };

  const crea = async () => {
    if (!titolo.trim()) return toast.error("Inserisci un titolo");
    const { error } = await supabase.from("task_template").insert({
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      ricorrenza,
      giorni_settimana: giorni.length ? giorni : [1, 2, 3, 4, 5, 6, 7],
      assegnato_a: assegnatoA !== "__all__" ? assegnatoA : null,
      reparto: assegnatoA === "__all__" && reparto.trim() ? reparto.trim() : null,
      richiede_foto: richiedeFoto,
      created_by: user!.id,
    });
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Template creato");
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const toggleAttivo = async (id: string, attivo: boolean) => {
    await supabase.from("task_template").update({ attivo }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare questo template? Verranno rimossi anche i task generati.")) return;
    const { error } = await supabase.from("task_template").delete().eq("id", id);
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Template eliminato");
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const nomeDip = (id: string | null) => {
    if (!id) return "Tutti";
    const d = dipendenti.find((x: any) => x.id === id);
    return d ? `${d.nome} ${d.cognome}` : "—";
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Tasks & checklist
          </h1>
          <p className="text-sm text-muted-foreground">
            I template generano automaticamente i task quotidiani per i dipendenti.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuovo template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuovo template di task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titolo</Label>
                <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Pulizia bancone" />
              </div>
              <div>
                <Label>Descrizione (opzionale)</Label>
                <Textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Ricorrenza</Label>
                <Select value={ricorrenza} onValueChange={(v) => setRicorrenza(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Giornaliero</SelectItem>
                    <SelectItem value="weekly">Settimanale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giorni della settimana</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {GIORNI.map((g) => {
                    const on = giorni.includes(g.v);
                    return (
                      <button
                        key={g.v}
                        type="button"
                        onClick={() =>
                          setGiorni((prev) => (on ? prev.filter((x) => x !== g.v) : [...prev, g.v].sort()))
                        }
                        className={`px-2.5 py-1 text-xs rounded-md border ${
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                        }`}
                      >
                        {g.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Assegna a</Label>
                <Select value={assegnatoA} onValueChange={setAssegnatoA}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutti i dipendenti</SelectItem>
                    {dipendenti.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome} {d.cognome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {assegnatoA === "__all__" && (
                <div>
                  <Label>Reparto (opzionale)</Label>
                  <Input value={reparto} onChange={(e) => setReparto(e.target.value)} placeholder="Limita ad un reparto specifico" />
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="cursor-pointer">Richiede foto a fine task</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Il dipendente dovrà allegare una foto per chiudere il task.
                  </p>
                </div>
                <Switch checked={richiedeFoto} onCheckedChange={setRichiedeFoto} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={crea}>Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {templates.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nessun template. Creane uno per iniziare.
          </Card>
        )}
        {templates.map((t: any) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.titolo}</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted">
                    {t.ricorrenza}
                  </span>
                </div>
                {t.descrizione && (
                  <p className="text-sm text-muted-foreground mt-1">{t.descrizione}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>👤 {nomeDip(t.assegnato_a)}</span>
                  {t.reparto && <span>· 🏷️ {t.reparto}</span>}
                  <span>· 📅 {t.giorni_settimana.map((g: number) => GIORNI.find((x) => x.v === g)?.l).join(", ")}</span>
                  {t.richiede_foto && <span>· 📸 foto richiesta</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={t.attivo} onCheckedChange={(v) => toggleAttivo(t.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => elimina(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
