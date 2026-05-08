/**
 * Logica della finestra di timbratura legata al turno.
 * Clock-in: da (ora_inizio - 5 min) a (ora_inizio + 5 min) = "available".
 * Oltre i +5 min: "late" (cliccabile, ma con badge ritardo).
 * Prima dei -5 min: "too-early".
 * Senza turno: "no-shift".
 * Turno già concluso e clock-in mai fatto: "missed".
 */
export type WindowState = "no-shift" | "too-early" | "available" | "late" | "missed";

export interface TurnoLite {
  data: string;
  ora_inizio: string;
  ora_fine: string;
}

const FIVE_MIN_MS = 5 * 60 * 1000;

export function computeWindow(
  turno: TurnoLite | null | undefined,
  now: Date = new Date(),
  freeMode: boolean = false,
): { state: WindowState; minutiRitardo: number; inizio: Date | null; fine: Date | null } {
  if (!turno) {
    if (freeMode) return { state: "available", minutiRitardo: 0, inizio: null, fine: null };
    return { state: "no-shift", minutiRitardo: 0, inizio: null, fine: null };
  }
  const inizio = new Date(`${turno.data}T${turno.ora_inizio}`);
  let fine = new Date(`${turno.data}T${turno.ora_fine}`);
  if (fine.getTime() <= inizio.getTime()) fine = new Date(fine.getTime() + 24 * 60 * 60 * 1000);
  const t = now.getTime();
  const start = inizio.getTime();
  const end = fine.getTime();
  if (t < start - FIVE_MIN_MS) return { state: freeMode ? "available" : "too-early", minutiRitardo: 0, inizio, fine };
  if (t <= start + FIVE_MIN_MS) return { state: "available", minutiRitardo: 0, inizio, fine };
  if (t > end) return { state: freeMode ? "available" : "missed", minutiRitardo: Math.floor((t - start) / 60000), inizio, fine };
  return { state: "late", minutiRitardo: Math.floor((t - start) / 60000), inizio, fine };
}

export function fmtRitardo(min: number): string {
  if (min < 60) return `+${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `+${h}h` : `+${h}h${m}m`;
}
