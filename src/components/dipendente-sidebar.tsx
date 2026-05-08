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
  Home,
  CalendarDays,
  CalendarRange,
  ListChecks,
  MessageCircle,
  User,
  Hotel,
  LogOut,
  CalendarClock,
  FileWarning,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Oggi", url: "/dipendente", icon: Home, exact: true },
  { title: "Turni", url: "/dipendente/turni", icon: CalendarDays },
  { title: "Calendario", url: "/calendario", icon: CalendarRange },
  { title: "Disponibilità", url: "/dipendente/disponibilita", icon: CalendarClock },
  { title: "Tasks", url: "/dipendente/tasks", icon: ListChecks },
  { title: "Correzioni", url: "/dipendente/correzioni", icon: FileWarning },
  { title: "Chat", url: "/dipendente/chat", icon: MessageCircle },
  { title: "Profilo", url: "/dipendente/profilo", icon: User },
];

export function DipendenteSidebar() {
  const { signOut, profile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const closeSidebar = () => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 font-semibold leading-tight">
          <Hotel className="h-5 w-5 text-primary shrink-0" />
          <span className="truncate">Staff 4FUN - Timi Ama</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Area Dipendente</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = it.exact ? path === it.url : path.startsWith(it.url);
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.url} className="flex items-center gap-2" onClick={closeSidebar}>
                        <it.icon className="h-4 w-4" />
                        <span>{it.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
