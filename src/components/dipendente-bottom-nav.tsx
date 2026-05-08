import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, MessageCircle, ListChecks, User, Home, Play, Square } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useTimbratura } from "@/hooks/use-timbratura";

const items = [
  { to: "/dipendente", label: "Oggi", icon: Home },
  { to: "/dipendente/turni", label: "Turni", icon: CalendarDays },
  { to: "/dipendente/chat", label: "Chat", icon: MessageCircle },
  { to: "/dipendente/tasks", label: "Tasks", icon: ListChecks },
  { to: "/dipendente/profilo", label: "Profilo", icon: User },
];

export function DipendenteBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { inTurno, completato, busy, clockIn, clockOut } = useTimbratura();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTimbra = () => {
    if (completato) return;
    fileRef.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (inTurno) clockOut(f);
    else clockIn(f);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />
      <nav
        className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto relative">
          <ul className="grid grid-cols-5">
            {items.slice(0, 2).map((it) => (
              <NavItem key={it.to} it={it} path={path} />
            ))}
            <li className="flex items-start justify-center">
              <button
                type="button"
                onClick={handleTimbra}
                disabled={busy || completato}
                className={cn(
                  "-mt-6 h-16 w-16 rounded-full shadow-lg shadow-brand/30 flex flex-col items-center justify-center text-[10px] font-semibold transition-all",
                  completato
                    ? "bg-muted text-muted-foreground"
                    : inTurno
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-brand-gradient text-brand-foreground hover:opacity-95",
                  busy && "opacity-60",
                )}
                aria-label={inTurno ? "Termina turno" : "Inizia turno"}
              >
                {inTurno ? (
                  <Square className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current" />
                )}
                <span className="mt-0.5">
                  {completato ? "Fatto" : inTurno ? "Stop" : "Timbra"}
                </span>
              </button>
            </li>
            {items.slice(2).map((it) => (
              <NavItem key={it.to} it={it} path={path} />
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

function NavItem({ it, path }: { it: typeof items[number]; path: string }) {
  const active = it.to === "/dipendente" ? path === "/dipendente" : path.startsWith(it.to);
  return (
    <li>
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
}
