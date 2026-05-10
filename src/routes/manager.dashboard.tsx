import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addDays, addWeeks, differenceInMinutes, parseISO } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fmtOre,
  fmtSettimana,
  inizioSettimana,
  isoData,
  oreTimbratura,
  oreTraOrari,
} from "@/lib/date-utils";

export const Route = createFileRoute("/manager/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [inizio, setInizio] = useState<Date>(inizioSettimana());
  const [reparto, setReparto] = useState<string>("tutti");
  const fine = addDays(inizio, 6);
  const oggi = isoData(new Date());

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-settimana", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(fine));
      return data ?? [];
    },
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature-settimana", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(fine));
      return data ?? [];
    },
  });

  const { data: timbratureOggi = [] } = useQuery({
    queryKey: ["timbrature-oggi"],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .eq("data", oggi);
      return data ?? [];
    },
  });

  const { data: turniOggi = [] } = useQuery({
    queryKey: ["turni-oggi"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("data", oggi)
        .eq("pubblicato", true);
      return data ?? [];
    },
  });

  const reparti = useMemo(
    () => Array.from(new Set(profili.map((p) => p.reparto).filter(Boolean))).sort(),
    [profili],
  );

  const righe = useMemo(() => {
    const filtrati = reparto === "tutti" ? profili : profili.filter((p) => p.reparto === reparto);
    return filtrati.map((p) => {
      const tDip = turni.filter((t) => t.dipendente_id === p.id);
      const oreP = tDip.reduce((s, t) => s + oreTraOrari(t.ora_inizio, t.ora_fine, t.data), 0);
      const tbDip = timbrature.filter((t) => t.dipendente_id === p.id);
      const oreE = tbDip.reduce((s, t) => s + (oreTimbratura(t.orario_clock_in, t.orario_clock_out) ?? 0), 0);
      const turnoOggiDip = turniOggi.find((t) => t.dipendente_id === p.id);
      const timbOggiDip = timbratureOggi.find((t) => t.dipendente_id === p.id);
      let ritardoMin: number | null = null;
      if (turnoOggiDip && timbOggiDip) {
        const previsto = parseISO(`${oggi}T${turnoOggiDip.ora_inizio}`);
        const effettivo = new Date(timbOggiDip.orario_clock_in);
        const delta = differenceInMinutes(effettivo, previsto);
        if (delta > 0) ritardoMin = delta;
      }
      return { p, oreP, oreE, diff: oreE - oreP, ritardoMin };
    });
  }, [profili, turni, timbrature, turniOggi, timbratureOggi, reparto, oggi]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Panoramica ore pianificate vs lavorate</p>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[200px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>
          Oggi
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reparto:</span>
          <Select value={reparto} onValueChange={setReparto}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i reparti</SelectItem>
              {reparti.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dipendente</TableHead>
              <TableHead className="hidden sm:table-cell">Reparto</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Ore pianificate</TableHead>
              <TableHead className="text-right">Lavorate</TableHead>
              <TableHead className="text-right">Diff.</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Oggi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nessun dipendente
                </TableCell>
              </TableRow>
            ) : (
              righe.map(({ p, oreP, oreE, diff, ritardoMin }) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/manager/dipendenti/$id"
                      params={{ id: p.id }}
                      className="hover:underline"
                    >
                      {p.nome} {p.cognome}
                    </Link>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      {p.reparto || "—"} · pian. {fmtOre(oreP)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{p.reparto || "—"}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{fmtOre(oreP)}</TableCell>
                  <TableCell className="text-right">{fmtOre(oreE)}</TableCell>
                  <TableCell className="text-right">
                    {Math.abs(diff) < 0.05 ? (
                      <Badge variant="secondary">In linea</Badge>
                    ) : diff > 0 ? (
                      <Badge className="bg-turno-mattina text-turno-mattina-foreground">
                        +{fmtOre(diff)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{fmtOre(diff)}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {ritardoMin !== null ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        +{ritardoMin} min
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
