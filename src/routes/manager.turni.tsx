import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Send,
  BookmarkPlus,
  LayoutTemplate,
  CheckCircle2,
} from "lucide-react";
import { fmtSettimana, giorniSettimana, inizioSettimana, isoData, GIORNI, oreTraOrari } from "@/lib/date-utils";
import { addWeeks, addDays, format, getDay } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/turni")({
  component: GestioneTurni,
});

const DEFAULT_ORARI: Record<string, { i: string; f: string }> = {
  mattina: { i: "09:00", f: "13:00" },
  pomeriggio: { i: "14:00", f: "18:00" },
  sera: { i: "20:00", f: "00:00" },
};

const COLORE_TURNO: Record<string, string> = {
  mattina: "bg-turno-mattina text-turno-mattina-foreground",
  pomeriggio: "bg-turno-pomeriggio text-turno-pomeriggio-foreground",
  sera: "bg-turno-sera text-turno-sera-foreground",
};

interface TurnoForm {
  id?: string;
  dipendente_id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  tipo_turno: "mattina" | "pomeriggio" | "sera";
  location: string;
  note: string;
}

interface TemplateRow {
  dipendente_id: string;
  giorno_settimana: number;
  ora_inizio: string;
  ora_fine: string;
  tipo_turno: string;
  location: string;
  note: string | null;
}

