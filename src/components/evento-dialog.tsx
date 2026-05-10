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
import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

async function inviaNotificaTutti(titolo: string, descrizione: string, link: string) {
  const { data: utenti } = await supabase.from("profiles").select("id");
  if (!utenti || utenti.length === 0) return;
  await supabase.from("notifiche").insert(
    utenti.map((u) => ({
      user_id: u.id,
      titolo,
      descrizione,
      link,
    }))
  );
}

export function EventoDialog({ open, onOpenChange, initialData, defaultDate, readOnly }: Props) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isManager = role === "manager";

  // modalità: "view" quando si apre un evento esistente, "edit" quando si crea o si clicca Modifica
  const [modalita, setModalita] = useState<"view" | "edit">("edit");

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
    // Se è un evento esistente → modalità visualizzazione; se nuovo → modifica
    setModalita(initialData?.id ? "view" : "edit");
  }, [open, initialData, defaultDate, categorie]);

  const onCategoriaChange = (id: string) => {
    const c = categorie.find((x) => x.id === id);
    setForm((f) => ({ ...f, categoria_id: id, colore: c?.colore ?? f.colore }));
  };

  const salva = async () => {
    if (!form.titolo.trim()) { toast.error("Inserisci un titolo"); return; }
    const isNuovo = !form.id;
    const payload: any = {
      titolo: form.titolo.trim(),
      descrizione: form.descrizione || null,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      location: form.location || null,
      categoria_id: form.categoria_id,
      colore: form.colore,
      categoria: "altro",
    };
    const { data: saved, error } = form.id
      ? await supabase.from("eventi_speciali").update(payload).eq("id", form.id).select().single()
      : await supabase.from("eventi_speciali").insert(payload).select().single();
    if (error) { toast.error("Errore", { description: error.message }); return; }

    // Notifica a tutti
    const dataFmt = format(new Date(form.data), "d MMMM yyyy", { locale: it });
    const orario = form.ora_inizio ? ` · ${form.ora_inizio.slice(0, 5)}${form.ora_fine ? `–${form.ora_fine.slice(0, 5)}` : ""}` : "";
    await inviaNotificaTutti(
      isNuovo ? `📅 Nuovo evento: ${form.titolo.trim()}` : `✏️ Evento aggiornato: ${form.titolo.trim()}`,
      `${dataFmt}${orario}${form.location ? ` · ${form.location}` : ""}`,
      "/calendario"
    );

    toast.success(form.id ? "Evento aggiornato" : "Evento creato");
    qc.invalidateQueries({ queryKey: ["eventi-speciali"] });
    qc.invalidateQueries({ queryKey: ["eventi-speciali-sett"] });
    qc.invalidateQueries({ queryKey: ["notifiche"] });

    // Dopo salvataggio → torna in visualizzazione
    if (saved?.id) {
      setForm((f) => ({ ...f, id: saved.id }));
      setModalita("view");
    } else {
      onOpenChange(false);
    }
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
  const canEdit = isManager && !readOnly;

  // ── MODALITÀ VISUALIZZAZIONE ──────────────────────────────────────
  if (modalita === "view") {
    const dataFmt = form.data
      ? format(new Date(form.data), "EEEE d MMMM yyyy", { locale: it })
      : "—";
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {categoriaSelezionata && (
                <span className="h-3 w-3 rounded-full shrink-0 mt-0.5" style={{ background: categoriaSelezionata.colore }} />
              )}
              <DialogTitle className="capitalize">{form.titolo || "Evento"}</DialogTitle>
            </div>
            {categoriaSelezionata && (
              <DialogDescription>{categoriaSelezionata.nome}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Data</span>
              <span className="capitalize">{dataFmt}</span>
            </div>
            {(form.ora_inizio || form.ora_fine) && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Orario</span>
                <span>
                  {form.ora_inizio ? form.ora_inizio.slice(0, 5) : "—"}
                  {form.ora_fine ? ` – ${form.ora_fine.slice(0, 5)}` : ""}
                </span>
              </div>
            )}
            {form.location && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Location</span>
                <span>{form.location}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Note</span>
              <span className="whitespace-pre-wrap">{form.descrizione || "/"}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            {canEdit && form.id && (
              <Button variant="destructive" onClick={elimina} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-1" /> Elimina
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
            {canEdit && (
              <Button onClick={() => setModalita("edit")}>
                <Pencil className="h-4 w-4 mr-2" /> Modifica
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── MODALITÀ MODIFICA/CREAZIONE ───────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Titolo</Label>
            <Input value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} placeholder="Es. Matrimonio Rossi" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ora inizio</Label>
              <Input type="time" value={form.ora_inizio} onChange={(e) => setForm({ ...form, ora_inizio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ora fine</Label>
              <Input type="time" value={form.ora_fine} onChange={(e) => setForm({ ...form, ora_fine: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Es. Sala Eventi" />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            {categorie.length === 0 ? (
              <div className="text-xs text-muted-foreground border rounded-md p-2">
                Nessuna categoria disponibile. Chiedi al proprietario di crearne una nella Legenda categorie.
              </div>
            ) : (
              <Select value={form.categoria_id ?? undefined} onValueChange={onCategoriaChange}>
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
            <Textarea rows={3} value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {canEdit && form.id && (
            <Button variant="destructive" onClick={elimina} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Elimina
            </Button>
          )}
          <Button variant="outline" onClick={() => form.id ? setModalita("view") : onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={salva} disabled={categorie.length === 0}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

