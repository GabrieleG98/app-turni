import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isoData } from "@/lib/date-utils";
import { getCurrentPosition, uploadSelfie } from "@/lib/timbrature-utils";
import { computeWindow, type WindowState } from "@/lib/timbra-window";
import { toast } from "sonner";

export function useTimbratura() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const oggi = isoData(new Date());

  // tick ogni 30s per aggiornare la finestra/ritardo
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

  const { data: timbOggi } = useQuery({
    enabled: !!user,
    queryKey: ["timb-oggi", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature")
        .select("*")
        .eq("data", oggi)
        .maybeSingle();
      return data;
    },
  });

  const { data: pause = [] } = useQuery({
    enabled: !!timbOggi,
    queryKey: ["pause-oggi", timbOggi?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pause")
        .select("*")
        .eq("timbratura_id", timbOggi!.id)
        .order("inizio", { ascending: true });
      return data ?? [];
    },
  });

  const pausaAperta = pause.find((p) => !p.fine);
  const inTurno = !!timbOggi && !timbOggi.orario_clock_out;
  const completato = !!timbOggi?.orario_clock_out;

  const win = computeWindow(turnoOggi, now);
  // Se sono già in turno, il bottone serve a fare clock-out → sempre disponibile.
  const canClock: boolean = inTurno
    ? true
    : completato
    ? false
    : win.state === "available" || win.state === "late";
  const windowState: WindowState = win.state;
  const minutiRitardo = win.minutiRitardo;

  const clockIn = async (file: File | null) => {
    if (!user) return;
    if (timbOggi) {
      toast.error("Hai già iniziato il turno oggi");
      return;
    }
    setBusy(true);
    try {
      const coords = await getCurrentPosition();
      let foto_in_url: string | null = null;
      if (file) foto_in_url = await uploadSelfie(user.id, file, "in");
      const { error } = await supabase.from("timbrature").insert({
        dipendente_id: user.id,
        data: oggi,
        orario_clock_in: new Date().toISOString(),
        lat_in: coords?.lat ?? null,
        lng_in: coords?.lng ?? null,
        foto_in_url,
      });
      if (error) throw error;
      toast.success(minutiRitardo > 0 ? `Turno iniziato con ${minutiRitardo} min di ritardo` : "Turno iniziato 🎉");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async (file: File | null) => {
    if (!timbOggi) {
      toast.error("Non hai ancora iniziato il turno");
      return;
    }
    if (timbOggi.orario_clock_out) {
      toast.error("Turno già chiuso");
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
      const { error } = await supabase
        .from("timbrature")
        .update({
          orario_clock_out: new Date().toISOString(),
          lat_out: coords?.lat ?? null,
          lng_out: coords?.lng ?? null,
          foto_out_url,
        })
        .eq("id", timbOggi.id);
      if (error) throw error;
      toast.success("Turno terminato");
      qc.invalidateQueries({ queryKey: ["timb-oggi"] });
    } catch (e: any) {
      toast.error("Errore", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return {
    timbOggi,
    pause,
    pausaAperta,
    inTurno,
    completato,
    busy,
    clockIn,
    clockOut,
    turnoOggi,
    windowState,
    minutiRitardo,
    canClock,
  };
}
