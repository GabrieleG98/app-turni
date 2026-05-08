import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Pencil } from "lucide-react";
import { fmtData } from "@/lib/date-utils";

export const Route = createFileRoute("/manager/correzioni")({
  component: CorrezioniPage,
});

const TIPO_LABEL: Record<string, string> = {
  mancata_clock_in: "Mancato clock-in",
  mancata_clock_out: "Mancato clock-out",
  orario_errato: "Orario errato",
  altro: "Altro",
};

function CorrezioniPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: correzioni = [] } = useQuery({
    queryKey: ["correzioni", filter],
    queryFn: async () => {
      let q = supabase.from("timbrature_correzioni").select("*").order("created_at", { ascending: false });
      if (filter === "pending") q = q.eq("status", "pending");
      const { data } = await q;
      return data ?? [];
    },
  });

  const ids = Array.from(new Set(correzioni.map((c) => c.dipendente_id)));
  const { data: profili = [] } = useQuery({
    enabled: ids.length > 0,
    queryKey: ["profili-corr", ids.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome").in("id", ids);
      return data ?? [];
    },
  });
  const nomeOf = (uid: string) => {
    const p = profili.find((x) => x.id === uid);
    return p ? `${p.nome} ${p.cognome}` : "—";
  };

  const decidi = async (c: any, status: "approved" | "rejected", noteManager?: string) => {
    if (status === "approved") {
      // Applica la modifica alla timbratura
      const update: any = {};
      if (c.orario_richiesto_in) update.orario_clock_in = c.orario_richiesto_in;
      if (c.orario_richiesto_out) update.orario_clock_out = c.orario_richiesto_out;

      if (c.timbratura_id) {
        if (Object.keys(update).length > 0) {
          const { error } = await supabase.from("timbrature").update(update).eq("id", c.timbratura_id);
          if (error) { toast.error("Errore aggiornamento timbratura", { description: error.message }); return; }
        }
      } else if (c.orario_richiesto_in) {
        // Crea una timbratura nuova
        const { error } = await supabase.from("timbrature").insert({
          dipendente_id: c.dipendente_id,
          data: c.data,
          orario_clock_in: c.orario_richiesto_in,
          orario_clock_out: c.orario_richiesto_out ?? null,
          note: `Creata da correzione: ${c.motivo}`,
        });
        if (error) { toast.error("Errore creazione timbratura", { description: error.message }); return; }
      }
    }

    const { error } = await supabase
      .from("timbrature_correzioni")
      .update({
        status,
        decisione_at: new Date().toISOString(),
        note_manager: noteManager ?? null,
      })
      .eq("id", c.id);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success(status === "approved" ? "Approvata" : "Rifiutata");
    qc.invalidateQueries({ queryKey: ["correzioni"] });
    setEditing(null);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Correzioni timbratura</h1>
        <div className="flex gap-2">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
            In attesa
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            Tutte
          </Button>
        </div>
      </div>

      {correzioni.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Nessuna richiesta</Card>
      )}

      {correzioni.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{nomeOf(c.dipendente_id)}</span>
                <Badge variant="outline">{TIPO_LABEL[c.tipo]}</Badge>
                <span className="text-sm text-muted-foreground">{fmtData(c.data, "EEE dd/MM/yyyy")}</span>
                {c.status === "approved" && <Badge className="bg-emerald-600">Approvata</Badge>}
                {c.status === "rejected" && <Badge variant="destructive">Rifiutata</Badge>}
                {c.status === "pending" && <Badge variant="secondary">In attesa</Badge>}
              </div>
              <p className="mt-2 text-sm">{c.motivo}</p>
              <div className="mt-2 text-xs text-muted-foreground space-x-3">
                {c.orario_richiesto_in && <span>Clock-in richiesto: <strong>{new Date(c.orario_richiesto_in).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</strong></span>}
                {c.orario_richiesto_out && <span>Clock-out richiesto: <strong>{new Date(c.orario_richiesto_out).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</strong></span>}
              </div>
              {c.note_manager && <div className="mt-2 text-xs text-muted-foreground italic">Nota manager: {c.note_manager}</div>}
            </div>
            {c.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Pencil className="h-3 w-3 mr-1" /> Modifica
                </Button>
                <Button size="sm" variant="destructive" onClick={() => decidi(c, "rejected")}>
                  <X className="h-3 w-3 mr-1" /> Rifiuta
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decidi(c, "approved")}>
                  <Check className="h-3 w-3 mr-1" /> Approva
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}

      {editing && <EditDialog correzione={editing} onClose={() => setEditing(null)} onSave={decidi} />}
    </div>
  );
}

function EditDialog({ correzione, onClose, onSave }: { correzione: any; onClose: () => void; onSave: (c: any, s: "approved", note?: string) => void }) {
  const [oraIn, setOraIn] = useState(correzione.orario_richiesto_in ? new Date(correzione.orario_richiesto_in).toISOString().slice(11, 16) : "");
  const [oraOut, setOraOut] = useState(correzione.orario_richiesto_out ? new Date(correzione.orario_richiesto_out).toISOString().slice(11, 16) : "");
  const [note, setNote] = useState("");

  const save = () => {
    const updated = {
      ...correzione,
      orario_richiesto_in: oraIn ? new Date(`${correzione.data}T${oraIn}`).toISOString() : null,
      orario_richiesto_out: oraOut ? new Date(`${correzione.data}T${oraOut}`).toISOString() : null,
    };
    onSave(updated, "approved", note);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica e approva</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Clock-in</Label>
            <Input type="time" value={oraIn} onChange={(e) => setOraIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Clock-out</Label>
            <Input type="time" value={oraOut} onChange={(e) => setOraOut(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nota per il dipendente</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={save}>Approva con modifiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