function GestioneTurni() {
  const qc = useQueryClient();
  const [inizio, setInizio] = useState<Date>(inizioSettimana());
  const giorni = giorniSettimana(inizio);
  const fine = addDays(inizio, 6);

  const [editing, setEditing] = useState<TurnoForm | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [copiaOpen, setCopiaOpen] = useState(false);
  const [pubblicaOpen, setPubblicaOpen] = useState(false);
  const [salvaTplOpen, setSalvaTplOpen] = useState(false);
  const [applicaTplOpen, setApplicaTplOpen] = useState(false);
  const [tplNome, setTplNome] = useState("");
  const [tplSelected, setTplSelected] = useState<string>("");
  const [filtroReparto, setFiltroReparto] = useState<string>("tutti");

  const { data: profili = [], isLoading: loadingProfili } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [], isLoading: loadingTurni } = useQuery({
    queryKey: ["turni-settimana", isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .gte("data", isoData(inizio))
        .lte("data", isoData(fine));
      return data ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["turni-template"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni_template")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const reparti = useMemo(
    () => Array.from(new Set(profili.map((p) => p.reparto).filter(Boolean))).sort() as string[],
    [profili],
  );

  const profiliFiltrati = useMemo(
    () => filtroReparto === "tutti" ? profili : profili.filter((p) => p.reparto === filtroReparto),
    [profili, filtroReparto],
  );

  const profiliIds = useMemo(() => new Set(profili.map((p) => p.id)), [profili]);

  const turniByCell = useMemo(() => {
    const m = new Map<string, typeof turni>();
    turni.forEach((t) => {
      const k = `${t.dipendente_id}|${t.data}`;
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    });
    m.forEach((arr) => arr.sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio)));
    return m;
  }, [turni]);

  const totali = useMemo(() => {
    const tot = turni.length;
    const pub = turni.filter((t) => t.pubblicato).length;
    return { tot, pub, bozza: tot - pub };
  }, [turni]);

  const apriTurno = (t: typeof turni[number]) => {
    setEditing({
      id: t.id,
      dipendente_id: t.dipendente_id,
      data: t.data,
      ora_inizio: t.ora_inizio.slice(0, 5),
      ora_fine: t.ora_fine.slice(0, 5),
      tipo_turno: t.tipo_turno as "mattina" | "pomeriggio" | "sera",
      location: t.location,
      note: t.note ?? "",
    });
  };

  const nuovoTurno = (dip: string, data: string, suggerito?: "mattina" | "pomeriggio" | "sera") => {
    const tipo = suggerito ?? "mattina";
    const o = DEFAULT_ORARI[tipo];
    setEditing({
      dipendente_id: dip,
      data,
      ora_inizio: o.i,
      ora_fine: o.f,
      tipo_turno: tipo,
      location: "",
      note: "",
    });
  };

  const salva = async () => {
    if (!editing) return;
    const payload = {
      dipendente_id: editing.dipendente_id,
      data: editing.data,
      ora_inizio: editing.ora_inizio,
      ora_fine: editing.ora_fine,
      tipo_turno: editing.tipo_turno,
      location: editing.location,
      note: editing.note || null,
    };
    const { error } = editing.id
      ? await supabase.from("turni").update(payload).eq("id", editing.id)
      : await supabase.from("turni").insert(payload);
    if (error) {
      toast.error("Errore salvataggio", { description: error.message });
      return;
    }
    toast.success(editing.id ? "Turno aggiornato" : "Turno creato (bozza)");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["turni-settimana"] });
  };

  const elimina = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("turni").delete().eq("id", confirmDel);
    if (error) {
      toast.error("Errore eliminazione");
      return;
    }
    toast.success("Turno eliminato");
    setEditing(null);
    setConfirmDel(null);
    qc.invalidateQueries({ queryKey: ["turni-settimana"] });
  };

  // FIX: controlla duplicati prima di copiare
  const copiaSettimana = async () => {
    // Verifica se esistono già turni nella settimana corrente
    if (turni.length > 0) {
      toast.error("Settimana non vuota", {
        description: `Ci sono già ${turni.length} turni questa settimana. Eliminali prima di copiare.`,
      });
      setCopiaOpen(false);
      return;
    }
    const settPrec = addWeeks(inizio, -1);
    const finePrec = addDays(settPrec, 6);
    const { data: source } = await supabase
      .from("turni")
      .select("*")
      .gte("data", isoData(settPrec))
      .lte("data", isoData(finePrec));
    if (!source || source.length === 0) {
      toast.info("Nessun turno nella settimana precedente");
      setCopiaOpen(false);
      return;
    }
    const nuovi = source.map((t) => ({
      dipendente_id: t.dipendente_id,
      data: format(addDays(new Date(t.data), 7), "yyyy-MM-dd"),
      ora_inizio: t.ora_inizio,
      ora_fine: t.ora_fine,
      tipo_turno: t.tipo_turno,
      location: t.location,
      note: t.note,
      pubblicato: false,
    }));
    const { error } = await supabase.from("turni").insert(nuovi);
    if (error) {
      toast.error("Errore copia turni", { description: error.message });
    } else {
      toast.success(`${nuovi.length} turni copiati come bozza`);
      qc.invalidateQueries({ queryKey: ["turni-settimana"] });
    }
    setCopiaOpen(false);
  };

  // FIX: invia notifiche in-app ai dipendenti coinvolti alla pubblicazione
  const pubblicaSettimana = async () => {
    // Trova i turni in bozza con i relativi dipendente_id univoci
    const bozzeTurni = turni.filter((t) => !t.pubblicato);
    const dipIds = Array.from(new Set(bozzeTurni.map((t) => t.dipendente_id)));

    const { error, count } = await supabase
      .from("turni")
      .update({ pubblicato: true }, { count: "exact" })
      .gte("data", isoData(inizio))
      .lte("data", isoData(fine))
      .eq("pubblicato", false);

    if (error) {
      toast.error("Errore pubblicazione", { description: error.message });
      setPubblicaOpen(false);
      return;
    }

    // Invia notifiche in-app a ciascun dipendente coinvolto
    if (dipIds.length > 0) {
      const notifiche = dipIds.map((id) => ({
        user_id: id,
        titolo: "Turni pubblicati 📅",
        descrizione: `I tuoi turni per la settimana del ${format(inizio, "dd/MM/yyyy")} sono ora disponibili.`,
        link: "/dipendente/turni",
      }));
      await supabase.from("notifiche").insert(notifiche);
    }

    toast.success(`${count ?? 0} turni pubblicati. I dipendenti sono stati notificati.`);
    qc.invalidateQueries({ queryKey: ["turni-settimana"] });
    setPubblicaOpen(false);
  };

  const salvaComeTemplate = async () => {
    if (!tplNome.trim()) {
      toast.error("Inserisci un nome");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: TemplateRow[] = turni.map((t) => ({
      dipendente_id: t.dipendente_id,
      giorno_settimana: ((getDay(new Date(t.data)) + 6) % 7),
      ora_inizio: t.ora_inizio,
      ora_fine: t.ora_fine,
      tipo_turno: t.tipo_turno,
      location: t.location,
      note: t.note,
    }));
    const { error } = await supabase.from("turni_template").insert({
      nome: tplNome.trim(),
      payload: payload as any,
      created_by: user.id,
    });
    if (error) {
      toast.error("Errore salvataggio template", { description: error.message });
    } else {
      toast.success(`Template "${tplNome}" salvato`);
      setTplNome("");
      setSalvaTplOpen(false);
      qc.invalidateQueries({ queryKey: ["turni-template"] });
    }
  };

  // FIX: filtra dipendenti inesistenti prima di inserire dal template
  const applicaTemplate = async () => {
    if (!tplSelected) return;
    const tpl = templates.find((t) => t.id === tplSelected);
    if (!tpl) return;
    const rows = (tpl.payload as unknown as TemplateRow[]) ?? [];
    if (rows.length === 0) {
      toast.info("Template vuoto");
      return;
    }
    // Filtra righe con dipendente_id ancora esistenti
    const righeValide = rows.filter((r) => profiliIds.has(r.dipendente_id));
    const saltati = rows.length - righeValide.length;
    if (righeValide.length === 0) {
      toast.error("Nessun dipendente del template è ancora attivo");
      return;
    }
    const nuovi = righeValide.map((r) => ({
      dipendente_id: r.dipendente_id,
      data: isoData(addDays(inizio, r.giorno_settimana)),
      ora_inizio: r.ora_inizio,
      ora_fine: r.ora_fine,
      tipo_turno: r.tipo_turno as "mattina" | "pomeriggio" | "sera",
      location: r.location,
      note: r.note,
      pubblicato: false,
    }));
    const { error } = await supabase.from("turni").insert(nuovi);
    if (error) {
      toast.error("Errore applicazione template", { description: error.message });
    } else {
      const msg = saltati > 0
        ? `${nuovi.length} turni applicati (${saltati} saltati: dipendenti non trovati)`
        : `${nuovi.length} turni applicati come bozza`;
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["turni-settimana"] });
    }
    setApplicaTplOpen(false);
    setTplSelected("");
  };

  const isLoading = loadingProfili || loadingTurni;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestione turni</h1>
          <p className="text-sm text-muted-foreground">
            Vista settimanale ·{" "}
            <span className="font-medium">{totali.pub}</span> pubblicati ·{" "}
            <span className="font-medium">{totali.bozza}</span> in bozza
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              if (profili.length === 0) {
                toast.info("Aggiungi prima un dipendente");
                return;
              }
              setEditing({
                dipendente_id: profili[0].id,
                data: isoData(inizio),
                ora_inizio: "09:00",
                ora_fine: "13:00",
                tipo_turno: "mattina",
                location: "",
                note: "",
              });
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nuovo turno
          </Button>
          <Button
            onClick={() => setPubblicaOpen(true)}
            disabled={totali.bozza === 0}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Send className="h-4 w-4 mr-2" /> Pubblica settimana
          </Button>
          <Button variant="outline" onClick={() => setSalvaTplOpen(true)} disabled={turni.length === 0}>
            <BookmarkPlus className="h-4 w-4 mr-2" /> Salva template
          </Button>
          <Button variant="outline" onClick={() => setApplicaTplOpen(true)} disabled={templates.length === 0}>
            <LayoutTemplate className="h-4 w-4 mr-2" /> Applica template
          </Button>
          <Button variant="outline" onClick={() => setCopiaOpen(true)}>
            <Copy className="h-4 w-4 mr-2" /> Copia settimana prec.
          </Button>
        </div>
      </div>

      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[220px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInizio(inizioSettimana())}>
          Oggi
        </Button>
        {/* NUOVO: filtro reparto griglia */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reparto:</span>
          <Select value={filtroReparto} onValueChange={setFiltroReparto}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i reparti</SelectItem>
              {reparti.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-40 shrink-0" />
                {Array.from({ length: 7 }).map((__, j) => (
                  <Skeleton key={j} className="h-10 flex-1" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-medium sticky left-0 bg-muted/40 min-w-[180px]">
                  Dipendente
                </th>
                {giorni.map((g, i) => {
                  const oggi = isoData(g) === isoData(new Date());
                  return (
                    <th
                      key={i}
                      className={`p-2 text-center font-medium min-w-[140px] ${oggi ? "bg-brand text-brand-foreground rounded-md" : ""}`}
                    >
                      <div>{GIORNI[i]}</div>
                      <div className={`text-xs ${oggi ? "text-brand-foreground/80" : "text-muted-foreground"}`}>{format(g, "dd/MM")}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profiliFiltrati.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-8">
                    {profili.length === 0 ? "Nessun dipendente registrato" : "Nessun dipendente in questo reparto"}
                  </td>
                </tr>
              )}
              {profiliFiltrati.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3 sticky left-0 bg-background font-medium">
                    <div>{p.nome} {p.cognome}</div>
                    <div className="text-xs text-muted-foreground">{p.ruolo_lavoro}</div>
                  </td>
                  {giorni.map((g) => {
                    const dataIso = isoData(g);
                    const lista = turniByCell.get(`${p.id}|${dataIso}`) ?? [];
                    const usati = new Set(lista.map((x) => x.tipo_turno));
                    const disponibili: ("mattina" | "pomeriggio" | "sera")[] =
                      (["mattina", "pomeriggio", "sera"] as const).filter((x) => !usati.has(x));
                    return (
                      <td key={dataIso} className="p-1.5 align-top">
                        {lista.length === 0 ? (
                          <button
                            onClick={() => nuovoTurno(p.id, dataIso)}
                            className="w-full rounded-md p-2 text-xs bg-turno-libero text-turno-libero-foreground text-center opacity-60 hover:opacity-100 transition"
                          >
                            Libero
                          </button>
                        ) : (
                          <div className="space-y-1">
                            {lista.map((t) => {
                              const ore = oreTraOrari(t.ora_inizio, t.ora_fine, t.data);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => apriTurno(t)}
                                  className={`w-full rounded-md p-1.5 text-left text-xs transition hover:opacity-80 relative ${COLORE_TURNO[t.tipo_turno]} ${!t.pubblicato ? "ring-2 ring-dashed ring-foreground/40" : ""}`}
                                >
                                  <div className="font-semibold capitalize flex items-center gap-1 leading-tight">
                                    <span className="truncate">{t.tipo_turno}</span>
                                    {!t.pubblicato && (
                                      <span className="text-[9px] uppercase bg-background/50 px-1 rounded">
                                        bozza
                                      </span>
                                    )}
                                    <span className="ml-auto text-[10px] opacity-70 font-normal">{ore.toFixed(1)}h</span>
                                  </div>
                                  <div className="leading-tight">{t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)}</div>
                                  {t.location && <div className="opacity-80 truncate text-[10px]">{t.location}</div>}
                                </button>
                              );
                            })}
                            {disponibili.length > 0 && (
                              <button
                                onClick={() => nuovoTurno(p.id, dataIso, disponibili[0])}
                                className="w-full rounded-md py-1 text-[10px] border border-dashed border-foreground/20 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              >
                                + {disponibili[0]}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifica turno" : "Nuovo turno"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {!editing.id && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Dipendente</Label>
                    <Select
                      value={editing.dipendente_id}
                      onValueChange={(v) => setEditing({ ...editing, dipendente_id: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {profili.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={editing.data} onChange={(e) => setEditing({ ...editing, data: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Tipo turno</Label>
                <Select
                  value={editing.tipo_turno}
                  onValueChange={(v: "mattina" | "pomeriggio" | "sera") => {
                    const o = DEFAULT_ORARI[v];
                    setEditing({ ...editing, tipo_turno: v, ora_inizio: o.i, ora_fine: o.f });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mattina">Mattina</SelectItem>
                    <SelectItem value="pomeriggio">Pomeriggio</SelectItem>
                    <SelectItem value="sera">Sera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ora inizio</Label>
                  <Input type="time" value={editing.ora_inizio} onChange={(e) => setEditing({ ...editing, ora_inizio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ora fine</Label>
                  <Input type="time" value={editing.ora_fine} onChange={(e) => setEditing({ ...editing, ora_fine: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="es. Piscina" />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {editing?.id && (
              <Button variant="destructive" onClick={() => setConfirmDel(editing.id!)} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" /> Elimina
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={salva}><Plus className="h-4 w-4 mr-1" /> Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il turno?</AlertDialogTitle>
            <AlertDialogDescription>L'azione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={elimina}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copiaOpen} onOpenChange={setCopiaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copia settimana precedente</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i turni della settimana precedente verranno duplicati su questa settimana come bozza.
              {turni.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Attenzione: ci sono già {turni.length} turni questa settimana. L'operazione verrà bloccata.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={copiaSettimana}>Copia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pubblicaOpen} onOpenChange={setPubblicaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pubblicare la settimana?</AlertDialogTitle>
            <AlertDialogDescription>
              {totali.bozza} turni in bozza diventeranno visibili ai dipendenti, che riceveranno una notifica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={pubblicaSettimana}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Pubblica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={salvaTplOpen} onOpenChange={setSalvaTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salva settimana come template</DialogTitle>
            <DialogDescription>
              Salverai {turni.length} turni della settimana corrente come template riutilizzabile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome template</Label>
            <Input value={tplNome} onChange={(e) => setTplNome(e.target.value)} placeholder="es. Estate alta stagione" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalvaTplOpen(false)}>Annulla</Button>
            <Button onClick={salvaComeTemplate}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applicaTplOpen} onOpenChange={setApplicaTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Applica template alla settimana</DialogTitle>
            <DialogDescription>
              I turni del template verranno aggiunti come bozza. I dipendenti non più attivi verranno saltati automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={tplSelected} onValueChange={setTplSelected}>
              <SelectTrigger><SelectValue placeholder="Scegli un template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}{" "}
                    <Badge variant="secondary" className="ml-2">
                      {((t.payload as unknown as TemplateRow[]) ?? []).length} turni
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicaTplOpen(false)}>Annulla</Button>
            <Button onClick={applicaTemplate} disabled={!tplSelected}>Applica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
