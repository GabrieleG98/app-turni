import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtData, giorniSettimana, inizioSettimana, isoData, GIORNI } from "@/lib/date-utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addWeeks } from "date-fns";

export const Route = createFileRoute("/dipendente/turni")({
  component: MieiTurni,
});

function MieiTurni() {
  const { user } = useAuth();
  const [inizio, setInizio] = useState(inizioSettimana());
  const giorni = giorniSettimana(inizio);
  const oggi = isoData(new Date());

  const { data: turni = [] } = useQuery({
    enabled: !!user,
    queryKey: ["miei-turni", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(giorni[6]))
        .order("data");
      return data ?? [];
    },
  });

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">I miei turni</h1>
          <p className="text-sm opacity-90 mt-1">Settimana corrente</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-4 space-y-3">
        <Card className="p-2 flex items-center justify-between gap-2 border-0 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {fmtData(inizio, "d MMM")} – {fmtData(giorni[6], "d MMM")}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>

        {giorni.map((g, i) => {
          const t = turni.find((x) => x.data === isoData(g));
          const isOggi = isoData(g) === oggi;
          return (
            <Card
              key={i}
              className={`p-4 border-0 shadow-sm flex items-center gap-4 ${isOggi ? "ring-2 ring-brand" : ""}`}
            >
              <div className="flex flex-col items-center justify-center w-12 shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {GIORNI[i].slice(0, 3)}
                </div>
                <div className="font-display text-2xl font-bold leading-none mt-0.5">
                  {fmtData(g, "d")}
                </div>
              </div>
              <div className="flex-1">
                {t ? (
                  <>
                    <div className="font-semibold capitalize">{t.tipo_turno}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.ora_inizio.slice(0, 5)} – {t.ora_fine.slice(0, 5)}
                      {t.location && ` · ${t.location}`}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Giorno libero</div>
                )}
              </div>
              {t && (
                <div
                  className={`w-1.5 h-12 rounded-full ${
                    t.tipo_turno === "mattina"
                      ? "bg-turno-mattina"
                      : t.tipo_turno === "pomeriggio"
                      ? "bg-turno-pomeriggio"
                      : "bg-turno-sera"
                  }`}
                />
              )}
            </Card>
          );
        })}
      </main>
    </>
  );
}
