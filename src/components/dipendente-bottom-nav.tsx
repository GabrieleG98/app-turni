import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Clock, MessageCircle, ListChecks, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dipendente", label: "Oggi", icon: Clock },
  { to: "/dipendente/turni", label: "Turni", icon: CalendarDays },
  { to: "/dipendente/chat", label: "Chat", icon: MessageCircle },
  { to: "/dipendente/tasks", label: "Tasks", icon: ListChecks },
  { to: "/dipendente/profilo", label: "Profilo", icon: User },
];

export function DipendenteBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="max-w-md mx-auto grid grid-cols-5">
        {items.map((it) => {
          const active = it.to === "/dipendente" ? path === "/dipendente" : path.startsWith(it.to);
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
