import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat-view";

export const Route = createFileRoute("/manager/chat")({
  component: ManagerChat,
});

function ManagerChat() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Chat di team</h1>
        <p className="text-sm text-muted-foreground">Comunica con i dipendenti e pubblica annunci.</p>
      </div>
      <ChatView isManager />
    </div>
  );
}
