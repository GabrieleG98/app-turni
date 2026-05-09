import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface TimbraConferma {
  tipo: "in" | "out";
  orario: Date;
  fotoUrl?: string | null;
  ritardoMin?: number;
  oreSessione?: number | null;
}

interface Props {
  data: TimbraConferma | null;
  onClose: () => void;
}

export function TimbraConfermaDialog({ data, onClose }: Props) {
  return (
    <Dialog open={!!data} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.tipo === "in" ? "✅ Entrata timbrata" : "✅ Uscita timbrata"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {data?.tipo === "in" && data.ritardoMin && data.ritardoMin > 0
            ? `Ritardo: ${data.ritardoMin} min`
            : data?.tipo === "out" && data.oreSessione
              ? `Ore lavorate: ${data.oreSessione.toFixed(1)} h`
              : "Timbratura registrata con successo."}
        </p>
        <DialogFooter>
          <Button onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
