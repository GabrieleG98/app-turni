import { supabase } from "@/integrations/supabase/client";

export type Coords = { lat: number; lng: number };

export function getCurrentPosition(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export async function uploadSelfie(
  userId: string,
  file: File,
  kind: "in" | "out"
): Promise<string | null> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${kind}.${ext}`;
  const { error } = await supabase.storage
    .from("timbrature-foto")
    .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
  if (error) {
    console.error("upload selfie error", error);
    return null;
  }
  return path;
}

export async function getSelfieSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("timbrature-foto")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Calcola minuti di pausa totali (chiuse) per una timbratura. */
export function minutiPause(pause: { inizio: string; fine: string | null }[]): number {
  return pause.reduce((tot, p) => {
    if (!p.fine) return tot;
    return tot + (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 60000;
  }, 0);
}

/** Calcola straordinario in ore (negativo = sotto-turno). */
export function calcStraordinario(
  oreLavorate: number,
  turno: { ora_inizio: string; ora_fine: string; data: string } | null
): number {
  if (!turno) return 0;
  const a = new Date(`${turno.data}T${turno.ora_inizio}`);
  const b = new Date(`${turno.data}T${turno.ora_fine}`);
  let mins = (b.getTime() - a.getTime()) / 60000;
  if (mins < 0) mins += 24 * 60;
  const orePreviste = mins / 60;
  return oreLavorate - orePreviste;
}
