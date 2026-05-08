import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  fmtSettimana, GIORNI, giorniSettimana, inizioSettimana, isoData, oreTraOrari,
} from "@/lib/date-utils";
import { addWeeks, addMonths, addDays, startOfMonth, endOfMonth, format, getDay, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { exportSettimanaPPTX } from "@/lib/export-pptx";
import { EventoDialog, CATEGORIA_COLORE, CATEGORIA_LABEL, type Categoria } from "@/components/evento-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/calendario")({
  component: CalendarioPage,
});

function CalendarioPage() {
  const { user, role, loading } = useAuth();
  const [view, setView] = useState<"settimana" | "mese">("settimana");
  const [inizio, setInizio] = useState(inizioSettimana());
  const [meseRif, setMeseRif] = useState(startOfMonth(new Date()));
  const [eventoDialog, setEventoDialog] = useState<{ open: boolean; initialData?: any; defaultDate?: string; readOnly?: boolean }>({ open: false });
  const [exporting, setExporting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/login" />;

  const isManager = role === "manager";
  const giorniSett = giorniSettimana(inizio);
  const fineSett = giorniSett[6];

  const { data: profili = [] } = useQuery({
    queryKey: ["profili-cal"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome, ruolo_lavoro").order("cognome");
      return data ?? [];
    },
  });

  const { data: turniSett = [] } = useQuery({
    queryKey: ["turni-cal-settimana", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("pubblicato", true)
        .gte("data", isoData(inizio))
        .lte("data", isoData(fineSett));
      return data ?? [];
    },
  });

  const meseInizio = startOfMonth(meseRif);
  const meseFine = endOfMonth(meseRif);
  const { data: eventiMese = [] } = useQuery({
    queryKey: ["eventi-speciali", isoData(meseInizio), isoData(meseFine)],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventi_speciali")
        .select("*")
        .gte("data", isoData(meseInizio))
        .lte("data", isoData(meseFine))
        .order("data");
      return data ?? [];
    },
  });

  const { data: eventiSett = [] } = useQuery({
    queryKey: ["eventi-speciali-sett", isoData(inizio), isoData(fineSett)],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventi_speciali")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(fineSett));
      return data ?? [];
    },
  });

  const turniByCell = useMemo(() => {
    const m = new Map<string, typeof turniSett>();
    turniSett.forEach((t) => {
      const k = `${t.dipendente_id}|${t.data}`;
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    });
    m.forEach((arr) => arr.sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio)));
    return m;
  }, [turniSett]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSettimanaPPTX({
        giorni: giorniSett,
        profili,
        turni: turniSett,
        eventi: eventiSett,
        titoloSettimana: fmtSettimana(inizio),
      });
      toast.success("PowerPoint generato");
    } catch (e: any) {
      toast.error("Errore export", { description: e.message });
    } finally {
      setExporting(false);
    }
  };

  // Calcolo griglia mese (lunedì come primo)
  const meseGriglia = useMemo(() => {
    const start = startOfMonth(meseRif);
    const end = endOfMonth(meseRif);
    const offsetStart = (getDay(start) + 6) % 7; // 0=lun
    const gridStart = addDays(start, -offsetStart);
    const totalDays = Math.ceil((offsetStart + (end.getDate())) / 7) * 7;
    return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
  }, [meseRif]);

  const eventiByGiorno = useMemo(() => {
    const m = new Map<string, typeof eventiMese>();
    eventiMese.forEach((e) => {
      const arr = m.get(e.data) ?? [];
      arr.push(e);
      m.set(e.data, arr);
    });
    return m;
  }, [eventiMese]);

  const oggi = isoData(new Date());

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="bg-brand-gradient text-brand-foreground">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-brand-foreground hover:bg-white/10">
            <Link to={isManager ? "/manager/dashboard" : "/dipendente"}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Calendario</h1>
            <p className="text-xs opacity-80">Turni di tutti & eventi speciali</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 md:px-6 py-4 space-y-4">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="settimana">Settimana — Turni</TabsTrigger>
            <TabsTrigger value="mese">Mese — Eventi</TabsTrigger>
          </TabsList>

          {/* SETTIMANA */}
          <TabsContent value="settimana" className="space-y-3 mt-3">
            <Card className="p-3 flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="font-medium min-w-[200px] text-center">{fmtSettimana(inizio)}</div>
              <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>Oggi</Button>
              <Button onClick={handleExport} disabled={exporting} className="ml-auto bg-brand text-brand-foreground hover:bg-brand/90">
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Esporta PowerPoint
              </Button>
            </Card>

            {eventiSett.length > 0 && (
              <Card className="p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Eventi della settimana</div>
                <div className="flex flex-wrap gap-2">
                  {eventiSett.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEventoDialog({ open: true, initialData: e, readOnly: !isManager })}
                      className="text-xs px-2 py-1 rounded-md text-white font-medium"
                      style={{ background: e.colore }}
                    >
                      {format(new Date(e.data), "dd/MM")} · {e.titolo}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-medium sticky left-0 bg-muted/40 min-w-[160px]">Dipendente</th>
                    {giorniSett.map((g, i) => {
                      const isOggi = isoData(g) === oggi;
                      return (
                        <th key={i} className={`p-2 text-center font-medium min-w-[120px] ${isOggi ? "bg-brand text-brand-foreground rounded-md" : ""}`}>
                          <div>{GIORNI[i]}</div>
                          <div className={`text-xs ${isOggi ? "text-brand-foreground/80" : "text-muted-foreground"}`}>{format(g, "dd/MM")}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {profili.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nessun dipendente</td></tr>
                  )}
                  {profili.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-3 sticky left-0 bg-background">
                        <div className="font-medium">{p.nome} {p.cognome}</div>
                        <div className="text-xs text-muted-foreground">{p.ruolo_lavoro}</div>
                      </td>
                      {giorniSett.map((g) => {
                        const dataIso = isoData(g);
                        const lista = turniByCell.get(`${p.id}|${dataIso}`) ?? [];
                        return (
                          <td key={dataIso} className="p-1.5 align-top">
                            {lista.length === 0 ? (
                              <div className="text-center text-xs text-muted-foreground/50 py-2">—</div>
                            ) : (
                              <div className="space-y-1">
                                {lista.map((t) => {
                                  const ore = oreTraOrari(t.ora_inizio, t.ora_fine, t.data);
                                  const cls = t.tipo_turno === "mattina"
                                    ? "bg-turno-mattina text-turno-mattina-foreground"
                                    : t.tipo_turno === "pomeriggio"
                                    ? "bg-turno-pomeriggio text-turno-pomeriggio-foreground"
                                    : "bg-turno-sera text-turno-sera-foreground";
                                  return (
                                    <div key={t.id} className={`rounded-md p-1.5 text-xs ${cls}`}>
                                      <div className="font-semibold capitalize flex items-center gap-1">
                                        <span className="truncate">{t.tipo_turno}</span>
                                        <span className="ml-auto text-[10px] opacity-70 font-normal">{ore.toFixed(1)}h</span>
                                      </div>
                                      <div className="leading-tight">{t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)}</div>
                                      {t.location && <div className="opacity-80 truncate text-[10px]">{t.location}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* MESE */}
          <TabsContent value="mese" className="space-y-3 mt-3">
            <Card className="p-3 flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={() => setMeseRif(addMonths(meseRif, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="font-medium min-w-[180px] text-center capitalize">{format(meseRif, "MMMM yyyy", { locale: it })}</div>
              <Button variant="outline" size="icon" onClick={() => setMeseRif(addMonths(meseRif, 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setMeseRif(startOfMonth(new Date()))}>Oggi</Button>
              {isManager && (
                <Button
                  className="ml-auto bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => setEventoDialog({ open: true, defaultDate: isoData(new Date()) })}
                >
                  <Plus className="h-4 w-4 mr-2" /> Aggiungi evento
                </Button>
              )}
            </Card>

            <Card className="p-2 md:p-3">
              <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                {GIORNI.map((g) => <div key={g} className="text-center py-1">{g.slice(0, 3)}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {meseGriglia.map((g) => {
                  const dataIso = isoData(g);
                  const eventi = eventiByGiorno.get(dataIso) ?? [];
                  const isOggi = dataIso === oggi;
                  const fuoriMese = !isSameMonth(g, meseRif);
                  return (
                    <div
                      key={dataIso}
                      className={`min-h-[88px] rounded-md border p-1.5 text-xs flex flex-col gap-1 ${fuoriMese ? "bg-muted/30 opacity-50" : "bg-background"} ${isOggi ? "ring-2 ring-brand" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isOggi ? "text-brand" : ""}`}>{format(g, "d")}</span>
                        {isManager && !fuoriMese && (
                          <button
                            onClick={() => setEventoDialog({ open: true, defaultDate: dataIso })}
                            className="opacity-0 hover:opacity-100 focus:opacity-100 transition text-muted-foreground hover:text-brand"
                            aria-label="Aggiungi evento"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {eventi.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setEventoDialog({ open: true, initialData: e, readOnly: !isManager })}
                            className="w-full text-left text-[10px] px-1.5 py-0.5 rounded text-white truncate font-medium"
                            style={{ background: e.colore }}
                            title={`${e.titolo}${e.ora_inizio ? ` · ${e.ora_inizio.slice(0, 5)}` : ""}`}
                          >
                            {e.ora_inizio ? `${e.ora_inizio.slice(0, 5)} ` : ""}{e.titolo}
                          </button>
                        ))}
                        {eventi.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{eventi.length - 3} altri</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <CategorieLegenda />
          </TabsContent>
        </Tabs>
      </main>

      <EventoDialog
        open={eventoDialog.open}
        onOpenChange={(o) => setEventoDialog((s) => ({ ...s, open: o }))}
        initialData={eventoDialog.initialData}
        defaultDate={eventoDialog.defaultDate}
        readOnly={eventoDialog.readOnly}
      />
    </div>
  );
}

function CategorieLegenda() {
  const { isOwner } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoColore, setNuovoColore] = useState("#3b82f6");

  const { data: categorie = [] } = useQuery({
    queryKey: ["evento-categorie"],
    queryFn: async () => {
      const { data } = await supabase.from("evento_categorie").select("*").order("ordine");
      return data ?? [];
    },
  });

  const aggiungi = async () => {
    if (!nuovoNome.trim()) return;
    const { error } = await supabase.from("evento_categorie").insert({
      nome: nuovoNome.trim(),
      colore: nuovoColore,
      ordine: categorie.length + 1,
    });
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Categoria aggiunta");
    setNuovoNome("");
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["evento-categorie"] });
  };

  const aggiornaColore = async (id: string, colore: string) => {
    const { error } = await supabase.from("evento_categorie").update({ colore }).eq("id", id);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["evento-categorie"] });
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare questa categoria?")) return;
    const { error } = await supabase.from("evento_categorie").delete().eq("id", id);
    if (error) { toast.error("Errore", { description: error.message }); return; }
    toast.success("Eliminata");
    qc.invalidateQueries({ queryKey: ["evento-categorie"] });
  };

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Legenda categorie</div>
        {isOwner && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3 mr-1" /> Nuova categoria
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {categorie.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded border bg-background">
            {isOwner ? (
              <input
                type="color"
                value={c.colore}
                onChange={(e) => aggiornaColore(c.id, e.target.value)}
                className="h-4 w-4 rounded cursor-pointer border-0 p-0"
                title="Cambia colore"
              />
            ) : (
              <span className="h-3 w-3 rounded-full" style={{ background: c.colore }} />
            )}
            <span>{c.nome}</span>
            {isOwner && (
              <button onClick={() => elimina(c.id)} className="ml-1 text-muted-foreground hover:text-destructive" aria-label="Elimina">×</button>
            )}
          </div>
        ))}
      </div>
      {isOwner && adding && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <input type="color" value={nuovoColore} onChange={(e) => setNuovoColore(e.target.value)} className="h-9 w-9 rounded border-0 cursor-pointer" />
          <input
            type="text"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value)}
            placeholder="Nome categoria"
            className="flex-1 min-w-[150px] h-9 px-3 rounded-md border bg-background text-sm"
          />
          <Button size="sm" onClick={aggiungi}>Aggiungi</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annulla</Button>
        </div>
      )}
    </Card>
  );
}
          </TabsContent>
        </Tabs>
      </main>

      <EventoDialog
        open={eventoDialog.open}
        onOpenChange={(o) => setEventoDialog((s) => ({ ...s, open: o }))}
        initialData={eventoDialog.initialData}
        defaultDate={eventoDialog.defaultDate}
        readOnly={eventoDialog.readOnly}
      />
    </div>
  );
}
