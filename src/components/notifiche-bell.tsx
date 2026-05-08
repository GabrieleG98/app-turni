import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export function NotificheBell({ className }: { className?: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: notifiche = [] } = useQuery({
    enabled: !!user,
    queryKey: ["notifiche"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifiche")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifiche", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifiche"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const nonLette = notifiche.filter((n) => !n.letto_at).length;

  const markAll = async () => {
    if (nonLette === 0) return;
    await supabase
      .from("notifiche")
      .update({ letto_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .is("letto_at", null);
    qc.invalidateQueries({ queryKey: ["notifiche"] });
  };

  const markOne = async (id: string) => {
    await supabase.from("notifiche").update({ letto_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifiche"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className ?? ""}`} aria-label="Notifiche">
          <Bell className="h-5 w-5" />
          {nonLette > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {nonLette > 9 ? "9+" : nonLette}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold text-sm">Notifiche</div>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={nonLette === 0} className="h-7 text-xs">
            <CheckCheck className="h-3 w-3 mr-1" /> Segna tutte
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifiche.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nessuna notifica</div>
          ) : (
            <ul className="divide-y">
              {notifiche.map((n) => {
                const Body = (
                  <div className={`px-3 py-2.5 hover:bg-accent transition cursor-pointer ${!n.letto_at ? "bg-brand-soft/30" : ""}`}>
                    <div className="flex items-start gap-2">
                      {!n.letto_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{n.titolo}</div>
                        {n.descrizione && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.descrizione}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => markOne(n.id)}>
                    {n.link ? <Link to={n.link as any}>{Body}</Link> : Body}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
