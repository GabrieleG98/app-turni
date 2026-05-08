import { useRef } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimbratura } from "@/hooks/use-timbratura";

export function TimbraFAB() {
  const { inTurno, completato, busy, clockIn, clockOut } = useTimbratura();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
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
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || completato}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg shadow-brand/30 flex flex-col items-center justify-center text-[10px] font-semibold transition-all",
          completato
            ? "bg-muted text-muted-foreground"
            : inTurno
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-brand-gradient text-brand-foreground hover:opacity-95",
          busy && "opacity-60",
        )}
        aria-label={inTurno ? "Termina turno" : "Inizia turno"}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
    </>
  );
}
