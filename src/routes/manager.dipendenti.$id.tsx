import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fmtData,
  fmtOre,
  fmtSettimana,
  giorniSettimana,
  inizioSettimana,
  isoData,
  oreTimbratura,
  oreTraOrari,
  GIORNI,
} from "@/lib/date-utils";
import { addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/manager/dipendenti/$id")({
  component: DettaglioDipendente,
});

function DettaglioDipendente() {
  const { id } = Route.useParams();
  const [inizio, setInizio] = useState(inizioSettimana());
  const fine = addDays(inizio, 6);

  const { data: profilo } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-dip", id, isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni").select("*")
        .eq("dipendente_id", id)
        .gte("data", isoData(inizio)).lte("data", isoData(fine))
        .order("data");
      return data ?? [];
    },
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timb-dip", id, isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature").select("*")
        .eq("dipendente_id", id)
        .gte("data", isoData(inizio)).lte("data", isoData(fine));
      return data ?? [];
    },
  });

  const oreEffettive = timbrature.reduce(
    (s, t) => s + (oreTimbratura(t.orario_clock_in, t.orario_clock_out) ?? 0),
    0,
  );

  const giorni = giorniSettimana(inizio);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/manager/dipendenti" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla lista
      </Link>

      {profilo && (
        <Card className="p-6">
          <h1 className="text-2xl font-bold">{profilo.nome} {profilo.cognome}</h1>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>Ruolo: <span className="text-foreground">{profilo.ruolo_lavoro || "—"}</span></span>
            <span>Reparto: <span className="text-foreground">{profilo.reparto || "—"}</span></span>
          </div>
        </Card>
      )}

      <Card className="p-4 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[220px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-sm">
          Ore lavorate: <span className="font-bold">{fmtOre(oreEffettive)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {giorni.map((g, i) => {
          const t = turni.find((x) => x.data === isoData(g));
          return (
            <Card key={i} className="p-3">
              <div className="text-xs text-muted-foreground">{GIORNI[i]}</div>
              <div className="text-sm font-medium mb-2">{fmtData(g, "dd/MM")}</div>
              {t ? (
                <div className={`rounded-md p-2 text-xs ${
                  t.tipo_turno === "mattina" ? "bg-turno-mattina text-turno-mattina-foreground"
                  : t.tipo_turno === "pomeriggio" ? "bg-turno-pomeriggio text-turno-pomeriggio-foreground"
                  : "bg-turno-sera text-turno-sera-foreground"
                }`}>
                  <div className="font-semibold capitalize">{t.tipo_turno}</div>
                  <div>{t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)}</div>
                  {t.location && <div className="opacity-80">{t.location}</div>}
                </div>
              ) : (
                <div className="rounded-md p-2 text-xs bg-turno-libero text-turno-libero-foreground text-center">
                  Libero
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Timbrature</h2>
        {timbrature.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna timbratura</p>
        ) : (
          <div className="space-y-2 text-sm">
            {timbrature.map((t) => {
              const ore = oreTimbratura(t.orario_clock_in, t.orario_clock_out);
              return (
                <div key={t.id} className="flex justify-between border-b pb-2 last:border-0">
                  <span>{fmtData(t.data)}</span>
                  <span className="text-muted-foreground">
                    {new Date(t.orario_clock_in).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} →{" "}
                    {t.orario_clock_out
                      ? new Date(t.orario_clock_out).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
                      : <em>in corso</em>}
                  </span>
                  <span className="font-medium">{ore !== null ? fmtOre(ore) : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
