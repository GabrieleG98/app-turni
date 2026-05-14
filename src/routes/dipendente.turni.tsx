import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtData, giorniSettimana, inizioSettimana, isoData, GIORNI, oreTraOrari } from "@/lib/date-utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRightLeft, CalendarCheck } from "lucide-react";
import { addWeeks } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/dipendente/turni")({
  component: MieiTurni,
});

interface SwapForm {
  turno_id: string;
  a_dipendente: string;
  motivo: string;
}

function MieiTurni() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inizio, setInizio] = useState(inizioSettimana());
  const giorni = giorniSettimana(inizio);
  const oggi = isoData(new Date());
  const [swap, setSwap] = useState<SwapForm | null>(null);
  const [swapSearch, setSwapSearch] = useState("");

  const goToCurrentWeek = () => setInizio(inizioSettimana());
  const isCurrentWeek = isoData(inizio) === isoData(inizioSettimana());

  const { data: turni = [] } = useQuery({
    enabled: !!user,
    queryKey: ["miei-turni", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(giorni[6]))
        .order("data");
      return data ?? [];
    },
  });

  const { data: colleghi = [] } = useQuery({
    enabled: !!user,
    queryKey: ["colleghi", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, cognome, reparto")
        .neq("id", user!.id)
        .order("cognome");
      return data ?? [];
    },
  });

  const { data: mieiSwap = [] } = useQuery({
    enabled: !!user,
    queryKey: ["miei-swap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turno_swap_requests")
        .select("turno_id, status")
        .eq("da_dipendente", user!.id);
      return data ?? [];
    },
  });
  const swapMap = new Map(mieiSwap.map((s) => [s.turno_id, s.status]));

  const inviaSwap = async () => {
    if (!swap || !user) return;
    if (!swap.a_dipendente) {
      toast.error("Scegli un collega");
      return;
    }

    const { error } = await supabase.from("turno_swap_requests").insert({
      turno_id: swap.turno_id,
      da_dipendente: user.id,
      a_dipendente: swap.a_dipendente,
      motivo: swap.motivo || null,
    });

    if (error) {
      toast.error("Errore invio richiesta", { description: error.message });
      return;
    }

    const { data: managers } = await supabase
      .from("profiles")
      .select("id")
      .in("ruolo", ["manager", "owner"]);

    if (managers && managers.length > 0) {
      const turno = turni.find((t) => t.id === swap.turno_id);
      const { data: profilo } = await supabase
        .from("profiles")
        .select("nome, cognome")
        .eq("id", user.id)
        .single();

      const nomeRichiedente = profilo ? `${profilo.nome} ${profilo.cognome}` : "Un dipendente";
      const turnoLabel = turno
        ? `${turno.data} · ${turno.tipo_turno} · ${turno.ora_inizio.slice(0, 5)}–${turno.ora_fine.slice(0, 5)}`
        : "un turno";

      const notifiche = managers.map((m) => ({
        user_id: m.id,
        titolo: "Nuova richiesta di scambio turno",
        descrizione: `${nomeRichiedente} ha richiesto uno scambio per ${turnoLabel}.`,
        link: "/manager/scambi",
      }));

      await supabase.from("notifiche").insert(notifiche);
    }

    toast.success("Richiesta inviata al manager");
    setSwap(null);
    qc.invalidateQueries({ queryKey: ["miei-swap"] });
  };

  return (
    <>
      <header className="bg-brand-gradient text-brand-foreground rounded-b-3xl">
        <div className="max-w-md mx-auto px-5 pt-8 pb-8">
          <h1 className="text-2xl font-bold">I miei turni</h1>
          <p className="text-sm opacity-90 mt-1">Settimana corrente</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 -mt-4 space-y-3">
        <Card className="p-2 flex items-center justify-between gap-2 border-0 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              {fmtData(inizio, "d MMM")} – {fmtData(giorni[6], "d MMM")}
            </div>
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={goToCurrentWeek}
              >
                <CalendarCheck className="h-3.5 w-3.5" /> Oggi
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>

        {giorni.map((g, i) => {
          const turniGiorno = turni.filter((x) => x.data === isoData(g));
          const isOggi = isoData(g) === oggi;
          return (
            <Card
              key={i}
              className={`p-4 border-0 shadow-sm space-y-3 ${isOggi ? "ring-2 ring-brand" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {GIORNI[i].slice(0, 3)}
                  </div>
                  <div className="font-display text-2xl font-bold leading-none mt-0.5">
                    {fmtData(g, "d")}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {turniGiorno.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Giorno libero</div>
                  ) : (
                    turniGiorno.map((t) => {
                      const swapStatus = swapMap.get(t.id);
                      const ore = oreTraOrari(t.ora_inizio, t.ora_fine, t.data);
                      return (
                        <div key={t.id} className="flex items-start gap-3">
                          <div
                            className={`w-1.5 self-stretch rounded-full ${
                              t.tipo_turno === "mattina"
                                ? "bg-turno-mattina"
                                : t.tipo_turno === "pomeriggio"
                                ? "bg-turno-pomeriggio"
                                : "bg-turno-sera"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold capitalize">{t.tipo_turno}</div>
                              <span className="text-[10px] opacity-60 font-medium">{ore.toFixed(1)}h</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t.ora_inizio.slice(0, 5)} – {t.ora_fine.slice(0, 5)}
                              {t.location && ` · ${t.location}`}
                            </div>
                            <div className="mt-1">
                              {swapStatus === "pending" && (
                                <span className="text-xs text-muted-foreground">Scambio in attesa…</span>
                              )}
                              {swapStatus === "approved" && (
                                <span className="text-xs text-turno-mattina-foreground">Scambio approvato</span>
                              )}
                              {swapStatus === "rejected" && (
                                <span className="text-xs text-destructive">Scambio rifiutato</span>
                              )}
                              {!swapStatus && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 px-2 -ml-2"
                                  onClick={() => setSwap({ turno_id: t.id, a_dipendente: "", motivo: "" })}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Richiedi scambio
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </main>

      <Dialog open={!!swap} onOpenChange={(o) => !o && setSwap(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Richiedi scambio turno</DialogTitle>
            <DialogDescription>
              La richiesta verrà inviata al manager per l'approvazione.
            </DialogDescription>
          </DialogHeader>
          {swap && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Collega che dovrebbe coprire</Label>
                <Select
                  value={swap.a_dipendente}
                  onValueChange={(v) => setSwap({ ...swap, a_dipendente: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Scegli un collega" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <input
                        type="text"
                        value={swapSearch}
                        onChange={(e) => setSwapSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Cerca per nome o reparto…"
                        className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                      />
                    </div>
                    {colleghi.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nessun collega disponibile</div>
                    )}
                    {colleghi
                      .filter((c) => {
                        const q = swapSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          `${c.nome} ${c.cognome}`.toLowerCase().includes(q) ||
                          (c.reparto ?? "").toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.cognome}
                          {c.reparto ? <span className="text-muted-foreground ml-1">· {c.reparto}</span> : null}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo (opzionale)</Label>
                <Textarea
                  rows={3}
                  value={swap.motivo}
                  onChange={(e) => setSwap({ ...swap, motivo: e.target.value })}
                  placeholder="Spiega brevemente il motivo…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwap(null)}>Annulla</Button>
            <Button onClick={inviaSwap}>Invia richiesta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
