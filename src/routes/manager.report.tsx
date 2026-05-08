import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
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
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
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

  const esportaExcel = () => {
    const titolo = `Report ore · ${format(inizio, "dd/MM/yyyy")} – ${format(fine, "dd/MM/yyyy")}`;
    const header = [
      "Cognome", "Nome", "Reparto", "Ruolo",
      "Ore pianificate", "Ore lordo", "Pause (min)",
      "Ore nette", "Straordinario", "Differenza",
    ];
    const dataRows = righe.map(({ p, oreP, oreLordo, minPause, oreE, straord, diff }) => [
      p.cognome,
      p.nome,
      p.reparto || "",
      p.ruolo_lavoro || "",
      Number(oreP.toFixed(2)),
      Number(oreLordo.toFixed(2)),
      Math.round(minPause),
      Number(oreE.toFixed(2)),
      Number(straord.toFixed(2)),
      Number(diff.toFixed(2)),
    ]);

    const totali = [
      "TOTALI", "", "", "",
      Number(righe.reduce((s, r) => s + r.oreP, 0).toFixed(2)),
      Number(righe.reduce((s, r) => s + r.oreLordo, 0).toFixed(2)),
      Math.round(righe.reduce((s, r) => s + r.minPause, 0)),
      Number(righe.reduce((s, r) => s + r.oreE, 0).toFixed(2)),
      Number(righe.reduce((s, r) => s + r.straord, 0).toFixed(2)),
      Number(righe.reduce((s, r) => s + r.diff, 0).toFixed(2)),
    ];

    const aoa: (string | number)[][] = [
      [titolo],
      [],
      header,
      ...dataRows,
      [],
      totali,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Larghezza colonne
    ws["!cols"] = [
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 12 },
    ];

    // Merge titolo su tutte le colonne
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];

    // Bold header (riga 3, indice 2)
    const headerRowIdx = 2;
    for (let c = 0; c < header.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      const cell = ws[ref];
      if (cell) cell.s = { font: { bold: true }, alignment: { horizontal: "center" } };
    }
    // Bold titolo
    if (ws["A1"]) ws["A1"].s = { font: { bold: true, sz: 14 } };
    // Bold totali
    const totRow = aoa.length - 1;
    for (let c = 0; c < header.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: totRow, c });
      const cell = ws[ref];
      if (cell) cell.s = { font: { bold: true } };
    }

    // Format numerico
    for (let r = 3; r < 3 + dataRows.length; r++) {
      for (const c of [4, 5, 7, 8, 9]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) ws[ref].z = "0.00";
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report ore");
    XLSX.writeFile(wb, `report-ore-${isoData(inizio)}.xlsx`);
    toast.success("Report Excel esportato");
  };

  const { user } = useAuth();
  const mia = righe.find((r) => r.p.id === user?.id);

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
        <Button className="ml-auto" onClick={esportaExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Esporta Excel
        </Button>
      </Card>

      {mia && (
        <Card className="p-4 border-brand/40 bg-brand/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase font-semibold text-brand">Le mie ore</div>
              <div className="text-sm text-muted-foreground">{mia.p.nome} {mia.p.cognome} · settimana corrente</div>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div><span className="text-muted-foreground">Pianificate:</span> <span className="font-semibold">{fmtOre(mia.oreP)}</span></div>
              <div><span className="text-muted-foreground">Lavorate:</span> <span className="font-semibold">{fmtOre(mia.oreE)}</span></div>
              <div><span className="text-muted-foreground">Straord.:</span> <span className="font-semibold">{fmtOre(mia.straord)}</span></div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Differenza:</span>
                {Math.abs(mia.diff) < 0.05 ? (
                  <Badge variant="secondary">in pari</Badge>
                ) : mia.diff > 0 ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">+{fmtOre(mia.diff)}</Badge>
                ) : (
                  <Badge variant="destructive">{fmtOre(mia.diff)}</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dipendente</TableHead>
              <TableHead className="hidden sm:table-cell">Reparto</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Ore pianificate</TableHead>
              <TableHead className="text-right">Lavorate</TableHead>
              <TableHead className="text-right">Diff.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map(({ p, oreP, oreE, diff }) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.nome} {p.cognome}
                  <div className="text-xs text-muted-foreground sm:hidden">{p.reparto || "—"} · pian. {fmtOre(oreP)}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{p.reparto || "—"}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{fmtOre(oreP)}</TableCell>
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
