import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Megaphone, Send, Lock } from "lucide-react";
import { toast } from "sonner";

type Canale = {
  id: string;
  nome: string;
  descrizione: string | null;
  tipo: "generale" | "annunci" | "reparto" | "privato";
  solo_manager_scrive: boolean;
};

type Messaggio = {
  id: string;
  canale_id: string;
  autore_id: string;
  contenuto: string;
  created_at: string;
};

export function ChatView({ isManager }: { isManager: boolean }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [canaleId, setCanaleId] = useState<string | null>(null);
  const [bozza, setBozza] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: canali = [] } = useQuery({
    enabled: !!user,
    queryKey: ["chat-canali"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_canali")
        .select("*")
        .order("tipo", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Canale[];
    },
  });

  useEffect(() => {
    if (!canaleId && canali.length > 0) setCanaleId(canali[0].id);
  }, [canali, canaleId]);

  const { data: messaggi = [] } = useQuery({
    enabled: !!canaleId,
    queryKey: ["chat-messaggi", canaleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messaggi")
        .select("*")
        .eq("canale_id", canaleId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Messaggio[];
    },
  });

  const { data: profili = [] } = useQuery({
    queryKey: ["chat-profili"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome");
      return data ?? [];
    },
  });

  const nomeAutore = (id: string) => {
    const p = profili.find((x: any) => x.id === id);
    return p ? `${p.nome} ${p.cognome}`.trim() : "Utente";
  };

  // Realtime — aggiorna la cache solo per messaggi di ALTRI utenti.
  // Il proprio messaggio è già inserito in modo ottimistico in invia().
  useEffect(() => {
    if (!canaleId) return;
    const ch = supabase
      .channel(`chat-${canaleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messaggi", filter: `canale_id=eq.${canaleId}` },
        (payload) => {
          const nuovo = payload.new as Messaggio;
          // Ignora i messaggi inviati da questo utente (già in cache in modo ottimistico)
          if (nuovo.autore_id === user?.id) return;
          qc.setQueryData<Messaggio[]>(["chat-messaggi", canaleId], (prev = []) => {
            // evita duplicati
            if (prev.some((m) => m.id === nuovo.id)) return prev;
            return [...prev, nuovo];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canaleId, qc, user?.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messaggi.length, canaleId]);

  const canaleSel = canali.find((c) => c.id === canaleId);
  const puoScrivere = canaleSel ? !canaleSel.solo_manager_scrive || isManager : false;

  const invia = async () => {
    const testo = bozza.trim();
    if (!testo || !canaleId || !user) return;

    // Optimistic update: aggiungi subito il messaggio in cache con un ID temporaneo
    const tempId = `temp-${Date.now()}`;
    const msgOttimistico: Messaggio = {
      id: tempId,
      canale_id: canaleId,
      autore_id: user.id,
      contenuto: testo,
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<Messaggio[]>(["chat-messaggi", canaleId], (prev = []) => [
      ...prev,
      msgOttimistico,
    ]);
    setBozza("");

    // Inserimento reale
    const { data: inserted, error } = await supabase
      .from("chat_messaggi")
      .insert({ canale_id: canaleId, autore_id: user.id, contenuto: testo })
      .select()
      .single();

    if (error) {
      // Rollback: rimuovi il messaggio ottimistico
      qc.setQueryData<Messaggio[]>(["chat-messaggi", canaleId], (prev = []) =>
        prev.filter((m) => m.id !== tempId)
      );
      setBozza(testo);
      return toast.error("Errore", { description: error.message });
    }

    // Sostituisci il temp con il messaggio reale (ID definitivo dal DB)
    qc.setQueryData<Messaggio[]>(["chat-messaggi", canaleId], (prev = []) =>
      prev.map((m) => (m.id === tempId ? (inserted as Messaggio) : m))
    );

    // Notifiche agli altri utenti del canale
    try {
      const canale = canali.find((c) => c.id === canaleId);
      if (!canale) return;
      const autore = profili.find((p: any) => p.id === user.id);
      const nomeAut = autore ? `${autore.nome} ${autore.cognome}`.trim() : "Un collega";
      const destinatari = (profili as any[]).filter((p) => p.id !== user.id);
      if (!destinatari.length) return;
      await supabase.from("notifiche").insert(
        destinatari.map((dest) => ({
          user_id: dest.id,
          titolo: "Nuovo messaggio in chat",
          descrizione: `Hai un nuovo messaggio da ${nomeAut} nel canale #${canale.nome}`,
          link: isManager ? "/manager/chat" : "/dipendente/chat",
        }))
      );
    } catch (e) {
      console.error("Errore notifiche:", e);
    }
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-3 h-[calc(100vh-12rem)] min-h-[480px]">
      {/* Sidebar canali */}
      <Card className="p-2 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-semibold">Canali</div>
        <ul className="space-y-1">
          {canali.map((c) => {
            const Icon = c.tipo === "annunci" ? Megaphone : c.tipo === "privato" ? Lock : Hash;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setCanaleId(c.id)}
                  className={`w-full text-left px-2 py-2 rounded-md flex items-center gap-2 text-sm hover:bg-accent transition ${
                    c.id === canaleId ? "bg-accent font-semibold" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 text-brand shrink-0" />
                  <span className="truncate">{c.nome}</span>
                </button>
              </li>
            );
          })}
          {canali.length === 0 && (
            <li className="text-xs text-muted-foreground px-2 py-2">Nessun canale</li>
          )}
        </ul>
      </Card>

      {/* Conversazione */}
      <Card className="flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="font-semibold flex items-center gap-2">
            {canaleSel?.tipo === "annunci" ? (
              <Megaphone className="h-4 w-4 text-brand" />
            ) : (
              <Hash className="h-4 w-4 text-brand" />
            )}
            {canaleSel?.nome ?? "Chat"}
          </div>
          {canaleSel?.descrizione && (
            <div className="text-xs text-muted-foreground mt-0.5">{canaleSel.descrizione}</div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {messaggi.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Nessun messaggio. Inizia tu la conversazione 👋
            </div>
          )}
          {messaggi.map((m) => {
            const mio = m.autore_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mio ? "bg-brand text-brand-foreground" : "bg-card"
                  }`}
                >
                  {!mio && (
                    <div className="text-[11px] font-semibold text-brand mb-0.5">
                      {nomeAutore(m.autore_id)}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.contenuto}</div>
                  <div className={`text-[10px] mt-1 ${mio ? "opacity-80" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-3 flex gap-2">
          {puoScrivere ? (
            <>
              <Input
                value={bozza}
                onChange={(e) => setBozza(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    invia();
                  }
                }}
                placeholder={`Messaggio in #${canaleSel?.nome ?? ""}…`}
                maxLength={4000}
              />
              <Button onClick={invia} disabled={!bozza.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center w-full py-2 flex items-center justify-center gap-2">
              <Lock className="h-3 w-3" /> Solo i manager possono scrivere in questo canale
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
