import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtData, isoData, oreTimbratura, fmtOre } from "@/lib/date-utils";
import { getCurrentPosition, uploadSelfie, minutiPause, calcStraordinario } from "@/lib/timbrature-utils";
import { computeWindow, fmtRitardo } from "@/lib/timbra-window";
import { Play, Square, Sparkles, Coffee, Pause as PauseIcon, MapPin, Camera, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { CorrezioneDialog } from "@/components/correzione-dialog";

export const Route = createFileRoute("/dipendente/")({
  component: HomeOggi,
});

function HomeOggi() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const fileInRef = useRef<HTMLInputElement>(null);
  const fileOutRef = useRef<HTMLInputElement>(null);

  const oggi = isoData(new Date());

  const { data: turnoOggi } = useQuery({
    enabled: !!user,
    queryKey: ["mio-turno-oggi", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("data", oggi)
        .maybeSingle();
      return data;
    },
  });

  const { data: timbOggi } = useQuery({
    enabled: !!user,
    queryKey: ["timb-oggi", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .eq("data", oggi)
        .maybeSingle();
      return data;
    },
  });

  const { data: pause = [] } = useQuery({
    enabled: !!timbOggi,
    queryKey: ["pause-oggi", timbOggi?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pause")
        .select("*")
        .eq("timbratura_id", timbOggi!.id)
        .order("inizio", { ascending: true });
      return data ?? [];
    },
  });

  const pausaAperta = pause.find((p) => !p.fine);

  const handleClockIn = async (file: File | null) => {
    if (timbOggi) return toast.error("Hai già iniziato il turno oggi");
    setBusy(true);
    try {
      const coords = await getCurrentPosition();
      let foto_in_url: string | null = null;
      if (file) foto_in_url = await uploadSelfie(user!.id, file, "in");
      const { error } = await supabase.from("timbrature").insert({
        dipendente_id: user!.id,
        data: oggi,
        orario_clock_in: new Date().toISOString(),
        lat_in: coords?.lat ?? null,
        lng_in: coords?.lng ?? null,
        foto_in_url,
      });
      if (error) throw error;
      toast.success("Turno iniziato 🎉");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const handleClockOut = async (file: File | null) => {
    if (!timbOggi) return toast.error("Non hai ancora iniziato il turno");
    if (timbOggi.orario_clock_out) return toast.error("Turno già chiuso");
    if (pausaAperta) return toast.error("Chiudi prima la pausa in corso");
    setBusy(true);
    try {
      const coords = await getCurrentPosition();
      let foto_out_url: string | null = null;
      if (file) foto_out_url = await uploadSelfie(user!.id, file, "out");
      const { error } = await supabase
        .from("timbrature")
        .update({
          orario_clock_out: new Date().toISOString(),
          lat_out: coords?.lat ?? null,
          lng_out: coords?.lng ?? null,
          foto_out_url,
        })
        .eq("id", timbOggi.id);
      if (error) throw error;
      toast.success("Turno terminato");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const startPausa = async (tipo: "pranzo" | "caffe" | "altro") => {
    if (!timbOggi || timbOggi.orario_clock_out) return;
    if (pausaAperta) return toast.error("Hai già una pausa in corso");
    const { error } = await supabase.from("pause").insert({
      timbratura_id: timbOggi.id,
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

  const oreLordo = timbOggi ? oreTimbratura(timbOggi.orario_clock_in, timbOggi.orario_clock_out) : null;
  const minPause = minutiPause(pause);
  const oreNette = oreLordo !== null ? Math.max(0, oreLordo - minPause / 60) : null;
  const straord = oreNette !== null && turnoOggi
    ? calcStraordinario(oreNette, { ora_inizio: turnoOggi.ora_inizio, ora_fine: turnoOggi.ora_fine, data: turnoOggi.data })
    : 0;
  const inTurno = !!timbOggi && !timbOggi.orario_clock_out;
  const ora = new Date();
  const saluto = ora.getHours() < 12 ? "Buongiorno" : ora.getHours() < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-10">
          <div className="text-sm/none opacity-90">{saluto},</div>
          <h1 className="text-2xl font-bold mt-1">{profile?.nome ?? ""} 👋</h1>
          <div className="text-sm opacity-90 mt-1 capitalize">
            {fmtData(new Date(), "EEEE d MMMM")}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-6 space-y-4 pb-8">
        <Card className="p-5 shadow-lg border-0">
          {turnoOggi ? (
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
              </div>
              <div
                className={`w-2.5 h-16 rounded-full ${
                  turnoOggi.tipo_turno === "mattina"
                    ? "bg-turno-mattina"
                    : turnoOggi.tipo_turno === "pomeriggio"
                    ? "bg-turno-pomeriggio"
                    : "bg-turno-sera"
                }`}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Sparkles className="h-5 w-5 text-brand" />
              <div>
                <div className="font-medium text-foreground">Giorno libero</div>
                <div className="text-sm">Goditi la giornata!</div>
              </div>
            </div>
          )}
        </Card>

        {timbOggi && (
          <Card className="p-4 border-0 shadow-sm bg-brand-soft/50">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Inizio</div>
                <div className="font-bold mt-0.5">
                  {new Date(timbOggi.orario_clock_in).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Fine</div>
                <div className="font-bold mt-0.5">
                  {timbOggi.orario_clock_out
                    ? new Date(timbOggi.orario_clock_out).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ore nette</div>
                <div className="font-bold mt-0.5">{oreNette !== null ? fmtOre(oreNette) : "—"}</div>
              </div>
            </div>
            {(minPause > 0 || straord !== 0) && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>Pause: {Math.round(minPause)} min</span>
                {timbOggi.orario_clock_out && turnoOggi && (
                  <span className={straord > 0.1 ? "text-brand font-semibold" : straord < -0.1 ? "text-destructive font-semibold" : ""}>
                    {straord > 0 ? "+" : ""}{straord.toFixed(1)} h vs turno
                  </span>
                )}
              </div>
            )}
            {(timbOggi.lat_in || timbOggi.foto_in_url) && (
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                {timbOggi.lat_in && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS</span>}
                {timbOggi.foto_in_url && <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" /> Foto</span>}
              </div>
            )}
          </Card>
        )}

        {/* Pause */}
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
                <Button size="sm" variant="outline" onClick={() => startPausa("pranzo")}>
                  🍽️ Pranzo
                </Button>
                <Button size="sm" variant="outline" onClick={() => startPausa("caffe")}>
                  <Coffee className="h-4 w-4 mr-1" /> Caffè
                </Button>
                <Button size="sm" variant="outline" onClick={() => startPausa("altro")}>
                  Altro
                </Button>
              </div>
            )}
            {pause.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {pause.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span className="capitalize">{p.tipo}</span>
                    <span>
                      {new Date(p.inizio).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {p.fine ? new Date(p.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "in corso"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="grid gap-3">
          <input
            ref={fileInRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              handleClockIn(f);
            }}
          />
          <input
            ref={fileOutRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              handleClockOut(f);
            }}
          />

          {(() => {
            const win = computeWindow(turnoOggi);
            const canIn = !inTurno && !timbOggi?.orario_clock_out && (win.state === "available" || win.state === "late");
            const isLate = win.state === "late" && !inTurno;
            return (
              <>
                {!inTurno && !timbOggi?.orario_clock_out && (
                  <Button
                    size="lg"
                    className={`h-20 text-lg rounded-2xl shadow-lg ${isLate ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-brand-gradient text-brand-foreground hover:opacity-95 shadow-brand/30"}`}
                    onClick={() => fileInRef.current?.click()}
                    disabled={busy || !canIn}
                  >
                    {win.state === "too-early" || win.state === "no-shift" ? <Clock className="h-6 w-6 mr-2" /> : <Play className="h-6 w-6 mr-2 fill-current" />}
                    {win.state === "no-shift"
                      ? "Nessun turno oggi"
                      : win.state === "too-early"
                      ? `Disponibile alle ${turnoOggi?.ora_inizio.slice(0, 5)}`
                      : isLate
                      ? `Inizio turno · in ritardo ${fmtRitardo(win.minutiRitardo)}`
                      : win.state === "missed"
                      ? "Turno passato"
                      : "Inizio turno"}
                  </Button>
                )}
                {inTurno && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-20 text-lg rounded-2xl border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => fileOutRef.current?.click()}
                    disabled={busy || !!pausaAperta}
                  >
                    <Square className="h-6 w-6 mr-2 fill-current" /> Fine turno
                  </Button>
                )}
              </>
            );
          })()}
          {!inTurno && (
            <p className="text-[11px] text-center text-muted-foreground px-4">
              Verranno richiesti posizione GPS e selfie per validare la timbratura.
            </p>
          )}
          {timbOggi?.orario_clock_out && (
            <Card className="p-4 text-center text-sm text-muted-foreground border-dashed">
              Turno di oggi completato. Buon riposo! 🎉
            </Card>
          )}
          <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setCorrOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Segnala errore timbratura
          </Button>
        </div>
      </main>
      <CorrezioneDialog open={corrOpen} onOpenChange={setCorrOpen} timbraturaId={timbOggi?.id ?? null} defaultDate={oggi} />
    </>
  );
}
