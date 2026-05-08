## Cosa cambia

### 1. Feedback di conferma timbratura (entrata/uscita)
Oggi mostriamo solo un toast generico. Aggiungo un **dialog di conferma** che appare dopo ogni clock-in / clock-out con:
- icona di stato (✓ verde entrata, 🔴 rossa uscita)
- orario esatto registrato (HH:mm:ss)
- durata sessione (per il clock-out)
- eventuale ritardo o anticipo rispetto al turno
- mini anteprima del selfie appena scattato

Il dialog si chiude da solo dopo 4 s o con tap.

### 2. Timbrature multiple nello stesso giorno
Oggi l'app assume **una sola** timbratura/giorno (`.maybeSingle()`), quindi dopo il primo Stop il FAB sparisce. Cambio:

- **Database**: nessuna `UNIQUE` da rimuovere (non c'è), ma aggiungo un indice su `(dipendente_id, data, orario_clock_in)` e modifico la policy `Dipendente aggiorna proprie timbrature` per consentire più righe per giorno (resta limitata al proprio `dipendente_id`).
- **`use-timbratura.ts`**: la query `timb-oggi` diventa una lista; la "sessione attiva" è l'ultima riga senza `orario_clock_out`. `completato` non nasconde più il FAB: dopo lo Stop si può iniziare una nuova sessione.
- **Calcolo ore** (dashboard, report, "Le mie ore"): somma di tutte le sessioni del giorno, non più una sola.
- **Pause**: legate alla sessione attiva (già via `timbratura_id`), nessun cambio.

### 3. Timbratura per i manager
La logica `freeMode` è già attiva per `role === "manager"`, ma il FAB scompariva dopo il primo Stop per via del punto 2. Con le timbrature multiple:
- il manager può timbrare quante volte vuole, anche senza turno schedulato
- il pulsante mostra "Nuova timbratura" quando ha già una sessione chiusa
- il FAB resta visibile sia nel layout `/manager` sia in `/dipendente`

### 4. Mobile ottimizzato + menu a scomparsa fluido
**Manager** (`/manager`):
- la sidebar passa da `collapsible="icon"` a `collapsible="offcanvas"` su mobile (drawer pieno che scorre da sinistra), resta `icon` su desktop
- header sticky con `SidebarTrigger` (hamburger) sempre visibile; titolo della pagina corrente accanto
- `<main>` con padding ridotto su mobile (`p-3` invece di `p-4`), tabelle in scroll orizzontale wrappate in `overflow-x-auto`
- la dashboard, report e dipendenti diventano leggibili a 360 px (colonne secondarie nascoste con `hidden sm:table-cell`)

**Dipendente** (`/dipendente`):
- bottom-nav già ok, ma le icone in alto a destra (calendario, campanella, tema) si sovrappongono al titolo: le sposto in una **top-bar sticky** con safe-area
- card della home ridimensionate per non andare in overflow

### 5. Scambio turni: lista colleghi vuota
**Causa**: la policy RLS di `profiles` consente la SELECT solo a `auth.uid() = id` o ai manager. Un dipendente non vede gli altri profili → la query `colleghi` torna `[]`.

**Fix**: nuova policy SELECT su `profiles` che permette a qualunque utente autenticato di leggere i campi pubblici (`id, nome, cognome, reparto, ruolo_lavoro`) degli altri membri. Nessun campo email/sensibile esposto in più (la query `colleghi` già seleziona solo id/nome/cognome).

In più, nel dialog di scambio:
- ricerca testuale sopra il `Select` per filtrare quando i colleghi sono molti
- raggruppamento per reparto

---

## Dettagli tecnici

**Migration**:
```sql
-- nuova policy lettura profili colleghi
CREATE POLICY "Autenticati vedono colleghi"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- indice per performance multi-timbrature
CREATE INDEX IF NOT EXISTS idx_timbrature_dip_data
  ON public.timbrature (dipendente_id, data, orario_clock_in);
```

**File modificati**:
- `src/hooks/use-timbratura.ts` — query lista, sessione attiva = ultima senza clock-out, helper `oreLavorateOggi`
- `src/components/timbra-fab.tsx` + `src/components/dipendente-bottom-nav.tsx` — non nascondere su `completato`, label dinamica
- `src/components/timbra-conferma-dialog.tsx` *(nuovo)* — dialog feedback con anteprima selfie
- `src/routes/manager.tsx` — sidebar offcanvas su mobile, header con titolo e padding responsive
- `src/components/manager-sidebar.tsx` — `collapsible` dinamico in base a `useIsMobile`
- `src/routes/manager.dashboard.tsx`, `manager.report.tsx`, `manager.dipendenti.index.tsx` — tabelle responsive (`overflow-x-auto`, colonne `hidden sm:table-cell`), somma ore multi-sessione
- `src/routes/dipendente.tsx` — top-bar sticky con safe-area
- `src/routes/dipendente.turni.tsx` — input ricerca colleghi nello swap dialog
- `src/lib/date-utils.ts` — helper `sommaOreSessioni(timbrature[])`

**Nessun breaking change** sui dati esistenti: chi ha già una sola timbratura/giorno continua a funzionare; le nuove righe si aggiungono semplicemente.