import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

// Legacy export — alcuni file lo importano ancora
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

interface FormState {
  id?: string;
  titolo: string;
  descrizione: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  location: string;
  categoria_id: string | null;
  colore: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: any;
  defaultDate?: string;
  readOnly?: boolean;
}

export function EventoDialog({ open, onOpenChange, initialData, defaultDate, readOnly }: Props) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isManager = role === "manager";
  const canEdit = isManager && !readOnly;

  const { data: categorie = [] } = useQuery({
    queryKey: ["evento-categorie"],
    queryFn: async () => {
      const { data } = await supabase.from("evento_categorie").select("*").order("ordine");
      return data ?? [];
    },
  });

  const [form, setForm] = useState<FormState>({
    titolo: "",
    descrizione: "",
    data: defaultDate ?? new Date().toISOString().slice(0, 10),
    ora_inizio: "",
    ora_fine: "",
    location: "",
    categoria_id: null,
    colore: "#3b82f6",
  });

  useEffect(() => {
    if (!open) return;
    const initCatId: string | null = initialData?.categoria_id ?? null;
    const fallbackCat = categorie[0];
    setForm({
      id: initialData?.id,
      titolo: initialData?.titolo ?? "",
      descrizione: initialData?.descrizione ?? "",
      data: initialData?.data ?? defaultDate ?? new Date().toISOString().slice(0, 10),
      ora_inizio: initialData?.ora_inizio ?? "",
      ora_fine: initialData?.ora_fine ?? "",
      location: initialData?.location ?? "",
      categoria_id: initCatId ?? fallbackCat?.id ?? null,
      colore: initialData?.colore ?? fallbackCat?.colore ?? "#3b82f6",
    });
  }, [open, initialData, defaultDate, categorie]);

  const onCategoriaChange = (id: string) => {
    const c = categorie.find((x) => x.id === id);
    setForm((f) => ({ ...f, categoria_id: id, colore: c?.colore ?? f.colore }));
  };

  const salva = async () => {
    if (!form.titolo.trim()) { toast.error("Inserisci un titolo"); return; }
    const payload: any = {
      titolo: form.titolo.trim(),
      descrizione: form.descrizione || null,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      location: form.location || null,
      categoria_id: form.categoria_id,
      colore: form.colore,
      categoria: "altro", // legacy NOT NULL enum column
    };
    const { error } = form.id
      ? await supabase.from("eventi_speciali").update(payload).eq("id", form.id)
      : await supabase.from("eventi_speciali").insert(payload);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success(form.id ? "Evento aggiornato" : "Evento creato");
    qc.invalidateQueries({ queryKey: ["eventi-speciali"] });
    qc.invalidateQueries({ queryKey: ["eventi-speciali-sett"] });
    onOpenChange(false);
  };

  const elimina = async () => {
    if (!form.id) return;
    if (!confirm("Eliminare questo evento?")) return;
    const { error } = await supabase.from("eventi_speciali").delete().eq("id", form.id);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Evento eliminato");
    qc.invalidateQueries({ queryKey: ["eventi-speciali"] });
    qc.invalidateQueries({ queryKey: ["eventi-speciali-sett"] });
    onOpenChange(false);
  };

  const categoriaSelezionata = categorie.find((c) => c.id === form.categoria_id);

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
            {categorie.length === 0 ? (
              <div className="text-xs text-muted-foreground border rounded-md p-2">
                Nessuna categoria disponibile. Chiedi al proprietario di crearne una nella Legenda categorie.
              </div>
            ) : (
              <Select value={form.categoria_id ?? undefined} disabled={!canEdit} onValueChange={onCategoriaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria">
                    {categoriaSelezionata && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: categoriaSelezionata.colore }} />
                        {categoriaSelezionata.nome}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categorie.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: c.colore }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          {canEdit && <Button onClick={salva} disabled={categorie.length === 0}>Salva</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
