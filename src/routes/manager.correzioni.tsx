import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export const Route = createFileRoute("/manager/correzioni")({
  component: CorrezioniPage,
});

type Status = "pending" | "approved" | "rejected";
type Tipo = "mancata_clock_in" | "mancata_clock_out" | "orario_errato" | "altro";

const TIPO_LABEL: Record<Tipo, string> = {
  mancata_clock_in: "Mancata clock-in",
  mancata_clock_out: "Mancata clock-out",
  orario_errato: "Orario errato",
  altro: "Altro",
};

interface Correzione {
  id: string;
  dipendente_id: string;
  timbratura_id: string | null;
  data: string;
  tipo: Tipo;
  orario_richiesto_in: string | null;
  orario_richiesto_out: string | null;
  motivo: string;
  status: Status;
  note_manager: string | null;
  created_at: string;
  decisione_at: string | null;
}

function fmtOra(iso: string | null) {
  if (!iso) return "—";
  return format(parseISO(iso), "HH:mm");
}

function fmtGiorno(d: string) {
  try { return format(parseISO(d), "EEE dd/MM/yyyy", { locale: it }); }
  catch { return d; }
}

function CorrezioniPage() {
  const qc = useQueryClient();
  const [dialogRow, setDialogRow] = useState<Correzione | null>(null);
  const [decisione, setDecisione] = useState<"approved" | "rejected" | null>(null);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [showStorico, setShowStorico] = useState(false);

  const { data: correzioni = [] } = useQuery<Correzione[]>({
    queryKey: ["correzioni-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timbrature_correzioni")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Correzione[];
    },
  });

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome");
      return data ?? [];
    },
  });

  const profMap = new Map(profili.map((p: any) => [p.id, p]));

  const apriDialog = (row: Correzione, d: "approved" | "rejected") => {
    setDialogRow(row);
    setDecisione(d);
    setNota("");
  };

  const confermaDecisione = async () => {
    if (!dialogRow || !decisione) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("timbrature_correzioni")
        .update({
          status: decisione,
          note_manager: nota.trim() || null,
          decisione_di: user?.id ?? null,
          decisione_at: new Date().toISOString(),
        })
        .eq("id", dialogRow.id);

      if (error) throw error;

      // Se approvata + timbratura collegata: applica i nuovi orari
      if (decisione === "approved" && dialogRow.timbratura_id) {
        const updates: { orario_clock_in?: string; orario_clock_out?: string } = {};
        if (dialogRow.orario_richiesto_in) updates.orario_clock_in = dialogRow.orario_richiesto_in;
        if (dialogRow.orario_richiesto_out) updates.orario_clock_out = dialogRow.orario_richiesto_out;
        if (Object.keys(updates).length > 0) {
          const { error: tErr } = await supabase
            .from("timbrature")
            .update(updates)
            .eq("id", dialogRow.timbratura_id);
          if (tErr) console.warn("Aggiornamento timbratura fallito:", tErr.message);
        }
      }

      // Notifica al dipendente
      const approvatoLabel = decisione === "approved" ? "approvata ✅" : "rifiutata ❌";
      await supabase.from("notifiche").insert({
        user_id: dialogRow.dipendente_id,
        titolo: `Correzione timbratura ${approvatoLabel}`,
        descrizione: `La tua richiesta (${TIPO_LABEL[dialogRow.tipo]}) per il ${fmtGiorno(dialogRow.data)} è stata ${approvatoLabel}.${nota.trim() ? ` Nota: ${nota.trim()}` : ""}`,
        tipo: "generico",
        link: "/dipendente/timbra",
      });

      toast.success(decisione === "approved" ? "Correzione approvata" : "Correzione rifiutata");
      setDialogRow(null);
      qc.invalidateQueries({ queryKey: ["correzioni-manager"] });
      qc.invalidateQueries({ queryKey: ["correzioni"] });
      qc.invalidateQueries({ queryKey: ["correzioni-pending-count"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const pending = correzioni.filter((c) => c.status === "pending");
  const storico = correzioni.filter((c) => c.status !== "pending");

  const renderCard = (c: Correzione) => {
    const prof = profMap.get(c.dipendente_id) as any;
    const nomeDip = prof ? `${prof.nome} ${prof.cognome}` : "Dipendente";
    return (
      <Card key={c.id} className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <div className="font-semibold">{nomeDip}</div>
            <div className="text-sm text-muted-foreground">
              {fmtGiorno(c.data)} · <span>{TIPO_LABEL[c.tipo]}</span>
            </div>
            {(c.orario_richiesto_in || c.orario_richiesto_out) && (
              <div className="text-xs text-muted-foreground">
                {c.orario_richiesto_in && <span>In richiesto: <strong>{fmtOra(c.orario_richiesto_in)}</strong></span>}
                {c.orario_richiesto_in && c.orario_richiesto_out && <span> · </span>}
                {c.orario_richiesto_out && <span>Out richiesto: <strong>{fmtOra(c.orario_richiesto_out)}</strong></span>}
              </div>
            )}
          </div>
          <StatusBadge status={c.status} />
        </div>

        <div className="text-sm bg-muted/40 rounded p-2 italic text-muted-foreground">
          "{c.motivo}"
        </div>

        {c.note_manager && (
          <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
            <span className="font-medium">Nota manager:</span> {c.note_manager}
          </div>
        )}

        {c.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => apriDialog(c, "approved")}>
              <Check className="h-4 w-4 mr-1" /> Approva
            </Button>
            <Button size="sm" variant="outline" onClick={() => apriDialog(c, "rejected")}>
              <X className="h-4 w-4 mr-1" /> Rifiuta
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Correzioni timbratura
        </h1>
        <p className="text-sm text-muted-foreground">
          Richieste di correzione inviate dai dipendenti tramite "Segnala errore"
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> In attesa ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nessuna richiesta in attesa
          </Card>
        ) : (
          pending.map(renderCard)
        )}
      </section>

      {storico.length > 0 && (
        <section className="space-y-3">
          <button
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground w-full text-left hover:text-foreground transition-colors"
            onClick={() => setShowStorico((v) => !v)}
          >
            Storico ({storico.length})
            {showStorico ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showStorico && storico.map(renderCard)}
        </section>
      )}

      <Dialog open={!!dialogRow} onOpenChange={(o) => !o && setDialogRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisione === "approved" ? "Approva correzione" : "Rifiuta correzione"}
            </DialogTitle>
            <DialogDescription>
              {decisione === "approved"
                ? "La timbratura verrà aggiornata con i nuovi orari (se forniti)."
                : "Il dipendente verrà notificato del rifiuto."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nota per il dipendente (opzionale)</Label>
            <Textarea
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={decisione === "approved" ? "Es: Correzione applicata" : "Es: Contattami per chiarire"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRow(null)}>Annulla</Button>
            <Button
              onClick={confermaDecisione}
              disabled={busy}
              variant={decisione === "rejected" ? "destructive" : "default"}
            >
              {busy ? "Attendere..." : decisione === "approved" ? "Conferma approvazione" : "Conferma rifiuto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "pending") return <Badge variant="secondary">In attesa</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-600 text-white">Approvata</Badge>;
  return <Badge variant="destructive">Rifiutata</Badge>;
}
