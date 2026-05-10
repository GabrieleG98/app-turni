import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtData, fmtOre, oreTraOrari, isoData } from "@/lib/date-utils";
import { Sparkles, Coffee, Pause as PauseIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { CorrezioneDialog } from "@/components/correzione-dialog";
import { TurnoDialog } from "@/components/turno-dialog";
import { useTimbratura } from "@/hooks/use-timbratura";

export const Route = createFileRoute("/dipendente/")({
  component: HomeOggi,
});

function HomeOggi() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [corrOpen, setCorrOpen] = useState(false);
  const [turnoDialogOpen, setTurnoDialogOpen] = useState(false);

  const {
    sessioni,
    sessioneAttiva,
    pause,
    pausaAperta,
    inTurno,
    haGiaSessioni,
    oreLavorateOggi,
    turnoOggi,
  } = useTimbratura();

  const oreP = turnoOggi ? oreTraOrari(turnoOggi.ora_inizio, turnoOggi.ora_fine, turnoOggi.data) : 0;
  const diff = oreLavorateOggi - oreP;

  const ritardoMin = useMemo(() => {
    if (!turnoOggi || sessioni.length === 0) return null;
    const oggiStr = isoData(new Date());
    const previsto = new Date(`${oggiStr}T${turnoOggi.ora_inizio}`);
    const effettivo = new Date(sessioni[0].orario_clock_in);
    const delta = Math.round((effettivo.getTime() - previsto.getTime()) / 60000);
    return delta > 0 ? delta : null;
  }, [turnoOggi, sessioni]);

  const startPausa = async (tipo: "pranzo" | "caffe" | "altro") => {
    if (!sessioneAttiva) return;
    if (pausaAperta) return toast.error("Hai già una pausa in corso");
    const { error } = await supabase.from("pause").insert({
      timbratura_id: sessioneAttiva.id,
      dipendente_id: user!.id,
      tipo,
      inizio: new Date().toISOString(),
    });
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Pausa iniziata");
    qc.invalidateQueries({ queryKey: ["pause-oggi"] });
  };

  const endPausa = async () => {
    if (!pausaAperta) return;
    const { error } = await supabase
      .from("pause")
      .update({ fine: new Date().toISOString() })
      .eq("id", pausaAperta.id);
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Pausa terminata");
    qc.invalidateQueries({ queryKey: ["pause-oggi"] });
  };

  const ora = new Date();
  const saluto = ora.getHours() < 12 ? "Buongiorno" : ora.getHours() < 18 ? "Buon pomeriggio" : "Buonasera";
  const fmtH = (iso: string) =>
    new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-12 pb-10">
          <div className="text-sm/none opacity-90">{saluto},</div>
          <h1 className="text-2xl font-bold mt-1">{profile?.nome ?? ""} 👋</h1>
          <div className="text-sm opacity-90 mt-1 capitalize">
            {fmtData(new Date(), "EEEE d MMMM")}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-6 space-y-4 pb-32">
        <Card className="p-5 shadow-lg border-0">
          {turnoOggi ? (
            <button className="w-full text-left" onClick={() => setTurnoDialogOpen(true)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Turno di oggi
                  </div>
                  <div className="font-display text-xl font-bold capitalize mt-1">{turnoOggi.tipo_turno}</div>
                  <div className="text-base mt-0.5">
                    {turnoOggi.ora_inizio.slice(0, 5)} – {turnoOggi.ora_fine.slice(0, 5)}
                  </div>
                  {turnoOggi.location && (
                    <div className="text-sm text-muted-foreground mt-1">📍 {turnoOggi.location}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">Tocca per i dettagli →</div>
                </div>
                <div className={`w-2.5 h-16 rounded-full ${
                  turnoOggi.tipo_turno === "mattina"
                    ? "bg-turno-mattina"
                    : turnoOggi.tipo_turno === "pomeriggio"
                    ? "bg-turno-pomeriggio"
                    : "bg-turno-sera"
                }`} />
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Sparkles className="h-5 w-5 text-brand" />
              <div>
                <div className="font-medium text-foreground">Nessun turno schedulato</div>
                <div className="text-sm">Puoi comunque timbrare liberamente.</div>
              </div>
            </div>
          )}
        </Card>

        {ritardoMin !== null && (
          <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-destructive">Entrata in ritardo</span>
              <span className="text-muted-foreground ml-1">di {ritardoMin} min rispetto al turno</span>
            </div>
          </Card>
        )}

        {haGiaSessioni && (
          <Card className="p-4 border-0 shadow-sm bg-brand-soft/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Sessioni di oggi
              </div>
              <div className="text-sm font-semibold">{fmtOre(oreLavorateOggi)}</div>
            </div>
            <div className="space-y-1.5">
              {sessioni.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5 last:pb-0">
                  <span className="text-muted-foreground text-xs">#{i + 1}</span>
                  <span className="font-medium tabular-nums">
                    {fmtH(s.orario_clock_in)} – {s.orario_clock_out ? fmtH(s.orario_clock_out) : <span className="text-brand">in corso</span>}
                  </span>
                </div>
              ))}
            </div>
            {turnoOggi && (
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground">vs pianificato {fmtOre(oreP)}</span>
                <span className={diff > 0.1 ? "text-emerald-600 font-semibold" : diff < -0.1 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)} h
                </span>
              </div>
            )}
          </Card>
        )}

        {inTurno && (
          <Card className="p-4 border-0 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">Pause</div>
              {pausaAperta && (
                <span className="text-xs text-brand font-medium animate-pulse">In pausa…</span>
              )}
            </div>
            {pausaAperta ? (
              <Button onClick={endPausa} variant="outline" className="w-full">
                <PauseIcon className="h-4 w-4 mr-2" /> Termina pausa
              </Button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={() => startPausa("pranzo")}>🍽️ Pranzo</Button>
                <Button size="sm" variant="outline" onClick={() => startPausa("caffe")}>
                  <Coffee className="h-4 w-4 mr-1" /> Caffè
                </Button>
                <Button size="sm" variant="outline" onClick={() => startPausa("altro")}>Altro</Button>
              </div>
            )}
            {pause.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {pause.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span className="capitalize">{p.tipo}</span>
                    <span>{fmtH(p.inizio)}{" – "}{p.fine ? fmtH(p.fine) : "in corso"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card className="p-3 text-center text-xs text-muted-foreground border-dashed">
          Usa il pulsante <span className="font-semibold text-foreground">Timbra</span> in basso per registrare entrata/uscita. Puoi timbrare più volte nella stessa giornata.
        </Card>

        <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={() => setCorrOpen(true)}>
          <AlertTriangle className="h-4 w-4 mr-2" /> Segnala errore timbratura
        </Button>
      </main>

      <TurnoDialog
        turno={turnoOggi ?? null}
        open={turnoDialogOpen}
        onOpenChange={setTurnoDialogOpen}
      />
      <CorrezioneDialog
        open={corrOpen}
        onOpenChange={setCorrOpen}
        timbraturaId={sessioneAttiva?.id ?? sessioni[sessioni.length - 1]?.id ?? null}
        defaultDate={new Date().toISOString().slice(0, 10)}
      />
    </>
  );
}

