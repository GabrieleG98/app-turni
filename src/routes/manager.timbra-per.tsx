import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Square, Loader2, Camera, Check } from "lucide-react";
import { isoData } from "@/lib/date-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/timbra-per")({
  component: TimbraPerPage,
});

function TimbraPerPage() {
  const { role, loading } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [orarioCustom, setOrarioCustom] = useState<Record<string, string>>({});
  const oggi = isoData(new Date());

  const { data: profili = [] } = useQuery({
    queryKey: ["timbra-per-profili"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, cognome, ruolo_lavoro")
        .order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["timbra-per-turni", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("data", oggi)
        .eq("pubblicato", true);
      return data ?? [];
    },
  });

  const { data: sessioni = [] } = useQuery({
    queryKey: ["timbra-per-sessioni", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .eq("data", oggi)
        .order("orario_clock_in", { ascending: true });
      return data ?? [];
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (role !== "manager") return <Navigate to="/dipendente" />;

  const turnoOf = (uid: string) => turni.find((t) => t.dipendente_id === uid);
  const sessioniOf = (uid: string) => sessioni.filter((s) => s.dipendente_id === uid);
  const sessioneAperta = (uid: string) => sessioniOf(uid).find((s) => !s.orario_clock_out) ?? null;

  const clockIn = async (uid: string) => {
  setBusy(uid);
  try {
    const turno = turnoOf(uid);
    const orarioStr = orarioCustom[uid];
    const orario = orarioStr
      ? new Date(`${oggi}T${orarioStr}`).toISOString()
      : new Date().toISOString();
    const { error } = await supabase.from("timbrature").insert({
      dipendente_id: uid,
      data: oggi,
      orario_clock_in: orario,
      foto_in_url: null,
      note: turno ? null : "Timbrato dal manager senza turno schedulato",
    });
    if (error) throw error;
    toast.success("Clock-in registrato");
    setOrarioCustom(({ [uid]: _, ...rest }) => rest);
    qc.invalidateQueries({ queryKey: ["timbra-per-sessioni"] });
  } catch (e: any) {
    toast.error("Errore", { description: e.message });
  } finally {
    setBusy(null);
  }
};

  const clockOut = async (uid: string) => {
  const sess = sessioneAperta(uid);
  if (!sess) return;
  setBusy(uid);
  try {
    const orarioStr = orarioCustom[uid];
    const orario = orarioStr
      ? new Date(`${oggi}T${orarioStr}`).toISOString()
      : new Date().toISOString();
    const { error } = await supabase
      .from("timbrature")
      .update({ orario_clock_out: orario, foto_out_url: null })
      .eq("id", sess.id);
    if (error) throw error;
    toast.success("Clock-out registrato");
    setOrarioCustom(({ [uid]: _, ...rest }) => rest);
    qc.invalidateQueries({ queryKey: ["timbra-per-sessioni"] });
  } catch (e: any) {
    toast.error("Errore", { description: e.message });
  } finally {
    setBusy(null);
  }
};

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/manager/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Timbra per…</h1>
          <p className="text-sm text-muted-foreground">
  Timbra entrata e uscita per qualsiasi membro del team
</p>
        </div>
      </div>

      <div className="grid gap-3 sm:hidden">
        {profili.map((p) => {
          const sess = sessioniOf(p.id);
          const aperta = sess.find((s) => !s.orario_clock_out);
          const turno = turnoOf(p.id);
          return (
            <Card key={p.id} className="p-3 space-y-2">
              <div>
                <div className="font-medium">{p.nome} {p.cognome}</div>
                <div className="text-xs text-muted-foreground">{p.ruolo_lavoro || "—"}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {turno ? `Turno: ${turno.tipo_turno} ${turno.ora_inizio.slice(0, 5)}–${turno.ora_fine.slice(0, 5)}` : "Nessun turno"}
                · Sessioni oggi: {sess.length}
                {aperta && <Badge className="ml-1 bg-emerald-600">In turno</Badge>}
              </div>
              <div className="flex gap-2">
  <Input
    type="time"
    className="w-24 text-xs"
    value={orarioCustom[p.id] ?? ""}
    onChange={(e) => setOrarioCustom({ ...orarioCustom, [p.id]: e.target.value })}
  />
</div>
              <div className="flex gap-2">
                {aperta ? (
                  <Button size="sm" variant="destructive" className="flex-1" disabled={busy === p.id} onClick={() => clockOut(p.id)}>
                    <Square className="h-3 w-3 mr-1 fill-current" /> Clock-out
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1" disabled={busy === p.id} onClick={() => clockIn(p.id)}>
                    <Play className="h-3 w-3 mr-1 fill-current" /> Clock-in
                  </Button>
                )}
                {!aperta && sess.length > 0 && (
                  <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => clockIn(p.id)}>
                    Nuova
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Persona</th>
              <th className="text-left p-3">Turno oggi</th>
              <th className="text-left p-3">Sessioni</th>
              <th className="text-left p-3">Orario custom</th>
              <th className="text-right p-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {profili.map((p) => {
              const turno = turnoOf(p.id);
              const sess = sessioniOf(p.id);
              const aperta = sess.find((s) => !s.orario_clock_out);
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{p.nome} {p.cognome}</div>
                    <div className="text-xs text-muted-foreground">{p.ruolo_lavoro || "—"}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {turno ? `${turno.tipo_turno} · ${turno.ora_inizio.slice(0, 5)}–${turno.ora_fine.slice(0, 5)}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-xs">
                    {sess.length} oggi
                    {aperta && <Badge className="ml-2 bg-emerald-600">In turno</Badge>}
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
                  
                  <td className="p-3 text-right space-x-2">
                    {aperta ? (
                      <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => clockOut(p.id)}>
                        <Square className="h-3 w-3 mr-1 fill-current" /> Clock-out
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy === p.id} onClick={() => clockIn(p.id)}>
                        <Play className="h-3 w-3 mr-1 fill-current" /> Clock-in
                      </Button>
                    )}
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
