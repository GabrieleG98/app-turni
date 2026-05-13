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
  sera: { i: "20:00", f: "23:59" },
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

  const copiaSettimana = async () => {
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

  const pubblicaSettimana = async () => {
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

    // FIX #6: avvisa l'utente se il template include turni in bozza
    const bozzeCount = turni.filter((t) => !t.pubblicato).length;
    if (bozzeCount > 0) {
      toast.info