
# Piano modifiche

## 1. Pulsante Timbra (FAB) — disponibilità legata al turno

**Regole:**
- Abilitato solo se esiste un turno pubblicato per l'utente oggi.
- Clock-in: da `ora_inizio − 5min` fino a `ora_inizio + 5min` (per evitare timbrature anticipate o tardive senza giustificazione).
- Se l'utente è in ritardo (oltre i 5 min dopo `ora_inizio`) il pulsante mostra **"In ritardo · +Xm"** in rosso e resta cliccabile (così può comunque timbrare, ma il ritardo viene registrato).
- Clock-out: sempre disponibile finché c'è una timbratura aperta.
- Se nessun turno oggi → pulsante disabilitato con tooltip "Nessun turno schedulato".
- Rimosso lo stato "Fatto" sul FAB dell'owner: una volta completato, il FAB sparisce del tutto (per tutti).

**Indicatore ritardo:**
- Calcolato come `now() − turno.ora_inizio` se positivo.
- Mostrato in rosso (`text-destructive font-bold`) sia:
  - sulla home dipendente (`dipendente.index.tsx`, scheda turno di oggi),
  - sulla pagina manager dipendenti (lista chi è in ritardo oggi),
  - nella card "Stato attuale" della dashboard manager.

## 2. Richieste di correzione timbratura

Nuova tabella `timbrature_correzioni` con: `timbratura_id` (nullable, per giorni senza timbratura), `dipendente_id`, `data`, `tipo` (`mancata_clock_in` | `mancata_clock_out` | `orario_errato` | `altro`), `orario_richiesto_in`, `orario_richiesto_out`, `motivo`, `status` (`pending` | `approved` | `rejected`), `decisione_di`, `decisione_at`, `note_manager`.

**Flusso:**
- Dipendente: bottone "Segnala errore timbratura" sulla home e sulla pagina turni → dialog per descrivere correzione.
- Manager: nuova voce sidebar **"Correzioni"** con elenco pending; può **Approva** (applica la correzione alla timbratura, creandone una se manca), **Rifiuta**, o **Modifica e approva**.
- Notifica automatica al dipendente quando la richiesta viene decisa.

**RLS:** dipendente vede/crea solo le proprie; manager gestisce tutte.

## 3. Owner: sezione "Timbra per…"

- Solo l'owner (`is_owner(auth.uid())`) vede una nuova voce sidebar **"Timbra per…"** (`/manager/timbra-per`).
- Pagina con elenco di tutti i dipendenti+manager con turno oggi: per ciascuno vede stato corrente (Non iniziato / In turno / Concluso / In ritardo +Xm) e bottoni clock-in / clock-out.
- L'owner può forzare l'orario manualmente (campo opzionale, default `now()`).
- Le scritture passano per un nuovo server function `clockForUser` che usa `supabaseAdmin` (bypassa RLS) e verifica `is_owner` lato server.

## 4. Manager possono timbrare il proprio turno

Già supportato dal `TimbraFAB` nel layout manager (regole identiche al dipendente). Le nuove regole della finestra di disponibilità (punto 1) si applicheranno anche ai manager — incluso te — quindi avrai bisogno di un turno pubblicato per timbrare il tuo turno via FAB. Per timbrare per altri, useremo "Timbra per…" (punto 3).

## 5. Calendario eventi — categorie personalizzabili (solo owner)

Nuova tabella `evento_categorie`: `id`, `nome`, `colore`, `ordine`, `created_by`.

**Migrazione dati:**
- Pre-popolata con le 4 categorie attuali (matrimonio, riunione, evento_privato, altro) con i colori già in uso.
- `eventi_speciali.categoria_id` (uuid) sostituisce/affianca l'enum esistente. Manteniamo l'enum per retro-compatibilità ma il dialog userà la nuova tabella.

**UI:**
- Nuova sezione "Legenda categorie" sopra il calendario eventi, visibile a tutti.
- Solo l'owner vede pulsanti **+ Aggiungi**, **Modifica**, **Elimina** sulle categorie (nome + color picker).
- Manager non-owner: vedono la legenda in sola lettura (consistente col fatto che possono creare eventi ma non gestire la tassonomia).
- Il dialog evento usa Select con la lista dinamica.

**RLS:** SELECT a tutti gli authenticated; INSERT/UPDATE/DELETE solo se `is_owner(auth.uid())`.

---

## File coinvolti

**Nuovi:**
- `supabase/migrations/...sql` — `timbrature_correzioni`, `evento_categorie`, RLS, seed categorie default, trigger notifica decisione.
- `src/lib/timbra-window.ts` — helper `getTimbraturaWindow(turno)` con stato (`too-early` | `available` | `late` | `closed`) e minuti di ritardo.
- `src/routes/manager.timbra-per.tsx` — pagina owner-only.
- `src/routes/manager.correzioni.tsx` — coda richieste.
- `src/components/correzione-dialog.tsx` — dialog dipendente per richiesta.
- `src/components/categoria-manager.tsx` — gestione categorie nel calendario.
- `src/lib/clock-for-user.functions.ts` — server function admin per timbrare per altri (verifica owner).

**Modificati:**
- `src/components/timbra-fab.tsx` — applica finestra, mostra ritardo in rosso, sparisce quando completato.
- `src/hooks/use-timbratura.ts` — espone `turnoOggi`, `windowState`, `minutiRitardo`.
- `src/routes/dipendente.index.tsx` — badge ritardo rosso, bottone "Segnala errore".
- `src/routes/dipendente.turni.tsx` — bottone "Segnala errore" per turni passati.
- `src/routes/manager.dipendenti.index.tsx` — colonna stato/ritardo oggi.
- `src/routes/manager.dashboard.tsx` — widget ritardatari di oggi.
- `src/components/manager-sidebar.tsx` — voci "Correzioni" e (solo owner) "Timbra per…".
- `src/components/evento-dialog.tsx` + `src/routes/calendario.tsx` — usano `evento_categorie`.

**Note tecniche:**
- L'owner si identifica via `is_owner(auth.uid())` (funzione DB già esistente). In UI lo otteniamo con un `useQuery` su `select is_owner` (RPC) e cache nel context auth.
- La finestra ±5min usa l'orario locale del client; i record in DB restano in UTC.
