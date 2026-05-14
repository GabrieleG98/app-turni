import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  fmtOre, fmtSettimana, inizioSettimana, isoData, oreTimbratura, oreTraOrari,
} from "@/lib/date-utils";
import { addDays, addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/dipendente/report")({
  component: DipendenteReport,
});

function DipendenteReport() {
  const { user } = useAuth();
  const [inizio, setInizio] = useState(inizioSettimana());
  const fine = addDays(inizio, 6);

  const { data: turni = [], isLoading: loadingTurni } = useQuery({
    queryKey: ["turni-dip-rep", user?.id, isoData(inizio), isoData(fine)],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("turni").select("*")
        .eq("dipendente_id", user!.id)
        .gte("data", isoData(inizio))
        .lte("data", isoData(fine))).data ?? [],
  });

  const { data: timbrature = [], isLoading: loadingTimb } = useQuery({
    queryKey: ["timb-dip-rep", user?.id, isoData(inizio), isoData(fine)],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("timbrature").select("*")
        .eq("dipendente_id", user!.id)
        .gte("data", isoData(inizio))
        .lte("data", isoData(fine))).data ?? [],
  });

  const { data: pause = [], isLoading: loadingPause } = useQuery({
    queryKey: ["pause-dip-rep", user?.id, isoData(inizio), isoData(fine)],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("pause").select("*")
        .eq("dipendente_id", user!.id)
        .gte("inizio", new Date(isoData(inizio)).toISOString())
        .lte("inizio", new Date(isoData(fine) + "T23:59:59").toISOString())).data ?? [],
  });

  const isLoading = loadingTurni || loadingTimb || loadingPause;

  // Calcola per giorno
  const giorni = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const data = addDays(inizio, i);
      const dataStr = isoData(data);

      const oreP = turni
        .filter((t) => t.data === dataStr)
        .reduce((s, t) => s + oreTraOrari(t.ora_inizio, t.ora_fine, t.data), 0);

      const timb = timbrature.filter((t) => t.data === dataStr);
      const oreLordo = timb.reduce(
        (s, t) => s + (oreTimbratura(t.orario_clock_in, t.orario_clock_out) ?? 0),
        0,
      );

      const minPause = pause
        .filter((p) => p.inizio.startsWith(dataStr))
        .filter((p) => p.fine)
        .reduce(
          (s, p) =>
            s + (new Date(p.fine!).getTime() - new Date(p.inizio).getTime()) / 60000,
          0,
        );

      const oreE = Math.max(0, oreLordo - minPause / 60);
      const straord = Math.max(0, oreE - oreP);
      const diff = oreE - oreP;

      return { data, dataStr, oreP, oreLordo, minPause, oreE, straord, diff, timb };
    });
  }, [inizio, turni, timbrature, pause]);

  const totOreP = giorni.reduce((s, g) => s + g.oreP, 0);
  const totOreE = giorni.reduce((s, g) => s + g.oreE, 0);
  const totStraord = giorni.reduce((s, g) => s + g.straord, 0);
  const totDiff = giorni.reduce((s, g) => s + g.diff, 0);
  const totPause = giorni.reduce((s, g) => s + g.minPause, 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold">Report ore</h1>
        <p className="text-sm text-muted-foreground">Le tue ore pianificate, lavorate e straordinari</p>
      </div>

      {/* Navigazione settimana */}
      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[200px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>
          Questa settimana
        </Button>
      </Card>

      {/* Riepilogo settimanale */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pianificate", val: fmtOre(totOreP) },
          { label: "Lavorate", val: fmtOre(totOreE) },
          { label: "Pause totali", val: `${Math.round(totPause)} min` },
          { label: "Straordinari", val: fmtOre(totStraord) },
        ].map(({ label, val }) => (
          <Card key={label} className="p-3">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-lg font-semibold">{val}</div>
          </Card>
        ))}
      </div>

      {/* Badge differenza */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Differenza settimana:</span>
        {Math.abs(totDiff) < 0.05 ? (
          <Badge variant="secondary">in pari</Badge>
        ) : totDiff > 0 ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">+{fmtOre(totDiff)}</Badge>
        ) : (
          <Badge variant="destructive">{fmtOre(totDiff)}</Badge>
        )}
      </div>

      {/* Tabella giornaliera */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Giorno</TableHead>
              <TableHead className="text-right">Pianificate</TableHead>
              <TableHead className="text-right">Lavorate</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Pause</TableHead>
              <TableHead className="text-right">Diff.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : giorni.map(({ data, oreP, oreE, minPause, diff, timb }) => {
                  const oggi = isoData(new Date()) === isoData(data);
                  const hasTurno = oreP > 0;
                  const hasTimbr = timb.length > 0;
                  return (
                    <TableRow
                      key={isoData(data)}
                      className={oggi ? "bg-primary/5" : ""}
                    >
                      <TableCell className="font-medium">
                        <span className={oggi ? "text-primary font-semibold" : ""}>
                          {format(data, "EEE dd/MM")}
                        </span>
                        {oggi && (
                          <span className="ml-1.5 text-[10px] uppercase font-bold text-primary">oggi</span>
                        )}
                        {!hasTurno && !hasTimbr && (
                          <span className="ml-1.5 text-xs text-muted-foreground">riposo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasTurno ? fmtOre(oreP) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasTimbr ? fmtOre(oreE) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {minPause > 0 ? `${Math.round(minPause)} min` : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        !hasTurno && !hasTimbr
                          ? "text-muted-foreground"
                          : Math.abs(diff) < 0.05
                          ? ""
                          : diff > 0
                          ? "text-foreground"
                          : "text-destructive"
                      }`}>
                        {!hasTurno && !hasTimbr
                          ? "—"
                          : diff > 0
                          ? `+${fmtOre(diff)}`
                          : fmtOre(diff)}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
          {!isLoading && (
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold text-sm">
                <td className="p-3">Totale settimana</td>
                <td className="p-3 text-right">{fmtOre(totOreP)}</td>
                <td className="p-3 text-right">{fmtOre(totOreE)}</td>
                <td className="p-3 text-right hidden sm:table-cell">{Math.round(totPause)} min</td>
                <td className={`p-3 text-right ${
                  Math.abs(totDiff) < 0.05 ? "" : totDiff > 0 ? "" : "text-destructive"
                }`}>
                  {totDiff > 0 ? "+" : ""}{fmtOre(totDiff)}
                </td>
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>
    </div>
  );
}
