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
  ArrowRightLeft, MessageCircle, ListChecks, UserCircle, CalendarRange,
  UserCog, Clock,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const gruppi = [
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
      { title: "Timbra per…", url: "/manager/timbra-per", icon: UserCog },
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
    label: "💬 Altro",
    items: [
      { title: "Chat", url: "/manager/chat", icon: MessageCircle },
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
                {gruppo.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={path.startsWith(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2" onClick={closeSidebar}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
