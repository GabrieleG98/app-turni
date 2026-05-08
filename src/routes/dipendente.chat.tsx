import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat-view";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dipendente/chat")({
  component: Chat,
});

function Chat() {
  const { role } = useAuth();
  const isManager = role === "manager";
  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">Chat</h1>
          <p className="text-sm opacity-90 mt-1">Comunica col team</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-3 -mt-4 pb-4">
        <ChatView isManager={isManager} />
      </main>
    </>
  );
}
