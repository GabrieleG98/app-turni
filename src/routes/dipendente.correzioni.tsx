import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Check, X, FileWarning } from "lucide-react";
import { CorrezioneDialog } from "@/components/correzione-dialog";
import { fmtData } from "@/lib/date-utils";

export const Route = createFileRoute("/dipendente/correzioni")({
  component: CorrezioniDipendentePage,
});

const TIPO_LABEL: Record<string, string> = {
  mancata_clock_in: "Mancato clock-in",
  mancata_clock_out: "Mancato clock-out",
  orario_errato: "Orario errato",
  altro: "Altro",
};

function CorrezioniDipendentePage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: correzioni = [] } = useQuery({
    enabled: !!user,
    queryKey: ["correzioni", "mie", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature_correzioni")
        .select("*")
        .eq("dipendente_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const statusBadge = (s: string) => {
    if (s === "pending")
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> In attesa
        </Badge>
      );
    if (s === "approved")
      return (
        <Badge className="bg-emerald-600 gap-1">
          <Check className="h-3 w-3" /> Approvata
        </Badge>
      );
    return (
      <Badge variant="destructive" className="gap-1">
        <X className="h-3 w-3" /> Rifiutata
      </Badge>
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileWarning className="h-6 w-6" /> Correzioni timbrature
          </h1>
          <p className="text-sm text-muted-foreground">
            Segnala al manager errori o dimenticanze sulle tue timbrature.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuova
        </Button>
      </div>

      {correzioni.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nessuna richiesta inviata. Tocca "Nuova" per segnalare una correzione.
        </Card>
      ) : (
        <div className="space-y-2">
          {correzioni.map((c: any) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-medium">{TIPO_LABEL[c.tipo] ?? c.tipo}</div>
                {statusBadge(c.status)}
              </div>
              <div className="text-xs text-muted-foreground">
                Data turno: {fmtData(c.data)}
                {c.orario_richiesto_in && (
                  <> · IN: {new Date(c.orario_richiesto_in).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</>
                )}
                {c.orario_richiesto_out && (
                  <> · OUT: {new Date(c.orario_richiesto_out).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </div>
              <div className="text-sm">{c.motivo}</div>
              {c.note_manager && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">Nota manager:</span> {c.note_manager}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CorrezioneDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
