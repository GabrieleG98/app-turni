import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, CalendarDays, Users, FileText, LogOut, Hotel,
  ArrowRightLeft, ListChecks, UserCircle, CalendarRange,
  UserCog, Clock, AlertTriangle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BASE_GRUPPI = [
  {
    label: "📋 Gestione",
    items: [
      { title: "Dashboard", url: "/manager/dashboard", icon: LayoutDashboard },
      { title: "Turni", url: "/manager/turni", icon: CalendarDays },
      { title: "Calendario", url: "/calendario", icon: CalendarRange },
    ],
  },
  {
    label: "👥 Persone",
    items: [
      { title: "Dipendenti", url: "/manager/dipendenti", icon: Users },
      { title: "Scambi", url: "/manager/scambi", icon: ArrowRightLeft },
      { title: "Timbra per...", url: "/manager/timbra-per", icon: UserCog },
    ],
  },
  {
    label: "⚙️ Operativo",
    items: [
      { title: "Tasks", url: "/manager/tasks", icon: ListChecks },
      { title: "Report", url: "/manager/report", icon: FileText },
      { title: "Timbra", url: "/manager/timbra", icon: Clock },
    ],
  },
  {
    label: "👤 Altro",
    items: [
      { title: "Profilo", url: "/manager/profilo", icon: UserCircle },
    ],
  },
];

export function ManagerSidebar() {
  const { signOut, profile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const closeSidebar = () => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  };

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["correzioni-pending-count"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("timbrature_correzioni")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const gruppi = BASE_GRUPPI.map((g) => {
    if (g.label !== "👥 Persone") return g;
    return {
      ...g,
      items: [
        ...g.items,
        {
          title: "Correzioni",
          url: "/manager/correzioni",
          icon: AlertTriangle,
          badge: pendingCount > 0 ? pendingCount : undefined,
        },
      ],
    };
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 font-semibold leading-tight">
          <Hotel className="h-5 w-5 text-primary shrink-0" />
          <span className="truncate">TimiAma | 4FUN</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {gruppi.map((gruppo) => (
          <SidebarGroup key={gruppo.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 mb-0.5">
              {gruppo.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {gruppo.items.map((item) => {
                  const active = path.startsWith(item.url);
                  const badge = (item as any).badge as number | undefined;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2" onClick={closeSidebar}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.title}</span>
                          {badge !== undefined && (
                            <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
                              {badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {profile && (
          <div className="text-xs text-muted-foreground mb-2 truncate">
            {profile.nome} {profile.cognome}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Esci
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
