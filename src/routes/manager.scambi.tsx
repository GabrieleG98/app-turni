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
    const updates: Record<string, unknown> = {
      status: decisione,
      decisione_di: user?.id,
      decisione_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("turno_swap_requests").update(updates).eq("id", id);
    if (error) {
      toast.error("Errore", { description: error.message });
      return;
    }
    if (decisione === "approved") {
      // Riassegno il turno al nuovo dipendente
      const { error: e2 } = await supabase
        .from("turni")
        .update({ dipendente_id: swap.a_dipendente })
        .eq("id", swap.turno_id);
      if (e2) {
        toast.error("Errore riassegnazione turno", { description: e2.message });
        return;
      }
      toast.success("Scambio approvato e turno riassegnato");
    } else {
      toast.success("Richiesta rifiutata");
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
        <p className="text-sm text-muted-foreground">Richieste dei dipendenti</p>
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
