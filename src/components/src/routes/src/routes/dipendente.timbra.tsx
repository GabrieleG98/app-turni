import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Play, Square, Clock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimbratura } from "@/hooks/use-timbratura";
import { fmtRitardo } from "@/lib/timbra-window";
import { TimbraConfermaDialog } from "@/components/timbra-conferma-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dipendente/timbra")({
  component: TimbraPage,
});

function TimbraPage() {
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
      : "";

  const label = inTurno
    ? "Termina sessione"
    : haGiaSessioni
    ? "Nuova sessione"
    : "Inizia sessione";

  const Icon = inTurno
    ? Square
    : haGiaSessioni
    ? RotateCw
    : windowState === "too-early" || windowState === "no-shift"
    ? Clock
    : Play;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Timbratura</h1>

      {turnoOggi && (
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Turno di oggi
          </div>
          <div className="font-bold text-lg capitalize">
            {turnoOggi.tipo_turno}
          </div>
          <div>
            {turnoOggi.ora_inizio.slice(0, 5)} –{" "}
            {turnoOggi.ora_fine.slice(0, 5)}
          </div>
        </Card>
      )}

      <Card className="p-6 flex flex-col items-center gap-4">
        <div
          className={cn(
            "w-24 h-24 rounded-full flex flex-col items-center justify-center text-sm font-semibold",
            disabled
              ? "bg-muted text-muted-foreground"
              : inTurno
              ? "bg-destructive text-destructive-foreground"
              : isLate
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-brand-gradient text-brand-foreground",
          )}
        >
          <Icon className="h-8 w-8 mb-1" />
          {isLate && (
            <span className="text-xs font-bold">
              {fmtRitardo(minutiRitardo)}
            </span>
          )}
        </div>

        {tooltip && (
          <p className="text-sm text-muted-foreground text-center">
            {tooltip}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={handleClick}
          variant={inTurno ? "destructive" : "default"}
        >
          <Icon className="h-5 w-5 mr-2" />
          {label}
        </Button>
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />
      <TimbraConfermaDialog data={conferma} onClose={closeConferma} />
    </div>
  );
}
