import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export type Categoria = "matrimonio" | "riunione" | "evento_privato" | "altro";

export const CATEGORIA_COLORE: Record<Categoria, string> = {
  matrimonio: "#ec4899",
  riunione: "#3b82f6",
  evento_privato: "#8b5cf6",
  altro: "#64748b",
};

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  matrimonio: "Matrimonio",
  riunione: "Riunione",
  evento_privato: "Evento privato",
  altro: "Altro",
};

interface Evento {
  id?: string;
  titolo: string;
  descrizione: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  location: string;
  categoria: Categoria;
  colore: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: Partial<Evento> & { id?: string };
  defaultDate?: string;
  readOnly?: boolean;
}

export function EventoDialog({ open, onOpenChange, initialData, defaultDate, readOnly }: Props) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isManager = role === "manager";
  const canEdit = isManager && !readOnly;

  const [form, setForm] = useState<Evento>({
    titolo: "",
    descrizione: "",
    data: defaultDate ?? new Date().toISOString().slice(0, 10),
    ora_inizio: "",
    ora_fine: "",
    location: "",
    categoria: "altro",
    colore: CATEGORIA_COLORE.altro,
  });

  useEffect(() => {
    if (open) {
      setForm({
        id: initialData?.id,
        titolo: initialData?.titolo ?? "",
        descrizione: initialData?.descrizione ?? "",
        data: initialData?.data ?? defaultDate ?? new Date().toISOString().slice(0, 10),
        ora_inizio: initialData?.ora_inizio ?? "",
        ora_fine: initialData?.ora_fine ?? "",
        location: initialData?.location ?? "",
        categoria: (initialData?.categoria as Categoria) ?? "altro",
        colore: initialData?.colore ?? CATEGORIA_COLORE[(initialData?.categoria as Categoria) ?? "altro"],
      });
    }
  }, [open, initialData, defaultDate]);

  const salva = async () => {
    if (!form.titolo.trim()) { toast.error("Inserisci un titolo"); return; }
    const payload = {
      titolo: form.titolo.trim(),
      descrizione: form.descrizione || null,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      location: form.location || null,
      categoria: form.categoria,
      colore: form.colore,
    };
    const { error } = form.id
      ? await supabase.from("eventi_speciali").update(payload).eq("id", form.id)
      : await supabase.from("eventi_speciali").insert(payload);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success(form.id ? "Evento aggiornato" : "Evento creato");
    qc.invalidateQueries({ queryKey: ["eventi-speciali"] });
    onOpenChange(false);
  };

  const elimina = async () => {
    if (!form.id) return;
    if (!confirm("Eliminare questo evento?")) return;
    const { error } = await supabase.from("eventi_speciali").delete().eq("id", form.id);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Evento eliminato");
    qc.invalidateQueries({ queryKey: ["eventi-speciali"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{!canEdit ? form.titolo || "Evento" : form.id ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
          {!canEdit && <DialogDescription>Solo i manager possono modificare gli eventi.</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Titolo</Label>
            <Input value={form.titolo} disabled={!canEdit} onChange={(e) => setForm({ ...form, titolo: e.target.value })} placeholder="Es. Matrimonio Rossi" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.data} disabled={!canEdit} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ora inizio</Label>
              <Input type="time" value={form.ora_inizio} disabled={!canEdit} onChange={(e) => setForm({ ...form, ora_inizio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ora fine</Label>
              <Input type="time" value={form.ora_fine} disabled={!canEdit} onChange={(e) => setForm({ ...form, ora_fine: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={form.location} disabled={!canEdit} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Es. Sala Eventi" />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={form.categoria} disabled={!canEdit} onValueChange={(v) => setForm({ ...form, categoria: v as Categoria, colore: CATEGORIA_COLORE[v as Categoria] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORIA_LABEL) as Categoria[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: CATEGORIA_COLORE[c] }} />
                      {CATEGORIA_LABEL[c]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrizione / Note</Label>
            <Textarea rows={3} value={form.descrizione} disabled={!canEdit} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {canEdit && form.id && (
            <Button variant="destructive" onClick={elimina} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Elimina
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{canEdit ? "Annulla" : "Chiudi"}</Button>
          {canEdit && <Button onClick={salva}>Salva</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
