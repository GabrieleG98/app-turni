import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Users, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  oreTraOrari,
} from "@/lib/date-utils";

export const Route = createFileRoute("/manager/dashboard")({
  component: Dashboard,
});

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color ?? "bg-muted"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function Dashboard() {
  const [inizio, setInizio] = useState(inizioSettimana());
  const [reparto, setReparto] = useState("tutti");
  const fine = addDays(inizio, 6);
  const oggi = isoData(new Date());

  const { data: profili = [], isLoading: loadingProfili } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [], isLoading: loadingTurni } = useQuery({
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
      return { p, oreP };
    });
  }, [profili, turni, reparto]);

  const dipendentiConTurnoOggi = turniOggi.length;
  const isLoading = loadingProfili || loadingTurni;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Panoramica turni pianificati</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          icon={Users}
          label="Dipendenti con turno oggi"
          value={dipendentiConTurnoOggi}
          color="bg-primary/10 text-primary"
        />
        <KpiCard
          icon={Users}
          label="Totale dipendenti"
          value={profili.length}
          color="bg-muted text-muted-foreground"
        />
      </div>

      {/* Navigazione settimana */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-sm">{fmtSettimana(inizio)}</span>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>Oggi</Button>

        <span className="text-sm text-muted-foreground ml-2">Reparto:</span>
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

      {/* Tabella dipendenti */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dipendente</TableHead>
            <TableHead>Reparto</TableHead>
            <TableHead>Ore pianificate</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))
          ) : righe.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">Nessun dipendente</TableCell>
            </TableRow>
          ) : (
            righe.map(({ p, oreP }) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link to="/manager/dipendenti/$id" params={{ id: p.id }} className="font-medium hover:underline">
                    {p.nome} {p.cognome}
                  </Link>
                  <p className="text-xs text-muted-foreground md:hidden">{p.reparto || "—"} · pian. {fmtOre(oreP)}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{p.reparto || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{fmtOre(oreP)}</TableCell>
                <TableCell>
                  <Link to="/manager/dipendenti/$id" params={{ id: p.id }}>
                    <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
