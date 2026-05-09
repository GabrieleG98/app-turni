import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TimbraConfermaDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conferma timbratura</DialogTitle>
        </DialogHeader>
        <p>Sei sicuro di voler timbrare?</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annulla</Button>
          <Button onClick={onConfirm}>Conferma</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
