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
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, FileText, LogOut, Hotel, ArrowRightLeft, MessageCircle, ListChecks, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/manager/dashboard", icon: LayoutDashboard },
  { title: "Turni", url: "/manager/turni", icon: CalendarDays },
  { title: "Scambi", url: "/manager/scambi", icon: ArrowRightLeft },
  { title: "Dipendenti", url: "/manager/dipendenti", icon: Users },
  { title: "Tasks", url: "/manager/tasks", icon: ListChecks },
  { title: "Chat", url: "/manager/chat", icon: MessageCircle },
  { title: "Report", url: "/manager/report", icon: FileText },
];

export function ManagerSidebar() {
  const { signOut, profile } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 font-semibold leading-tight">
          <Hotel className="h-5 w-5 text-primary shrink-0" />
          <span className="truncate">Schedule Timi Ama 4Fun</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Area Manager</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
