import { useState, useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getSelfieSignedUrl } from "@/lib/timbrature-utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface FotoTimbraturaProps {
  url: string | null;
  timbratura_id: string;
  campo: "foto_in_url" | "foto_out_url";
  onDeleted?: () => void;
}

export function FotoTimbratura({ url, timbratura_id, campo, onDeleted }: FotoTimbraturaProps) {
  const { role } = useAuth();
  const isManager = role === "manager";
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    getSelfieSignedUrl(url).then(setSignedUrl);
  }, [url]);

  if (!url || !signedUrl) {
    return (
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <span className="text-[10px] text-muted-foreground">–</span>
      </div>
    );
  }

  const elimina = async () => {
    setDeleting(true);
    const patch = (campo === "foto_in_url" ? { foto_in_url: null } : { foto_out_url: null });
    const { error } = await supabase
      .from("timbrature")
      .update(patch)
      .eq("id", timbratura_id);
    if (error) {
      toast.error("Errore eliminazione foto", { description: error.message });
    } else {
      toast.success("Foto eliminata");
      setOpen(false);
      onDeleted?.();
    }
    setDeleting(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-md overflow-hidden border border-border shrink-0 hover:opacity-80 transition-opacity"
      >
        <img src={signedUrl} alt="foto timbratura" className="w-full h-full object-cover" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="relative">
            <img src={signedUrl} alt="foto timbratura" className="w-full object-contain max-h-[80vh]" />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X className="h-4 w-4" />
            </button>
            {isManager && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-3 flex justify-end">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={elimina}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleting ? "Eliminando…" : "Elimina foto"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
