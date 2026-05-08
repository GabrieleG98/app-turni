import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, RotateCcw, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { fmtData } from "@/lib/date-utils";

type TaskRow = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data: string;
  completato_at: string | null;
  foto_url: string | null;
  template_id: string | null;
};

interface Props {
  task: TaskRow | null;
  richiedeFoto: boolean;
  onClose: () => void;
  invalidateKey: unknown[];
}

export function TaskDettaglioDialog({ task, richiedeFoto, onClose, invalidateKey }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!task) return null;
  const done = !!task.completato_at;

  const reset = () => {
    setFoto(null);
    setPreview(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    setFoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const completa = async () => {
    if (!user) return;
    if (richiedeFoto && !foto) {
      toast.error("Foto obbligatoria per chiudere questo task");
      return;
    }
    setBusy(true);
    try {
      let foto_url: string | null = null;
      if (foto) {
        const path = `${user.id}/${task.id}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("task-foto")
          .upload(path, foto, { contentType: foto.type, upsert: true });
        if (upErr) throw upErr;
        foto_url = path;
      }
      const { error } = await supabase
        .from("task_assegnati")
        .update({ completato_at: new Date().toISOString(), foto_url })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Task completato!");
      qc.invalidateQueries({ queryKey: invalidateKey });
      reset();
      onClose();
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const riapri = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("task_assegnati")
        .update({ completato_at: null })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Task riaperto");
      qc.invalidateQueries({ queryKey: invalidateKey });
      onClose();
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const fotoSalvataUrl = task.foto_url
    ? supabase.storage.from("task-foto").getPublicUrl(task.foto_url).data.publicUrl
    : null;

  return (
    <Dialog open={!!task} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task.titolo}</DialogTitle>
          <DialogDescription>{fmtData(new Date(task.data), "EEEE d MMMM")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {task.descrizione && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.descrizione}</p>
          )}

          {done ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Completato il {new Date(task.completato_at!).toLocaleString("it-IT")}
              </div>
              {fotoSalvataUrl && (
                <img src={fotoSalvataUrl} alt="Foto task" className="w-full rounded-lg border" />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Anteprima" className="w-full rounded-lg border" />
                  <button
                    type="button"
                    onClick={reset}
                    className="absolute top-2 right-2 bg-background/90 rounded-full p-1 shadow"
                    aria-label="Rimuovi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {richiedeFoto ? "Scatta foto (obbligatoria)" : "Aggiungi foto (opzionale)"}
                </Button>
              )}
              {richiedeFoto && !foto && (
                <p className="text-xs text-amber-600">
                  Per chiudere questo task è richiesta una foto.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {done ? (
            <Button variant="outline" onClick={riapri} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Riapri
            </Button>
          ) : (
            <Button onClick={completa} disabled={busy || (richiedeFoto && !foto)}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Completa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
