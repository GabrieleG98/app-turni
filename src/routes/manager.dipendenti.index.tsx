import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, UserPlus, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { eliminaDipendente } from "@/lib/elimina-dipendente.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/manager/dipendenti/")({
  component: ListaDipendenti,
});

function ListaDipendenti() {
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [target, setTarget] = useState<{ id: string; nome: string; promote: boolean } | null>(null);
  const [delTarget, setDelTarget] = useState<{ id: string; nome: string } | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const eliminaFn = useServerFn(eliminaDipendente);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  const { data: ruoli = [] } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const isManager = (uid: string) => ruoli.some((r) => r.user_id === uid && r.role === "manager");
  const ownerId = ruoli.find((r) => r.role === "manager")?.user_id ?? null;
  const iAmOwner = me !== null && me === ownerId;

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/unisciti-4fun` : "/unisciti-4fun";

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiato!", { description: "Condividilo col nuovo dipendente." });
    } catch {
      toast.error("Impossibile copiare il link");
    }
  };

  const conferma = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_user_role", {
      _user_id: target.id,
      _role: target.promote ? "manager" : "dipendente",
    });
    setBusy(false);
    if (error) {
      toast.error("Operazione fallita", { description: error.message });
    } else {
      toast.success(target.promote ? "Promosso a manager" : "Retrocesso a dipendente");
      qc.invalidateQueries({ queryKey: ["user_roles"] });
    }
    setTarget(null);
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
              <TableHead>Permesso</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Reparto</TableHead>
              <TableHead className="text-right">Azione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profili.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nessun dipendente</TableCell></TableRow>
            ) : profili.map((p) => {
              const manager = isManager(p.id);
              const self = me === p.id;
              const isOwner = ownerId === p.id;
              const ownerLocked = isOwner && !iAmOwner;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to="/manager/dipendenti/$id" params={{ id: p.id }} className="hover:underline">
                      {p.nome} {p.cognome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {manager ? (
                        <Badge variant="default">Manager</Badge>
                      ) : (
                        <Badge variant="secondary">Dipendente</Badge>
                      )}
                      {isOwner && (
                        <Badge variant="outline" className="border-brand text-brand">
                          Proprietario
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{p.ruolo_lavoro || "—"}</TableCell>
                  <TableCell>{p.reparto || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {manager ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={self || ownerLocked}
                          title={
                            ownerLocked
                              ? "Solo il proprietario può modificare il proprio ruolo"
                              : self
                              ? "Non puoi retrocedere te stesso"
                              : undefined
                          }
                          onClick={() => setTarget({ id: p.id, nome: `${p.nome} ${p.cognome}`, promote: false })}
                        >
                          <ShieldOff className="h-4 w-4 mr-1.5" /> Retrocedi
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setTarget({ id: p.id, nome: `${p.nome} ${p.cognome}`, promote: true })}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1.5" /> Promuovi a manager
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={self || isOwner}
                        title={
                          self
                            ? "Non puoi eliminare te stesso"
                            : isOwner
                            ? "Il proprietario non può essere eliminato"
                            : "Elimina dal team"
                        }
                        onClick={() => {
                          setDelConfirm("");
                          setDelTarget({ id: p.id, nome: `${p.nome} ${p.cognome}` });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.promote ? "Promuovi a manager?" : "Retrocedi a dipendente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.promote
                ? `${target?.nome} avrà accesso completo: gestione turni, timbrature, chat, task e report.`
                : `${target?.nome} perderà i permessi di manager e tornerà ad essere un dipendente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={conferma} disabled={busy}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
