## 1. Più turni nello stesso giorno (manager + notifiche)

**File principale: `src/routes/manager.turni.tsx`**

Oggi la griglia mostra 1 cella per `dipendente × giorno` e quindi 1 solo turno. Cambio così:

- Sostituisco la logica `turniMap` (Map a singolo valore) con `turniByCell` (Map → array di turni). Ogni cella della griglia diventa una **stack verticale** con tutti i turni di quel giorno per quel dipendente, ognuno cliccabile per modifica.
- In ogni cella aggiungo in basso un piccolo pulsante **"+ Aggiungi"** che apre il dialog di nuovo turno già pre-compilato con dipendente/data.
- Il dialog "Nuovo / Modifica turno" resta uguale ma non assume più che esista un solo turno per giorno: l'`apri()` su una cella vuota apre creazione, il click su un turno esistente apre la modifica di quel turno specifico.
- Layout: ogni turno è una "pill" colorata per fascia (mattina/pomeriggio/sera) con orario + ore totali (vedi punto 5). Le pill sono impilate verticalmente con `gap-1` per restare leggibili anche con 3 turni.

**Notifiche pubblicazione + modifiche:**

Esiste già `notify_turno_pubblicato` (INSERT + UPDATE da non-pubblicato → pubblicato). Aggiungo una funzione `notify_turno_modificato` che notifica al dipendente quando un turno **già pubblicato** viene modificato (orari/data/tipo) o eliminato. Trigger su UPDATE e DELETE della tabella `turni`. Migrazione SQL.

## 2. Pulsante Clock-in / Clock-out sempre accessibile

Aggiungo nella **bottom nav del dipendente** (`src/components/dipendente-bottom-nav.tsx`) un pulsante centrale grande "Timbra" che:

- Se non hai ancora timbrato → avvia clock-in (stessa logica di `dipendente.index.tsx`).
- Se sei in turno → avvia clock-out.
- Mostra lo stato corrente (verde = in turno, grigio = fuori turno).

Estraggo la logica clock-in/out in un hook `useTimbratura()` riutilizzabile (`src/hooks/use-timbratura.ts`) per non duplicare codice tra home e bottom nav.

## 3. Esporta in Excel (.xlsx) invece che CSV

**File: `src/routes/manager.report.tsx`**

- Installo `xlsx` (`bun add xlsx`).
- Sostituisco `esportaCSV` con `esportaExcel`: genera un workbook con header in grassetto, colonne con larghezza adeguata, formattazione numeri (ore con 2 decimali), titolo della settimana nella prima riga.
- Cambio l'etichetta del bottone in "**Esporta Excel**" e l'icona resta `Download`.
- Nome file: `report-ore-{settimana}.xlsx`.

## 4. Link di invito brandizzato

- Creo una nuova route alias: `src/routes/unisciti.$token.tsx` (oppure `src/routes/join.tsx`) che renderizza la pagina di registrazione esistente. URL pubblico: **`/unisciti-4fun`** (path leggibile, in italiano, in linea col progetto).
- Lascio `/registrati` come fallback per retrocompatibilità.
- Nel manager, aggiungo nella pagina dipendenti un **bottone "Copia link di invito"** che copia negli appunti l'URL completo del progetto + `/unisciti-4fun`. Uso `window.location.origin` così il link riflette automaticamente il dominio pubblicato (es. dominio custom) senza riferimenti a "lovableproject".

## 5. Ore schedulate visibili dentro il turno

Nella griglia `manager.turni.tsx` e nella card di `dipendente.turni.tsx`:

- Calcolo le ore con `oreTraOrari(t.ora_inizio, t.ora_fine, t.data)` (già disponibile in `src/lib/date-utils.ts`).
- Le mostro in basso a destra del turno con stile **chiaro ma leggibile**: testo piccolo (`text-[10px]`), opacità ridotta (`opacity-70`) su sfondo trasparente, es. `4.0h`. Mantiene il design pulito ma è visibile.

## File toccati

- `src/routes/manager.turni.tsx` — multi-turni per giorno + ore visibili
- `src/routes/dipendente.turni.tsx` — ore visibili
- `src/routes/manager.report.tsx` — export Excel
- `src/routes/manager.dipendenti.index.tsx` — bottone "Copia link invito"
- `src/components/dipendente-bottom-nav.tsx` — pulsante Timbra
- `src/hooks/use-timbratura.ts` — nuovo hook condiviso
- `src/routes/unisciti-4fun.tsx` — nuovo alias di registrazione
- Migrazione SQL: trigger `notify_turno_modificato` su UPDATE/DELETE di `turni` pubblicati
- `package.json` — dipendenza `xlsx`

## Note tecniche

- La tabella `turni` non ha vincolo di unicità su `(dipendente_id, data)`, quindi più turni per giorno funzionano già lato DB — il blocco era solo nella UI.
- Le notifiche realtime arrivano già al dipendente via tabella `notifiche` + canale realtime.
- Per le notifiche con app **chiusa** servirebbero le Web Push (Service Worker + VAPID): non incluse qui, da pianificare a parte se ti serve.
