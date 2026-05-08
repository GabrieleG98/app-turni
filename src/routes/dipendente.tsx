import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtData, giorniSettimana, inizioSettimana, isoData, GIORNI, oreTimbratura, fmtOre } from "@/lib/date-utils";
import { Loader2, LogOut, Play, Square, Hotel } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/dipendente")({
  component: AreaDipendente,
});

function AreaDipendente() {
  const qc = useQueryClient();
  const { loading, user, profile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const oggi = isoData(new Date());
  const inizio = inizioSettimana();
  const giorni = giorniSettimana(inizio);
  const fine = giorni[6];

  const { data: turni = [] } = useQuery({
    enabled: !!user,
    queryKey: ["miei-turni", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase.from("turni").select("*")
        .gte("data", isoData(inizio)).lte("data", isoData(fine))
        .order("data");
      return data ?? [];
    },
  });

  const { data: timbOggi } = useQuery({
    enabled: !!user,
    queryKey: ["timb-oggi", oggi],
    queryFn: async () => {
      const { data } = await supabase.from("timbrature").select("*")
        .eq("data", oggi).maybeSingle();
      return data;
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  const clockIn = async () => {
    if (timbOggi) {
      toast.error("Hai già iniziato il turno oggi");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("timbrature").insert({
      dipendente_id: user.id,
      data: oggi,
      orario_clock_in: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error("Errore", { description: error.message });
      return;
    }
    toast.success("Turno iniziato");
    qc.invalidateQueries({ queryKey: ["timb-oggi"] });
  };

  const clockOut = async () => {
    if (!timbOggi) {
      toast.error("Non hai ancora iniziato il turno oggi");
      return;
    }
    if (timbOggi.orario_clock_out) {
      toast.error("Hai già terminato il turno oggi");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("timbrature")
      .update({ orario_clock_out: new Date().toISOString() })
      .eq("id", timbOggi.id);
    setBusy(false);
    if (error) {
      toast.error("Errore", { description: error.message });
      return;
    }
    toast.success("Turno terminato");
    qc.invalidateQueries({ queryKey: ["timb-oggi"] });
  };

  const oreOggi = timbOggi ? oreTimbratura(timbOggi.orario_clock_in, timbOggi.orario_clock_out) : null;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold leading-tight">{profile?.nome} {profile?.cognome}</div>
              <div className="text-xs text-muted-foreground">{profile?.reparto}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Oggi · {fmtData(new Date(), "EEEE d MMMM")}</div>
          {timbOggi ? (
            <div className="mt-3 space-y-1 text-sm">
              <div>Inizio: <span className="font-medium">{new Date(timbOggi.orario_clock_in).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span></div>
              {timbOggi.orario_clock_out && (
                <div>Fine: <span className="font-medium">{new Date(timbOggi.orario_clock_out).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span></div>
              )}
              {oreOggi !== null && <div>Ore lavorate: <span className="font-bold">{fmtOre(oreOggi)}</span></div>}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Non hai ancora iniziato il turno.</div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <Button
            size="lg"
            className="h-20 text-lg bg-turno-mattina text-turno-mattina-foreground hover:bg-turno-mattina/90"
            onClick={clockIn}
            disabled={busy || !!timbOggi}
          >
            <Play className="h-6 w-6 mr-2" /> Inizio turno
          </Button>
          <Button
            size="lg"
            className="h-20 text-lg bg-turno-sera text-turno-sera-foreground hover:bg-turno-sera/90"
            onClick={clockOut}
            disabled={busy || !timbOggi || !!timbOggi?.orario_clock_out}
          >
            <Square className="h-6 w-6 mr-2" /> Fine turno
          </Button>
        </div>

        <div>
          <h2 className="font-semibold mb-3">I miei turni di questa settimana</h2>
          <div className="space-y-2">
            {giorni.map((g, i) => {
              const t = turni.find((x) => x.data === isoData(g));
              const oggiClass = isoData(g) === oggi ? "ring-2 ring-primary" : "";
              return (
                <Card key={i} className={`p-3 ${oggiClass}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-muted-foreground">{GIORNI[i]} · {fmtData(g, "dd/MM")}</div>
                      {t ? (
                        <>
                          <div className="font-medium capitalize mt-1">{t.tipo_turno}</div>
                          <div className="text-sm">{t.ora_inizio.slice(0, 5)} – {t.ora_fine.slice(0, 5)}</div>
                          {t.location && <div className="text-xs text-muted-foreground mt-0.5">{t.location}</div>}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground mt-1">Libero</div>
                      )}
                    </div>
                    {t && (
                      <div className={`w-3 h-12 rounded-full ${
                        t.tipo_turno === "mattina" ? "bg-turno-mattina"
                        : t.tipo_turno === "pomeriggio" ? "bg-turno-pomeriggio"
                        : "bg-turno-sera"
                      }`} />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
