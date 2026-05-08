import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2, CalendarRange } from "lucide-react";
import { DipendenteBottomNav } from "@/components/dipendente-bottom-nav";
import { NotificheBell } from "@/components/notifiche-bell";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen bg-muted/20 pb-20">
      <div className="fixed top-2 right-2 z-30 flex items-center gap-1">
        <Link
          to="/calendario"
          className="bg-background/80 backdrop-blur rounded-full shadow h-9 w-9 flex items-center justify-center text-foreground hover:text-brand transition"
          aria-label="Calendario"
        >
          <CalendarRange className="h-4 w-4" />
        </Link>
        <NotificheBell className="bg-background/80 backdrop-blur rounded-full shadow" />
        <ThemeToggle className="bg-background/80 backdrop-blur rounded-full shadow" />
      </div>
      <Outlet />
      <DipendenteBottomNav />
    </div>
  );
}
