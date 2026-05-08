import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtData, isoData, oreTimbratura, fmtOre } from "@/lib/date-utils";
import { Play, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/dipendente/")({
  component: HomeOggi,
});

function HomeOggi() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);

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

  const clockIn = async () => {
    if (timbOggi) return toast.error("Hai già iniziato il turno oggi");
    setBusy(true);
    const { error } = await supabase.from("timbrature").insert({
      dipendente_id: user!.id,
      data: oggi,
      orario_clock_in: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Turno iniziato");
    qc.invalidateQueries({ queryKey: ["timb-oggi"] });
  };

  const clockOut = async () => {
    if (!timbOggi) return toast.error("Non hai ancora iniziato il turno");
    if (timbOggi.orario_clock_out) return toast.error("Turno già chiuso");
    setBusy(true);
    const { error } = await supabase
      .from("timbrature")
      .update({ orario_clock_out: new Date().toISOString() })
      .eq("id", timbOggi.id);
    setBusy(false);
    if (error) return toast.error("Errore", { description: error.message });
    toast.success("Turno terminato");
    qc.invalidateQueries({ queryKey: ["timb-oggi"] });
  };

  const oreOggi = timbOggi ? oreTimbratura(timbOggi.orario_clock_in, timbOggi.orario_clock_out) : null;
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

      <main className="max-w-md mx-auto px-4 -mt-6 space-y-4">
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
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ore</div>
                <div className="font-bold mt-0.5">{oreOggi !== null ? fmtOre(oreOggi) : "—"}</div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-3">
          {!inTurno && !timbOggi?.orario_clock_out && (
            <Button
              size="lg"
              className="h-20 text-lg rounded-2xl bg-brand-gradient text-brand-foreground hover:opacity-95 shadow-lg shadow-brand/30"
              onClick={clockIn}
              disabled={busy}
            >
              <Play className="h-6 w-6 mr-2 fill-current" /> Inizio turno
            </Button>
          )}
          {inTurno && (
            <Button
              size="lg"
              variant="outline"
              className="h-20 text-lg rounded-2xl border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={clockOut}
              disabled={busy}
            >
              <Square className="h-6 w-6 mr-2 fill-current" /> Fine turno
            </Button>
          )}
          {timbOggi?.orario_clock_out && (
            <Card className="p-4 text-center text-sm text-muted-foreground border-dashed">
              Turno di oggi completato. Buon riposo! 🎉
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
