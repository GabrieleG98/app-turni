import { startOfWeek, endOfWeek, addDays, format, parseISO, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";

export const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function inizioSettimana(d: Date = new Date()): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function fineSettimana(d: Date = new Date()): Date {
  return endOfWeek(d, { weekStartsOn: 1 });
}

export function giorniSettimana(inizio: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(inizio, i));
}

export function fmtData(d: Date | string, formato = "dd/MM/yyyy"): string {
  const dt = typeof d === "string" ? parseISO(d) : d;
  return format(dt, formato, { locale: it });
}

export function fmtSettimana(inizio: Date): string {
  const fine = addDays(inizio, 6);
  return `${format(inizio, "d MMM", { locale: it })} – ${format(fine, "d MMM yyyy", { locale: it })}`;
}

export function isoData(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function oreTraOrari(inizio: string, fine: string, dataIso: string): number {
  const a = new Date(`${dataIso}T${inizio}`);
  const b = new Date(`${dataIso}T${fine}`);
  let mins = differenceInMinutes(b, a);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function oreTimbratura(inizio: string, fine: string | null): number | null {
  if (!fine) return null;
  const mins = differenceInMinutes(new Date(fine), new Date(inizio));
  return mins / 60;
}

export function fmtOre(n: number): string {
  return `${n.toFixed(1)} h`;
}

export interface TimbraturaLite {
  orario_clock_in: string;
  orario_clock_out: string | null;
}

/** Somma le ore di tutte le sessioni di timbratura (solo sessioni chiuse). */
export function sommaOreSessioni(rows: TimbraturaLite[]): number {
  return rows.reduce((s, r) => s + (oreTimbratura(r.orario_clock_in, r.orario_clock_out) ?? 0), 0);
}
