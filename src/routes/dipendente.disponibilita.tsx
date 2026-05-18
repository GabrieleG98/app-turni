import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { addDays, addWeeks, format } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { inizioSettimana, isoData, GIORNI } from "@/lib/date-utils";

export const Route = createFileRoute("/dipendente/disponibilita")({
  component: Disponibilita,
});

type Stato = "disponibile" | "non_disponibile" | "preferito";

const STATO_CONFIG: Record<Stato, { label: string; color: string; icon: React.ElementType }> = {
  disponibile: { label: "Disponibile", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  non_disponibile: { label: "Non disponibile", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  preferito: { label: "Preferito", color: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: MinusCircle },
};

// ISO day-of-week: 1=Mon..7=Sun
function isoDow(d: Date): number {
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}

function Disponibilita() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inizio, setInizio] = useState<Date>(inizioSettimana());
  const giorni = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(inizio, i)), [inizio]);

  const [editing, setEditing] = useState<{ data: string; giorno: number; stato: Stato; note: string; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: disponibilita = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["disponibilita-mia"],
    queryFn: async () => {
      const { data } = await supabase
        .from("disponibilita")
        .select("*")
        .eq("dipendente_id", user!.id);
      return data ?? [];
    },
  });

  const byGiorno = useMemo(() => {
    const m = new Map<number, typeof disponibilita[number]>();
    disponibilita.forEach((d) => m.set(d.giorno_settimana, d));
    return m;
  }, [disponibilita]);

  const apri = (data: string) => {
    const giorno = isoDow(new Date(data + "T00:00:00"));
    const existing = byGiorno.get(giorno);
    setEditing({
      data,
      giorno,
      stato: (existing?.tipo as Stato) ?? "disponibile",
      note: existing?.note ?? "",
      id: existing?.id,
    });
  };

  const salva = async () => {
    if (!editing || !user) return;
    setSaving(true);
    const { error } = editing.id
      ? await supabase.from("disponibilita")
          .update({ tipo: editing.stato, note: editing.note || null })
          .eq("id", editing.id)
      : await supabase.from("disponibilita").insert({
          dipendente_id: user.id,
          giorno_settimana: editing.giorno,
          ora_inizio: "00:00",
          ora_fine: "23:59",
          tipo: editing.stato,
          note: editing.note || null,
        });
    setSaving(false);
    if (error) {
      toast.error("Errore salvataggio", { description: error.message });
    } else {
      toast.success("Disponibilità salvata");
      qc.invalidateQueries({ queryKey: ["disponibilita-mia"] });
      setEditing(null);
    }
  };

  const elimina = async () => {
    if (!editing?.id) return;
    setSaving(true);
    await supabase.from("disponibilita").delete().eq("id", editing.id);
    setSaving(false);
    toast.success("Disponibilità rimossa");
    qc.invalidateQueries({ queryKey: ["disponibilita-mia"] });
    setEditing(null);
  };

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">Disponibilità</h1>
          <p className="text-sm opacity-90 mt-1">Indica quando sei disponibile a lavorare</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-4 space-y-4 pb-24">
        {/* Navigazione settimana */}
        <Card className="p-3 flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center font-medium text-sm">
            {format(inizio, "d MMM", { locale: it })} – {format(addDays(inizio, 6), "d MMM yyyy", { locale: it })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>Oggi</Button>
        </Card>

        {/* Griglia giorni */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {giorni.map((g, i) => {
              const dataIso = isoData(g);
              const disp = byGiorno.get(isoDow(g));
              const stato = disp?.tipo as Stato | undefined;
              const cfg = stato ? STATO_CONFIG[stato] : null;
              const oggi = dataIso === isoData(new Date());

              return (
                <button
                  key={dataIso}
                  onClick={() => apri(dataIso)}
                  className={`w-full text-left rounded-xl border p-3.5 transition hover:shadow-sm ${
                    oggi ? "ring-2 ring-brand" : ""
                  } ${
                    cfg ? cfg.color : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{GIORNI[i]}</div>
                      <div className="text-xs opacity-75">{format(g, "d MMMM", { locale: it })}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {cfg ? (
                        <>
                          <cfg.icon className="h-4 w-4" />
                          <span>{cfg.label}</span>
                        </>
                      ) : (
                        <span className="text-xs">Tocca per impostare</span>
                      )}
                    </div>
                  </div>
                  {disp?.note && (
                    <div className="mt-1.5 text-xs opacity-70 line-clamp-1">“{disp.note}”</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <Card className="p-3">
          <div className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Legenda</div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(STATO_CONFIG) as [Stato, typeof STATO_CONFIG[Stato]][]).map(([, cfg]) => (
              <Badge key={cfg.label} variant="outline" className={`gap-1 text-xs ${cfg.color}`}>
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </Badge>
            ))}
          </div>
        </Card>
      </main>

      {/* Dialog modifica */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing && format(new Date(editing.data + "T00:00:00"), "EEEE d MMMM yyyy", { locale: it })}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(STATO_CONFIG) as [Stato, typeof STATO_CONFIG[Stato]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setEditing({ ...editing, stato: key })}
                    className={`rounded-lg border p-2.5 text-xs font-medium flex flex-col items-center gap-1 transition ${
                      editing.stato === key
                        ? `${cfg.color} ring-2 ring-offset-1 ring-current`
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <cfg.icon className="h-5 w-5" />
                    {cfg.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Note (opzionale)</Label>
                <Textarea
                  rows={2}
                  placeholder="es. Solo mattina, no dopo le 14:00..."
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {editing?.id && (
              <Button variant="outline" onClick={elimina} disabled={saving} className="mr-auto text-destructive border-destructive/50 hover:bg-destructive/5">
                Rimuovi
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={salva} disabled={saving}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
