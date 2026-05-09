import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roles }, { data: ownerRes }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.rpc("is_owner", { _uid: uid }),
    ]);
    setProfile((prof as Profile) ?? null);
    const r = roles?.[0]?.role as AppRole | undefined;
    setRole(r ?? null);
    setIsOwner(Boolean(ownerRes));
  };

  const refresh = async () => {
    if (user) await loadUserData(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let initialLoad = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadUserData(s.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setIsOwner(false);
      }
      if (initialLoad) {
        initialLoad = false;
        setLoading(false);
      }
    });

    // Fallback timeout nel caso onAuthStateChange non risponda
    const t = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

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
