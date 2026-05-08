import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtData, isoData } from "@/lib/date-utils";
import { ListChecks, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dipendente/tasks")({
  component: Tasks,
});

function Tasks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const oggi = isoData(new Date());

  // Genera task di oggi (idempotente)
  useEffect(() => {
    if (!user) return;
    supabase.rpc("ensure_my_tasks", { _data: oggi }).then(() => {
      qc.invalidateQueries({ queryKey: ["miei-task", oggi] });
    });
  }, [user, oggi, qc]);

  const { data: tasks = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["miei-task", oggi],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_assegnati")
        .select("*")
        .eq("data", oggi)
        .order("titolo", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = async (id: string, completato: boolean) => {
    const { error } = await supabase
      .from("task_assegnati")
      .update({ completato_at: completato ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error("Errore", { description: error.message });
    qc.invalidateQueries({ queryKey: ["miei-task", oggi] });
  };

  const fatti = tasks.filter((t) => t.completato_at).length;
  const tot = tasks.length;
  const tutto = tot > 0 && fatti === tot;

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm opacity-90 mt-1 capitalize">
            {fmtData(new Date(), "EEEE d MMMM")} · {fatti}/{tot} completati
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-4 space-y-3 pb-8">
        {tot > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gradient transition-all"
              style={{ width: `${(fatti / tot) * 100}%` }}
            />
          </div>
        )}

        {isLoading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-0">Caricamento…</Card>
        ) : tot === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm">
            <ListChecks className="h-10 w-10 text-brand mx-auto mb-3" />
            <div className="font-semibold">Nessuna attività oggi</div>
            <p className="text-sm text-muted-foreground mt-1">
              Goditi il turno! Le checklist verranno create quando il manager le configura.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const done = !!t.completato_at;
              return (
                <li key={t.id}>
                  <Card
                    className={`p-3 flex items-start gap-3 border-0 shadow-sm transition ${
                      done ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={done}
                      onCheckedChange={(v) => toggle(t.id, !!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${done ? "line-through" : ""}`}>{t.titolo}</div>
                      {t.descrizione && (
                        <div className="text-xs text-muted-foreground mt-0.5">{t.descrizione}</div>
                      )}
                    </div>
                  </Card>
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
    </>
  );
}
