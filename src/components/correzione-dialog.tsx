import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isoData } from "@/lib/date-utils";

type Tipo = "mancata_clock_in" | "mancata_clock_out" | "orario_errato" | "altro";

const TIPI: { value: Tipo; label: string }[] = [
  { value: "mancata_clock_in", label: "Ho dimenticato di fare clock-in" },
  { value: "mancata_clock_out", label: "Ho dimenticato di fare clock-out" },
  { value: "orario_errato", label: "Orario sbagliato" },
  { value: "altro", label: "Altro" },
];

const TIPO_LABEL: Record<Tipo, string> = {
  mancata_clock_in: "mancata clock-in",
  mancata_clock_out: "mancata clock-out",
  orario_errato: "orario errato",
  altro: "altro",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate?: string;
  timbraturaId?: string | null;
}

export function CorrezioneDialog({ open, onOpenChange, defaultDate, timbraturaId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>("mancata_clock_in");
  const [data, setData] = useState(defaultDate ?? isoData(new Date()));
  const [oraIn, setOraIn] = useState("");
  const [oraOut, setOraOut] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo("mancata_clock_in");
      setData(defaultDate ?? isoData(new Date()));
      setOraIn("");
      setOraOut("");
      setMotivo("");
    }
  }, [open, defaultDate]);

  const submit = async () => {
    if (!user) return;
    if (!motivo.trim()) { toast.error("Inserisci un motivo"); return; }
    setBusy(true);

    try {
      const orario_richiesto_in = oraIn ? new Date(`${data}T${oraIn}`).toISOString() : null;
      const orario_richiesto_out = oraOut ? new Date(`${data}T${oraOut}`).toISOString() : null;

      const { error } = await supabase.from("timbrature_correzioni").insert({
        dipendente_id: user.id,
        timbratura_id: timbraturaId ?? null,
        data,
        tipo,
        orario_richiesto_in,
        orario_richiesto_out,
        motivo: motivo.trim(),
        status: "pending",
      });

      if (error) throw error;

      // Recupera nome dipendente e tutti i manager tramite user_roles
      const [{ data: profilo }, { data: managerRoles }] = await Promise.all([
        supabase.from("profiles").select("nome, cognome").eq("id", user.id).single(),
        supabase.from("user_roles").select("user_id").eq("role", "manager"),
      ]);

      if (managerRoles && managerRoles.length > 0) {
        const nomeDip = profilo ? `${profilo.nome} ${profilo.cognome}` : "Un dipendente";
        const tipoLabel = TIPO_LABEL[tipo];

        const notifiche = managerRoles.map((m) => ({
          user_id: m.user_id,
          titolo: "⚠️ Richiesta correzione timbratura",
          descrizione: `${nomeDip} ha segnalato un errore (${tipoLabel}) per il ${data}.`,
          tipo: "generico" as const,
          link: "/manager/timbrature",
        }));

        const { error: notErr } = await supabase.from("notifiche").insert(notifiche);
        if (notErr) console.warn("Notifica non inviata:", notErr.message);
      }

      toast.success("Richiesta inviata al manager");
      qc.invalidateQueries({ queryKey: ["correzioni"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Segnala errore timbratura</DialogTitle>
          <DialogDescription>
            Il manager riceverà la richiesta e potrà approvarla o modificarla.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo problema</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPI.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          {(tipo === "mancata_clock_in" || tipo === "orario_errato") && (
            <div className="space-y-1">
              <Label>Orario clock-in corretto</Label>
              <Input type="time" value={oraIn} onChange={(e) => setOraIn(e.target.value)} />
            </div>
          )}
          {(tipo === "mancata_clock_out" || tipo === "orario_errato") && (
            <div className="space-y-1">
              <Label>Orario clock-out corretto</Label>
              <Input type="time" value={oraOut} onChange={(e) => setOraOut(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Spiega cosa è successo..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Invio..." : "Invia richiesta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
