import { useRef } from "react";
import { Play, Square, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimbratura } from "@/hooks/use-timbratura";
import { fmtRitardo } from "@/lib/timbra-window";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function TimbraFAB() {
  const { inTurno, completato, busy, clockIn, clockOut, windowState, minutiRitardo, canClock, turnoOggi } = useTimbratura();
  const fileRef = useRef<HTMLInputElement>(null);

  // Se completato → non mostriamo più il FAB
  if (completato) return null;

  const handleClick = () => {
    if (!canClock) return;
    fileRef.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (inTurno) clockOut(f);
    else clockIn(f);
  };

  const isLate = !inTurno && windowState === "late";
  const disabled = busy || !canClock;
  const tooltip =
    windowState === "no-shift"
      ? "Nessun turno schedulato per oggi"
      : windowState === "too-early" && turnoOggi
      ? `Disponibile dalle ${turnoOggi.ora_inizio.slice(0, 5)} (5 min prima)`
      : windowState === "missed"
      ? "Turno passato — chiedi una correzione al manager"
      : !turnoOggi && windowState === "available"
      ? "Timbratura libera (nessun turno schedulato)"
      : "";

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "fixed bottom-6 right-6 z-40 h-16 min-w-16 px-3 rounded-full shadow-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all",
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : inTurno
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/30"
          : isLate
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/40 animate-pulse"
          : "bg-brand-gradient text-brand-foreground hover:opacity-95 shadow-brand/30",
      )}
      aria-label={inTurno ? "Termina turno" : "Inizia turno"}
    >
      {inTurno ? (
        <Square className="h-5 w-5 fill-current" />
      ) : windowState === "too-early" || windowState === "no-shift" ? (
        <Clock className="h-5 w-5" />
      ) : (
        <Play className="h-5 w-5 fill-current" />
      )}
      <span className="mt-0.5">{inTurno ? "Stop" : "Timbra"}</span>
      {isLate && <span className="mt-0.5 font-bold">{fmtRitardo(minutiRitardo)}</span>}
    </button>
  );

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
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="left">{tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
    </>
  );
}
