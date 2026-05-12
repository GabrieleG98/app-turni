import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const INVITE_CODE = import.meta.env.VITE_INVITE_CODE ?? "4FUN2025";

export function SignupForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    nome: "",
    cognome: "",
    codice: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.codice.trim() !== INVITE_CODE) {
      toast.error("Codice invito non valido", {
        description: "Contatta il tuo manager per ottenere il codice di accesso.",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nome: form.nome,
          cognome: form.cognome,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Registrazione non riuscita", { description: error.message });
      return;
    }
    toast.success("Account creato", {
      description: "Controlla la tua email per confermare. Il manager assegnerà il tuo ruolo.",
    });
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30 py-8">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Unisciti al team 4FUN</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea il tuo account per accedere ai turni del Villaggio Timi Ama.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} onChange={set("nome")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome</Label>
              <Input id="cognome" value={form.cognome} onChange={set("cognome")} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codice">Codice invito</Label>
            <Input
              id="codice"
              value={form.codice}
              onChange={set("codice")}
              placeholder="Chiedi il codice al tuo manager"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrati
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Accedi
          </Link>
        </p>
      </Card>
    </div>
  );
}
