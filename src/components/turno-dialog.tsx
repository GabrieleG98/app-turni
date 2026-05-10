import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Turno {
  id: string;
  data: string;
  tipo_turno: string;
  ora_inizio: string;
  ora_fine: string;
  location?: string | null;
  note?: string | null;
  pubblicato?: boolean;
}

interface Props {
  turno: Turno | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const COLORI: Record<string, string> = {
  mattina: "bg-turno-mattina text-turno-mattina-foreground",
  pomeriggio: "bg-turno-pomeriggio text-turno-pomeriggio-foreground",
  sera: "bg-turno-sera text-turno-sera-foreground",
};

export function TurnoDialog({ turno, open, onOpenChange }: Props) {
  if (!turno) return null;

  const dataFmt = format(new Date(turno.data), "EEEE d MMMM yyyy", { locale: it });
  const cls = COLORI[turno.tipo_turno] ?? "bg-muted text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dettaglio turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badge tipo turno */}
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${cls}`}>
            {turno.tipo_turno}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Data</span>
              <span className="capitalize">{dataFmt}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Orario</span>
              <span>{turno.ora_inizio.slice(0, 5)} – {turno.ora_fine.slice(0, 5)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Location</span>
              <span>{turno.location || "/"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 shrink-0">Note</span>
              <span className="whitespace-pre-wrap">{turno.note || "/"}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
