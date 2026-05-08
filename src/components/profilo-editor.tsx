import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio").max(80),
  cognome: z.string().trim().min(1, "Cognome obbligatorio").max(80),
  ruolo_lavoro: z.string().trim().max(80),
  reparto: z.string().trim().max(80),
  email: z.string().trim().email("Email non valida").max(255),
});

export function ProfiloEditor() {
  const { user, profile, refresh } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cognome, setCognome] = useState(profile?.cognome ?? "");
  const [ruoloLavoro, setRuoloLavoro] = useState(profile?.ruolo_lavoro ?? "");
  const [reparto, setReparto] = useState(profile?.reparto ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);

  const salva = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ nome, cognome, ruolo_lavoro: ruoloLavoro, reparto, email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setBusy(true);

    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        nome: parsed.data.nome,
        cognome: parsed.data.cognome,
        ruolo_lavoro: parsed.data.ruolo_lavoro,
        reparto: parsed.data.reparto,
        email: parsed.data.email,
      })
      .eq("id", user.id);

    if (pErr) {
      setBusy(false);
      toast.error("Errore salvataggio profilo", { description: pErr.message });
      return;
    }

    let emailMsg: string | null = null;
    if (parsed.data.email !== user.email) {
      const { error: aErr } = await supabase.auth.updateUser({ email: parsed.data.email });
      if (aErr) {
        setBusy(false);
        toast.error("Errore aggiornamento email", { description: aErr.message });
        return;
      }
      emailMsg = "Controlla la tua nuova email per confermare il cambio.";
    }

    await refresh();
    setBusy(false);
    toast.success("Profilo aggiornato", emailMsg ? { description: emailMsg } : undefined);
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cognome">Cognome</Label>
          <Input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ruolo_lavoro">Ruolo lavoro</Label>
          <Input id="ruolo_lavoro" value={ruoloLavoro} onChange={(e) => setRuoloLavoro(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reparto">Reparto</Label>
          <Input id="reparto" value={reparto} onChange={(e) => setReparto(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          <p className="text-xs text-muted-foreground">
            Cambiando l'email riceverai un link di conferma sul nuovo indirizzo.
          </p>
        </div>
      </div>
      <Button onClick={salva} disabled={busy} className="w-full sm:w-auto">
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salva modifiche
      </Button>
    </Card>
  );
}
