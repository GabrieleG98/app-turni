import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2 } from "lucide-react";
import { fmtSettimana, giorniSettimana, inizioSettimana, isoData, GIORNI } from "@/lib/date-utils";
import { addWeeks, addDays, format } from "date-fns";
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

function GestioneTurni() {
  const qc = useQueryClient();
  const [inizio, setInizio] = useState<Date>(inizioSettimana());
  const giorni = giorniSettimana(inizio);
  const fine = addDays(inizio, 6);

  const [editing, setEditing] = useState<TurnoForm | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [copiaOpen, setCopiaOpen] = useState(false);

  const { data: profili = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("cognome");
      return data ?? [];
    },
  });

  const { data: turni = [] } = useQuery({
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

  const turniMap = useMemo(() => {
    const m = new Map<string, typeof turni[number]>();
    turni.forEach((t) => m.set(`${t.dipendente_id}|${t.data}`, t));
    return m;
  }, [turni]);

  const apri = (dip: string, data: string) => {
    const esistente = turniMap.get(`${dip}|${data}`);
    if (esistente) {
      setEditing({
        id: esistente.id,
        dipendente_id: esistente.dipendente_id,
        data: esistente.data,
        ora_inizio: esistente.ora_inizio.slice(0, 5),
        ora_fine: esistente.ora_fine.slice(0, 5),
        tipo_turno: esistente.tipo_turno as "mattina" | "pomeriggio" | "sera",
        location: esistente.location,
        note: esistente.note ?? "",
      });
    } else {
      setEditing({
        dipendente_id: dip,
        data,
        ora_inizio: "09:00",
        ora_fine: "13:00",
        tipo_turno: "mattina",
        location: "",
        note: "",
      });
    }
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
    toast.success(editing.id ? "Turno aggiornato" : "Turno creato");
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

  const copiaSettimana = async () => {
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
    }));
    const { error } = await supabase.from("turni").insert(nuovi);
    if (error) {
      toast.error("Errore copia turni", { description: error.message });
    } else {
      toast.success(`${nuovi.length} turni copiati`);
      qc.invalidateQueries({ queryKey: ["turni-settimana"] });
    }
    setCopiaOpen(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestione turni</h1>
          <p className="text-sm text-muted-foreground">Vista settimanale</p>
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
          <Button variant="outline" onClick={() => setCopiaOpen(true)}>
            <Copy className="h-4 w-4 mr-2" /> Copia settimana precedente
          </Button>
        </div>
      </div>

      <Card className="p-4 flex items-center gap-3">
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
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left p-3 font-medium sticky left-0 bg-muted/40 min-w-[180px]">
                Dipendente
              </th>
              {giorni.map((g, i) => (
                <th key={i} className="p-2 text-center font-medium min-w-[140px]">
                  <div>{GIORNI[i]}</div>
                  <div className="text-xs text-muted-foreground">{format(g, "dd/MM")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profili.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">
                  Nessun dipendente registrato
                </td>
              </tr>
            )}
            {profili.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-3 sticky left-0 bg-background font-medium">
                  <div>{p.nome} {p.cognome}</div>
                  <div className="text-xs text-muted-foreground">{p.reparto}</div>
                </td>
                {giorni.map((g) => {
                  const dataIso = isoData(g);
                  const t = turniMap.get(`${p.id}|${dataIso}`);
                  return (
                    <td key={dataIso} className="p-1.5">
                      <button
                        onClick={() => apri(p.id, dataIso)}
                        className={`w-full rounded-md p-2 text-left text-xs transition hover:opacity-80 ${
                          t
                            ? COLORE_TURNO[t.tipo_turno]
                            : "bg-turno-libero text-turno-libero-foreground"
                        }`}
                      >
                        {t ? (
                          <>
                            <div className="font-semibold capitalize">{t.tipo_turno}</div>
                            <div>{t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)}</div>
                            {t.location && <div className="opacity-80 truncate">{t.location}</div>}
                          </>
                        ) : (
                          <div className="text-center opacity-60">Libero</div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifica turno" : "Nuovo turno"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
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
              Tutti i turni della settimana precedente verranno duplicati su questa settimana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={copiaSettimana}>Copia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
