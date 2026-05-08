import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";

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

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/registrati` : "/registrati";

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiato!", { description: "Condividilo col nuovo dipendente." });
    } catch {
      toast.error("Impossibile copiare il link");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">{profili.length} membri del team</p>
        </div>
      </div>

      <Card className="p-4 flex items-center gap-3 flex-wrap bg-brand-soft/40 border-0">
        <UserPlus className="h-5 w-5 text-brand shrink-0" />
        <div className="flex-1 min-w-[220px]">
          <div className="font-semibold text-sm">Invita un nuovo dipendente</div>
          <div className="text-xs text-muted-foreground truncate">{inviteUrl}</div>
        </div>
        <Button onClick={copia} size="sm">
          <Copy className="h-4 w-4 mr-1.5" /> Copia link
        </Button>
      </Card>

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
