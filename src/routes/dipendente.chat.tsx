import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/dipendente/chat")({
  component: Chat,
});

function Chat() {
  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">Chat</h1>
          <p className="text-sm opacity-90 mt-1">Comunica col team</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-4">
        <Card className="p-8 text-center border-0 shadow-sm">
          <MessageCircle className="h-10 w-10 text-brand mx-auto mb-3" />
          <div className="font-semibold">Chat di team in arrivo</div>
          <p className="text-sm text-muted-foreground mt-1">
            Presto potrai chattare con il tuo team e ricevere annunci dal manager.
          </p>
        </Card>
      </main>
    </>
  );
}
