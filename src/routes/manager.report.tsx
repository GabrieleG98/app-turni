import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  fmtOre, fmtSettimana, inizioSettimana, isoData, oreTimbratura, oreTraOrari,
} from "@/lib/date-utils";
import { addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/report")({
  component: Report,
});

function Report() {
  const [inizio, setInizio] = useState(inizioSettimana());
  const fine = addDays(inizio, 6);

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("cognome")).data ?? [],
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-rep", isoData(inizio)],
    queryFn: async () => (await supabase.from("turni").select("*")
      .gte("data", isoData(inizio)).lte("data", isoData(fine))).data ?? [],
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timb-rep", isoData(inizio)],
    queryFn: async () => (await supabase.from("timbrature").select("*")
      .gte("data", isoData(inizio)).lte("data", isoData(fine))).data ?? [],
  });

  const { data: pause = [] } = useQuery({
    queryKey: ["pause-rep", isoData(inizio)],
    queryFn: async () => (await supabase.from("pause").select("*")
      .gte("inizio", new Date(isoData(inizio)).toISOString())
      .lte("inizio", new Date(isoData(fine) + "T23:59:59").toISOString())).data ?? [],
  });

  const righe = useMemo(() => profili.map((p) => {
    const oreP = turni.filter((t) => t.dipendente_id === p.id)
      .reduce((s, t) => s + oreTraOrari(t.ora_inizio, t.ora_fine, t.data), 0);
    const minPause = pause.filter((x) => x.dipendente_id === p.id && x.fine)
      .reduce((s, x) => s + (new Date(x.fine!).getTime() - new Date(x.inizio).getTime()) / 60000, 0);
    const oreLordo = timbrature.filter((t) => t.dipendente_id === p.id)
      .reduce((s, t) => s + (oreTimbratura(t.orario_clock_in, t.orario_clock_out) ?? 0), 0);
    const oreE = Math.max(0, oreLordo - minPause / 60);
    const straord = Math.max(0, oreE - oreP);
    return { p, oreP, oreE, oreLordo, minPause, straord, diff: oreE - oreP };
  }), [profili, turni, timbrature, pause]);

  const esportaCSV = () => {
    const header = ["Cognome","Nome","Reparto","Ore pianificate","Ore lordo","Pause (min)","Ore nette","Straordinario","Differenza"];
    const rows = righe.map(({ p, oreP, oreLordo, minPause, oreE, straord, diff }) =>
      [p.cognome, p.nome, p.reparto, oreP.toFixed(2), oreLordo.toFixed(2), Math.round(minPause), oreE.toFixed(2), straord.toFixed(2), diff.toFixed(2)].join(",")
    );
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-ore-${isoData(inizio)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report esportato");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Report ore</h1>
        <p className="text-sm text-muted-foreground">Riepilogo settimanale</p>
      </div>
      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[220px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button className="ml-auto" onClick={esportaCSV}>
          <Download className="h-4 w-4 mr-2" /> Esporta CSV
        </Button>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dipendente</TableHead>
              <TableHead>Reparto</TableHead>
              <TableHead className="text-right">Ore pianificate</TableHead>
              <TableHead className="text-right">Ore lavorate</TableHead>
              <TableHead className="text-right">Differenza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map(({ p, oreP, oreE, diff }) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome} {p.cognome}</TableCell>
                <TableCell>{p.reparto || "—"}</TableCell>
                <TableCell className="text-right">{fmtOre(oreP)}</TableCell>
                <TableCell className="text-right">{fmtOre(oreE)}</TableCell>
                <TableCell className={`text-right font-medium ${
                  Math.abs(diff) < 0.05 ? "" : diff > 0 ? "text-foreground" : "text-destructive"
                }`}>
                  {diff > 0 ? "+" : ""}{fmtOre(diff)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
