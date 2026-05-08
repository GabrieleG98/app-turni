import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Square, Loader2 } from "lucide-react";
import { isoData } from "@/lib/date-utils";
import { computeWindow, fmtRitardo } from "@/lib/timbra-window";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/timbra-per")({
  component: TimbraPerPage,
});

function TimbraPerPage() {
  const { isOwner, loading } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [orarioCustom, setOrarioCustom] = useState<Record<string, string>>({});
  const oggi = isoData(new Date());

  const { data: profili = [] } = useQuery({
    queryKey: ["timbra-per-profili"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome, ruolo_lavoro").order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["timbra-per-turni", oggi],
    queryFn: async () => {
      const { data } = await supabase.from("turni").select("*").eq("data", oggi).eq("pubblicato", true);
      return data ?? [];
    },
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbra-per-timb", oggi],
    queryFn: async () => {
      const { data } = await supabase.from("timbrature").select("*").eq("data", oggi);
      return data ?? [];
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isOwner) return <Navigate to="/manager/dashboard" />;

  const turnoOf = (uid: string) => turni.find((t) => t.dipendente_id === uid);
  const timbOf = (uid: string) => timbrature.find((t) => t.dipendente_id === uid);

  const clockIn = async (uid: string) => {
    setBusy(uid);
    const turno = turnoOf(uid);
    const orarioStr = orarioCustom[uid];
    const orario = orarioStr ? new Date(`${oggi}T${orarioStr}`).toISOString() : new Date().toISOString();
    const { error } = await supabase.from("timbrature").insert({
      dipendente_id: uid,
      data: oggi,
      orario_clock_in: orario,
      note: turno ? null : "Timbrato dall'owner senza turno schedulato",
    });
    setBusy(null);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Clock-in registrato");
    qc.invalidateQueries({ queryKey: ["timbra-per-timb"] });
  };

  const clockOut = async (uid: string) => {
    const t = timbOf(uid);
    if (!t) return;
    setBusy(uid);
    const orarioStr = orarioCustom[uid];
    const orario = orarioStr ? new Date(`${oggi}T${orarioStr}`).toISOString() : new Date().toISOString();
    const { error } = await supabase.from("timbrature").update({ orario_clock_out: orario }).eq("id", t.id);
    setBusy(null);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Clock-out registrato");
    qc.invalidateQueries({ queryKey: ["timbra-per-timb"] });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/manager/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">Timbra per…</h1>
          <p className="text-sm text-muted-foreground">Solo owner · timbra clock-in/out per qualsiasi membro del team</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Persona</th>
              <th className="text-left p-3">Turno oggi</th>
              <th className="text-left p-3">Stato</th>
              <th className="text-left p-3">Orario custom</th>
              <th className="text-right p-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {profili.map((p) => {
              const turno = turnoOf(p.id);
              const t = timbOf(p.id);
              const win = turno ? computeWindow(turno) : null;
              const inCorso = !!t && !t.orario_clock_out;
              const completato = !!t?.orario_clock_out;
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.nome} {p.cognome}</div>
                    <div className="text-xs text-muted-foreground">{p.ruolo_lavoro}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {turno ? `${turno.tipo_turno} · ${turno.ora_inizio.slice(0, 5)}–${turno.ora_fine.slice(0, 5)}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">
                    {completato ? (
                      <Badge variant="outline">Completato</Badge>
                    ) : inCorso ? (
                      <Badge className="bg-emerald-600">In turno</Badge>
                    ) : turno && win && win.state === "late" ? (
                      <Badge variant="destructive">In ritardo {fmtRitardo(win.minutiRitardo)}</Badge>
                    ) : turno && win && win.state === "missed" ? (
                      <Badge variant="destructive">Mancato</Badge>
                    ) : turno ? (
                      <Badge variant="secondary">Da iniziare</Badge>
                    ) : (
                      <Badge variant="outline">Senza turno</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Input
                      type="time"
                      className="w-28"
                      value={orarioCustom[p.id] ?? ""}
                      onChange={(e) => setOrarioCustom({ ...orarioCustom, [p.id]: e.target.value })}
                      placeholder="adesso"
                    />
                  </td>
                  <td className="p-3 text-right">
                    {!t && (
                      <Button size="sm" disabled={busy === p.id} onClick={() => clockIn(p.id)}>
                        <Play className="h-3 w-3 mr-1 fill-current" /> Clock-in
                      </Button>
                    )}
                    {inCorso && (
                      <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => clockOut(p.id)}>
                        <Square className="h-3 w-3 mr-1 fill-current" /> Clock-out
                      </Button>
                    )}
                    {completato && <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
