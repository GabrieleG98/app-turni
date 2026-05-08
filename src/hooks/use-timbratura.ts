import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isoData, oreTimbratura, sommaOreSessioni } from "@/lib/date-utils";
import { getCurrentPosition, uploadSelfie } from "@/lib/timbrature-utils";
import { computeWindow, type WindowState } from "@/lib/timbra-window";
import { toast } from "sonner";
import type { TimbraConferma } from "@/components/timbra-conferma-dialog";

export function useTimbratura() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const isManagerFree = role === "manager";
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [conferma, setConferma] = useState<TimbraConferma | null>(null);
  const oggi = isoData(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: turnoOggi } = useQuery({
    enabled: !!user,
    queryKey: ["mio-turno-oggi", oggi, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni")
        .select("*")
        .eq("dipendente_id", user!.id)
        .eq("data", oggi)
        .eq("pubblicato", true)
        .maybeSingle();
      return data;
    },
  });

  // Lista di tutte le sessioni di oggi (per supportare timbrature multiple).
  const { data: sessioni = [] } = useQuery({
    enabled: !!user,
    queryKey: ["timb-oggi", oggi, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .eq("dipendente_id", user!.id)
        .eq("data", oggi)
        .order("orario_clock_in", { ascending: true });
      return data ?? [];
    },
  });

  // Sessione "attiva" = ultima riga senza clock_out, se esiste.
  const sessioneAttiva = sessioni.find((s) => !s.orario_clock_out) ?? null;
  // Per compatibilità con la home: l'ultima sessione (attiva o appena chiusa).
  const timbOggi = sessioneAttiva ?? sessioni[sessioni.length - 1] ?? null;

  const { data: pause = [] } = useQuery({
    enabled: !!sessioneAttiva,
    queryKey: ["pause-oggi", sessioneAttiva?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pause")
        .select("*")
        .eq("timbratura_id", sessioneAttiva!.id)
        .order("inizio", { ascending: true });
      return data ?? [];
    },
  });

  const pausaAperta = pause.find((p) => !p.fine);
  const inTurno = !!sessioneAttiva;
  const haGiaSessioni = sessioni.length > 0;
  const oreLavorateOggi = sommaOreSessioni(sessioni);

  const win = computeWindow(turnoOggi, now, isManagerFree);
  // canClock: in turno → sempre (per chiudere); altrimenti dipende dalla finestra.
  // In freeMode (manager) o senza turno + freeMode già gestito da computeWindow.
  const canClock: boolean = inTurno
    ? true
    : win.state === "available" || win.state === "late";
  const windowState: WindowState = win.state;
  const minutiRitardo = win.minutiRitardo;

  const clockIn = useCallback(async (file: File | null) => {
    if (!user) return;
    if (sessioneAttiva) {
      toast.error("Hai una sessione già aperta");
      return;
    }
    setBusy(true);
    try {
      const coords = await getCurrentPosition();
      let foto_in_url: string | null = null;
      if (file) foto_in_url = await uploadSelfie(user.id, file, "in");
      const orario = new Date();
      const { error } = await supabase.from("timbrature").insert({
        dipendente_id: user.id,
        data: oggi,
        orario_clock_in: orario.toISOString(),
        lat_in: coords?.lat ?? null,
        lng_in: coords?.lng ?? null,
        foto_in_url,
      });
      if (error) throw error;
      setConferma({
        tipo: "in",
        orario,
        fotoUrl: foto_in_url,
        ritardoMin: minutiRitardo,
      });
      toast.success(minutiRitardo > 0 ? `Entrata con ${minutiRitardo} min di ritardo` : "Entrata timbrata");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  }, [user, sessioneAttiva, oggi, minutiRitardo, qc]);

  const clockOut = useCallback(async (file: File | null) => {
    if (!sessioneAttiva) {
      toast.error("Nessuna sessione aperta");
      return;
    }
    if (pausaAperta) {
      toast.error("Chiudi prima la pausa in corso");
      return;
    }
    setBusy(true);
    try {
      const coords = await getCurrentPosition();
      let foto_out_url: string | null = null;
      if (file && user) foto_out_url = await uploadSelfie(user.id, file, "out");
      const orario = new Date();
      const { error } = await supabase
        .from("timbrature")
        .update({
          orario_clock_out: orario.toISOString(),
          lat_out: coords?.lat ?? null,
          lng_out: coords?.lng ?? null,
          foto_out_url,
        })
        .eq("id", sessioneAttiva.id);
      if (error) throw error;
      const ore = oreTimbratura(sessioneAttiva.orario_clock_in, orario.toISOString());
      setConferma({
        tipo: "out",
        orario,
        oreSessione: ore,
        fotoUrl: foto_out_url,
      });
      toast.success("Uscita timbrata");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  }, [sessioneAttiva, pausaAperta, user, qc]);

  const closeConferma = useCallback(() => setConferma(null), []);

  return {
    sessioni,
    sessioneAttiva,
    timbOggi,
    pause,
    pausaAperta,
    inTurno,
    haGiaSessioni,
    oreLavorateOggi,
    busy,
    clockIn,
    clockOut,
    turnoOggi,
    windowState,
    minutiRitardo,
    canClock,
    conferma,
    closeConferma,
    // backward-compat
    completato: false,
  };
}
