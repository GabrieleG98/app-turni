import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { fmtData, isoData } from "@/lib/date-utils";
import { ListChecks, CheckCircle2, Camera, ChevronRight } from "lucide-react";
import { TaskDettaglioDialog } from "@/components/task-dettaglio-dialog";

export const Route = createFileRoute("/dipendente/tasks")({
  component: Tasks,
});

function Tasks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const oggi = isoData(new Date());
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [rpcDone, setRpcDone] = useState(false);
  // FIX #5: traccia l'ultimo giorno per cui la RPC è stata chiamata.
  // Se il componente resta montato a mezzanotte e oggi cambia,
  // la RPC viene rieseguita per il nuovo giorno.
  const rpcCalledForDay = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Se la RPC è già stata chiamata per questo stesso giorno, skip
    if (rpcCalledForDay.current === oggi) return;
    rpcCalledForDay.current = oggi;
    setRpcDone(false);
    supabase.rpc("ensure_my_tasks", { _data: oggi }).then(() => {
      qc.invalidateQueries({ queryKey: ["miei-task", oggi] });
      setRpcDone(true);
    });
  }, [user, oggi, qc]);

  const { data: tasks = [], isLoading } = useQuery({
    enabled: !!user && rpcDone,
    queryKey: ["miei-task", oggi],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_assegnati")
        .select("*, template:task_template(richiede_foto)")
        .eq("data", oggi)
        .order("titolo", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const fatti = tasks.filter((t: any) => t.completato_at).length;
  const tot = tasks.length;
  const tutto = tot > 0 && fatti === tot;
  const openTask = tasks.find((t: any) => t.id === openTaskId) ?? null;
  const richiedeFoto = (openTask?.template as any)?.richiede_foto ?? false;

  const showLoading = !rpcDone || isLoading;

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm opacity-90 mt-1 capitalize">
            {fmtData(new Date(), "EEEE d MMMM")} · {fatti}/{tot} completati
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-4 space-y-3 pb-8">
        {tot > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-brand-gradient transition-all" style={{ width: `${(fatti / tot) * 100}%` }} />
          </div>
        )}

        {showLoading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-0">Caricamento…</Card>
        ) : tot === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <ListChecks className="h-10 w-10 text-brand mx-auto mb-3" />
            <div className="font-semibold">Nessuna task per oggi</div>
            <p className="text-sm text-muted-foreground mt-1">
              Non hai task assegnate per oggi. Goditi il turno!
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t: any) => {
              const done = !!t.completato_at;
              const needsPhoto = (t.template as any)?.richiede_foto;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpenTaskId(t.id)}
                    className="w-full text-left"
                  >
                    <Card className={`p-3 flex items-center gap-3 border-0 shadow-sm transition hover:bg-accent/40 ${done ? "opacity-60" : ""}`}>
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500/20 text-green-600" : "bg-brand-soft text-brand"}`}>
                        {done ? <CheckCircle2 className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${done ? "line-through" : ""}`}>{t.titolo}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {needsPhoto && (
                            <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" /> Foto richiesta</span>
                          )}
                          {t.descrizione && !needsPhoto && <span className="truncate">{t.descrizione}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Card>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {tutto && (
          <Card className="p-4 text-center border-dashed bg-brand-soft/40">
            <CheckCircle2 className="h-8 w-8 text-brand mx-auto mb-1" />
            <div className="font-semibold text-sm">Tutto fatto! Sei un mito 💪</div>
          </Card>
        )}
      </main>

      <TaskDettaglioDialog
        task={openTask}
        richiedeFoto={richiedeFoto}
        onClose={() => setOpenTaskId(null)}
        invalidateKey={["miei-task", oggi]}
      />
    </>
  );
}
