import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfiloEditor } from "@/components/profilo-editor";
import { LogOut, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/dipendente/profilo")({
  component: Profilo,
});

function Profilo() {
  const { profile, signOut } = useAuth();
  const iniziali = `${profile?.nome?.[0] ?? ""}${profile?.cognome?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-10 pb-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold border-2 border-white/40">
            {iniziali || <UserIcon className="h-8 w-8" />}
          </div>
          <h1 className="text-xl font-bold mt-3">
            {profile?.nome} {profile?.cognome}
          </h1>
          <p className="text-sm opacity-90">{profile?.ruolo_lavoro}</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-6 space-y-3 pb-6">
        <ProfiloEditor />
        <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Esci
        </Button>
      </main>
    </>
  );
}
