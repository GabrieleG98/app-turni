import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "manager" | "dipendente";

export interface Profile {
  id: string;
  nome: string;
  cognome: string;
  ruolo_lavoro: string;
  reparto: string;
  email: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isOwner: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  // FIX #1: flag per evitare race condition — una sola chiamata loadUserData per volta
  const loadingRef = useRef(false);

  const loadUserData = async (uid: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [{ data: prof }, { data: roles }, { data: ownerRes }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.rpc("is_owner", { _uid: uid }),
      ]);
      setProfile((prof as Profile) ?? null);
      const r = roles?.[0]?.role as AppRole | undefined;
      setRole(r ?? null);
      setIsOwner(Boolean(ownerRes));
    } catch (err: any) {
      // FIX #8: gestione errori rete / offline al caricamento profilo
      console.error("loadUserData error:", err);
      toast.error("Errore di connessione", { description: "Impossibile caricare il profilo utente. Riprova." });
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // FIX #1: il setTimeout evita la chiamata doppia con getSession di seguito
        setTimeout(() => loadUserData(s.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
        setIsOwner(false);
        // reset flag quando l'utente si disconnette
        loadingRef.current = false;
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadUserData(data.session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    if (user) {
      // FIX #1: reset del flag prima del refresh manuale
      loadingRef.current = false;
      await loadUserData(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, profile, role, isOwner, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return c;
}
