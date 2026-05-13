import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock } from "lucide-react";
import { fmtData } from "@/lib/date-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/scambi")({
  component: ScambiPage,
});

interface SwapRow {
  id: string;
  turno_id: string;
  da_dipendente: string;
  a_dipendente: string;
  motivo: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
}

function ScambiPage() {
  const qc = useQueryClient();

  const { data: swaps = [] } = useQuery({
    queryKey: ["swap-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turno_swap_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as SwapRow[];
    },
  });

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome");
      return data ?? [];
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-all"],
    queryFn: async () => {
      const { data } = await supabase.from("turni").select("id, data, ora_inizio, ora_fine, tipo_turno");
      return data ?? [];
    },
  });

  const profMap = new Map(profili.map((p) => [p.id, p]));
  const turnoMap = new Map(turni.map((t) => [t.id, t]));

  const decidi = async (id: string, decisione: "approved" | "rejected", swap: SwapRow) => {
    const { data: { user } } = await supabase.auth.getUser();

    const daProfile = profMap.get(swap.da_dipendente);
    const aProfile = profMap.get(swap.a_dipendente);
    const turno = turnoMap.get(swap.turno_id);

    const turnoLabel = turno
      ? `${fmtData(new Date(turno.data))} · ${turno.tipo_turno} · ${turno.ora_inizio.slice(0, 5)}–${turno.ora_fine.slice(0, 5)}`
      : "turno assegnato";

    if (decisione === "approved") {
      // FIX #3: operazione atomica tramite RPC per evitare stato inconsistente
      // (se l'update del turno falliva, lo swap risultava già "approved" nel DB)
      const { error } = await supabase.rpc("approve_swap", {
        _swap_id: id,
        _manager_id: user?.id ?? null,
        _nuovo_dipendente: swap.a_dipendente,
        _turno_id: swap.turno_id,
      });

      if (error) {
        toast.error("Errore approvazione scambio", { description: error.message });
        return;
      }

      toast.success("Scambio approvato e turno riassegnato");

      const notificheDaInserire = [
        {
          user_id: swap.da_dipendente,
          titolo: "Scambio turno approvato",
          descrizione: `La tua richiesta di scambio per il ${turnoLabel} è stata approvata.`,
          link: "/dipendente/turni",
        },
        {
          user_id: swap.a_dipendente,
          titolo: "Ti è stato assegnato un turno tramite scambio",
          descrizione: `Hai ricevuto un turno tramite scambio da ${daProfile ? `${daProfile.nome} ${daProfile.cognome}` : "un collega"} per il ${turnoLabel}.`,
          link: "/dipendente/turni",
        },
      ];

      const { error: notifError } = await supabase.from("notifiche").insert(notificheDaInserire);
      if (notifError) console.error("Errore inserimento notifiche scambio approvato:", notifError);

    } else {
      // Rifiuto: solo aggiornamento status, nessuna modifica al turno
      const { error } = await supabase
        .from("turno_swap_requests")
        .update({
          status: decisione,
          decisione_di: user?.id,
          decisione_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error("Errore", { description: error.message });
        return;
      }

      toast.success("Richiesta rifiutata");

      const { error: notifError } = await supabase.from("notifiche").insert({
        user_id: swap.da_dipendente,
        titolo: "Scambio turno rifiutato",
        descrizione: `La tua richiesta di scambio per il ${turnoLabel} è stata rifiutata dal manager.`,
        link: "/dipendente/turni",
      });
      if (notifError) console.error("Errore inserimento notifiche scambio rifiutato:", notifError);
    }

    qc.invalidateQueries({ queryKey: ["swap-requests"] });
    qc.invalidateQueries({ queryKey: ["turni-settimana"] });
  };

  const pending = swaps.filter((s) => s.status === "pending");
  const storico = swaps.filter((s) => s.status !== "pending");

  const renderRow = (s: SwapRow) => {
    const da = profMap.get(s.da_dipendente);
    const a = profMap.get(s.a_dipendente);
    const t = turnoMap.get(s.turno_id);
    return (
      <Card key={s.id} className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="font-medium">
              {da?.nome} {da?.cognome} → {a?.nome} {a?.cognome}
            </div>
            <div className="text-xs text-muted-foreground">
              {t ? `${fmtData(new Date(t.data))} · ${t.tipo_turno} · ${t.ora_inizio.slice(0, 5)}–${t.ora_fine.slice(0, 5)}` : "Turno eliminato"}
            </div>
          </div>
          <StatusBadge status={s.status} />
        </div>
        {s.motivo && <div className="text-sm bg-muted/40 rounded p-2">{s.motivo}</div>}
        {s.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => decidi(s.id, "approved", s)}>
              <Check className="h-4 w-4 mr-1" /> Approva
            </Button>
            <Button size="sm" variant="outline" onClick={() => decidi(s.id, "rejected", s)}>
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
        <h1 className="text-2xl font-bold">Scambi turno</h1>
        <p className="text-sm text-muted-foreground">
          Richieste di scambio turno in attesa di approvazione
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> In attesa ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nessuna richiesta in attesa</Card>
        ) : (
          pending.map(renderRow)
        )}
      </section>

      {storico.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Storico</h2>
          {storico.map(renderRow)}
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SwapRow["status"] }) {
  if (status === "pending") return <Badge variant="secondary">In attesa</Badge>;
  if (status === "approved") return <Badge className="bg-turno-mattina text-turno-mattina-foreground">Approvato</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rifiutato</Badge>;
  return <Badge variant="outline">Annullato</Badge>;
}
