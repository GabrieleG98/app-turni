import { useRef } from "react";
import { Play, Square, Clock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimbratura } from "@/hooks/use-timbratura";
import { fmtRitardo } from "@/lib/timbra-window";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimbraConfermaDialog } from "@/components/timbra-conferma-dialog";

export function TimbraFAB() {
  const {
    inTurno,
    haGiaSessioni,
    busy,
    clockIn,
    clockOut,
    windowState,
    minutiRitardo,
    canClock,
    turnoOggi,
    conferma,
    closeConferma,
  } = useTimbratura();
  const fileRef = useRef<HTMLInputElement>(null);

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
      ? "Timbratura libera"
      : "";

  const label = inTurno ? "Stop" : haGiaSessioni ? "Nuova" : "Timbra";
  const Icon = inTurno
    ? Square
    : haGiaSessioni
    ? RotateCw
    : windowState === "too-early" || windowState === "no-shift"
    ? Clock
    : Play;

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
      aria-label={inTurno ? "Termina sessione" : "Inizia sessione"}
    >
      <Icon className={cn("h-5 w-5", (inTurno || (!haGiaSessioni && windowState !== "too-early" && windowState !== "no-shift")) && "fill-current")} />
      <span className="mt-0.5">{label}</span>
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
      <TimbraConfermaDialog data={conferma} onClose={closeConferma} />
    </>
  );
}
