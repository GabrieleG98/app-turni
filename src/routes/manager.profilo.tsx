import { createFileRoute } from "@tanstack/react-router";
import { ProfiloEditor } from "@/components/profilo-editor";

export const Route = createFileRoute("/manager/profilo")({
  component: ManagerProfilo,
});

function ManagerProfilo() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Il mio profilo</h1>
        <p className="text-sm text-muted-foreground">Modifica i tuoi dati personali</p>
      </div>
      <ProfiloEditor />
    </div>
  );
}
