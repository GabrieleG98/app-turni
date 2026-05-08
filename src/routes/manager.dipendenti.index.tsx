import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/manager/dipendenti/")({
  component: ListaDipendenti,
});

function ListaDipendenti() {
  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dipendenti</h1>
        <p className="text-sm text-muted-foreground">{profili.length} membri del team</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Reparto</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profili.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nessun dipendente</TableCell></TableRow>
            ) : profili.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link to="/manager/dipendenti/$id" params={{ id: p.id }} className="hover:underline">
                    {p.nome} {p.cognome}
                  </Link>
                </TableCell>
                <TableCell>{p.ruolo_lavoro || "—"}</TableCell>
                <TableCell>{p.reparto || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
