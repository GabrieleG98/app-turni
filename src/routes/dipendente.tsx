import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DipendenteSidebar } from "@/components/dipendente-sidebar";
import { NotificheBell } from "@/components/notifiche-bell";
import { ThemeToggle } from "@/components/theme-toggle";

import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dipendente")({
  component: DipendenteLayout,
});

function DipendenteLayout() {
  const { loading, user, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (role === "manager") return <Navigate to="/manager/dashboard" />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DipendenteSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b flex items-center px-2 sm:px-3 bg-background sticky top-0 z-20 gap-2">
            <SidebarTrigger />
            <div className="font-semibold text-sm truncate">Area Dipendente</div>
            <div className="ml-auto flex items-center gap-1">
              <NotificheBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 bg-muted/20 overflow-x-hidden pb-24">
            <Outlet />
          </main>
        </div>
        
      </div>
    </SidebarProvider>
  );
}
