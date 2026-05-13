import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Play, Square, Clock, RotateCw, Loader2, AlertTriangle } from "lucide-react";
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
  const [elaborando, setElaborando] = useState(false);
  // FIX #9: feedback visivo se l'utente annulla la scelta foto (file rimane null)
  const [fotoMancante, setFotoMancante] = useState(false);

  const handleClick = () => {
    if (!canClock) return;
    setFotoMancante(false);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";

    // FIX #9: se l'utente non seleziona nessun file (es. nega fotocamera su desktop),
    // mostra un avviso visibile invece di procedere silenziosamente con foto=null.
    if (!f) {
      setFotoMancante(true);
      return;
    }

    setFotoMancante(false);
    setElaborando(true);
    try {
      if (inTurno) await clockOut(f);
      else await clockIn(f);
    } finally {
      setElaborando(false);
    }
  };

  const isLate = !inTurno && windowState === "late";
  const isLoading = busy || elaborando;
  const disabled = isLoading || !canClock;

  const tooltip =
    windowState === "no-shift"
      ? "Nessun turno schedulato per oggi"
      : windowState === "too-early" && turnoOggi
      ? `Disponibile dalle ${turnoOggi.ora_inizio.slice(0, 5)} (5 min prima)`
      : windowState === "missed"
      ? "Turno passato — chiedi una correzione al manager"
      : "";

  const label = isLoading
    ? inTurno ? "Registrazione uscita…" : "Registrazione entrata…"
    : inTurno
    ? "Termina sessione"
    : haGiaSessioni
    ? "Nuova sessione"
    : "Inizia sessione";

  const Icon = isLoading
    ? Loader2
    : inTurno
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
          <div className="font-bold text-lg capitalize">{turnoOggi.tipo_turno}</div>
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
            disabled && !isLoading
              ? "bg-muted text-muted-foreground"
              : isLoading
              ? "bg-muted text-muted-foreground"
              : inTurno
              ? "bg-destructive text-destructive-foreground"
              : isLate
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-brand-gradient text-brand-foreground",
          )}
        >
          <Icon className={cn("h-8 w-8 mb-1", isLoading && "animate-spin")} />
          {isLate && !isLoading && (
            <span className="text-xs font-bold">{fmtRitardo(minutiRitardo)}</span>
          )}
          {isLoading && (
            <span className="text-xs">attendere…</span>
          )}
        </div>

        {tooltip && !isLoading && (
          <p className="text-sm text-muted-foreground text-center">{tooltip}</p>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Upload foto in corso…
          </p>
        )}

        {/* FIX #9: avviso visivo se la foto non è stata allegata */}
        {fotoMancante && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 w-full">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nessuna foto selezionata. Premi di nuovo il pulsante e scatta o carica una foto per timbrare.</span>
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={handleClick}
          variant={inTurno ? "destructive" : "default"}
        >
          <Icon className={cn("h-5 w-5 mr-2", isLoading && "animate-spin")} />
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
