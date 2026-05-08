import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/dipendente/tasks")({
  component: Tasks,
});

function Tasks() {
  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm opacity-90 mt-1">Le tue checklist del turno</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-4">
        <Card className="p-8 text-center border-0 shadow-sm">
          <ListChecks className="h-10 w-10 text-brand mx-auto mb-3" />
          <div className="font-semibold">Checklist in arrivo</div>
          <p className="text-sm text-muted-foreground mt-1">
            Qui troverai le attività assegnate dal manager per ogni turno.
          </p>
        </Card>
      </main>
    </>
  );
}
