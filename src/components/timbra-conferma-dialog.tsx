import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimbraConferma {
  tipo: "in" | "out";
  orario: Date;
  oreSessione?: number | null;
  fotoUrl?: string | null;
  ritardoMin?: number;
}

interface Props {
  data: TimbraConferma | null;
  onClose: () => void;
}

export function TimbraConfermaDialog({ data, onClose }: Props) {
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [data, onClose]);

  if (!data) return null;
  const isIn = data.tipo === "in";

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm text-center">
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center shadow-lg",
              isIn ? "bg-emerald-500 text-white" : "bg-destructive text-destructive-foreground",
            )}
          >
            {isIn ? <Check className="h-8 w-8" strokeWidth={3} /> : <LogOut className="h-8 w-8" />}
          </div>
          <div>
            <div className="text-lg font-bold">
              {isIn ? "Entrata registrata" : "Uscita registrata"}
            </div>
            <div className="text-sm text-muted-foreground">
              {data.orario.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
          {!isIn && data.oreSessione != null && (
            <div className="text-sm">
              Sessione: <span className="font-semibold">{data.oreSessione.toFixed(2)} h</span>
            </div>
          )}
          {isIn && data.ritardoMin && data.ritardoMin > 0 && (
            <div className="text-xs text-destructive font-medium">
              In ritardo di {data.ritardoMin} min
            </div>
          )}
          {data.fotoUrl && (
            <img
              src={data.fotoUrl}
              alt="selfie timbratura"
              className="h-20 w-20 rounded-full object-cover border-2 border-border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
