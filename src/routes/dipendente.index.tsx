import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtData } from "@/lib/date-utils";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { TurnoDialog } from "@/components/turno-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isoData } from "@/lib/date-utils";

export const Route = createFileRoute("/dipendente/")({
  component: HomeOggi,
});

function HomeOggi() {
  const { user, profile, loading } = useAuth();
  const [turnoDialogOpen, setTurnoDialogOpen] = useState(false);

  const oggi = isoData(new Date());

  const { data: turnoOggi } = useQuery({
    queryKey: ["turno-oggi", user?.id, oggi],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("dipendente_id", user!.id)
        .eq("data", oggi)
        .maybeSingle();
      return data ?? null;
    },
  });

  if (loading) {
    return (
      <>
        <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
          <div className="max-w-md mx-auto px-5 pt-12 pb-10">
            <Skeleton className="h-4 w-24 bg-white/20 mb-2" />
            <Skeleton className="h-8 w-40 bg-white/20" />
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 -mt-6 space-y-4 pb-32">
          <Skeleton className="h-28 w-full rounded-xl" />
        </main>
      </>
    );
  }

  const ora = new Date();
  const saluto = ora.getHours() < 12 ? "Buongiorno" : ora.getHours() < 18 ? "Buon pomeriggio" : "Buonasera";

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
              </div>
            </div>
          )}
        </Card>
      </main>

      <TurnoDialog
        turno={turnoOggi ?? null}
        open={turnoDialogOpen}
        onOpenChange={setTurnoDialogOpen}
      />
    </>
  );
}
