# Piano: completamento "Schedule Timi Ama 4Fun" (PWA installabile + funzionalità Homebase)

Mantengo la PWA installabile come già fatto (manifest, icone, theme-color, meta `apple-mobile-web-app-*`). Procedo con le epiche funzionali.

## Epica 2 — Scheduling avanzato (manager)

- **Vista settimana** in `/manager/turni`: griglia dipendenti × giorni
  - Tap cella vuota → dialog crea turno (orario, tipo, location, note)
  - Tap turno esistente → modifica/elimina
  - Drag & drop su desktop per spostare un turno; su mobile menù "Sposta a…"
  - Selettore settimana precedente/successiva
- **Template settimanali**: tabella `turni_template` (nome + payload JSON), bottoni "Salva come template" e "Applica template"
- **Pubblicazione settimana**: campo `pubblicato` su `turni`; i dipendenti vedono solo i pubblicati; bottone "Pubblica settimana"
- **Swap turni**: tabella `turno_swap_requests` (turno, da, a, stato); lista pendenti nella dashboard manager con approva/rifiuta
- **Disponibilità dipendenti**: tabella `disponibilita` (giorno_settimana, fascia, tipo); pagina dipendente "Le mie disponibilità"; avviso al manager se assegna fuori fascia

## Epica 3 — Time clock evoluto (dipendente)

- **GPS opzionale** alla timbratura: salvo `lat/lng` via Geolocation API
- **Foto opzionale** (selfie): `<input capture="user">`, upload su bucket Storage `timbrature-foto`, link salvato sulla timbratura
- **Pause**: tabella `pause` (timbratura_id, inizio, fine) con bottoni "Inizia/Termina pausa"
- **Straordinari**: differenza ore lavorate vs pianificate, mostrata in timbratura e report
- Aggiungo `lat`, `lng`, `foto_url` a `timbrature`
- Nuovo bucket `timbrature-foto` con RLS (dipendente upload propri, manager lettura tutti)

## Epica 4 — Team communication

- **Tabelle**: `chat_canali` (nome, tipo: gruppo/diretto/annunci), `chat_membri`, `chat_messaggi`
- **Realtime** Supabase su `chat_messaggi` (postgres_changes)
- **UI dipendente** (`/dipendente/chat`): lista canali + conversazione mobile con input in fondo
- **UI manager**: crea canali, aggiunge membri, sezione "Annunci" (read-only per dipendenti, scrive solo manager)
- RLS: vedi/scrivi solo nei canali in cui sei membro

## Epica 5 — Task management

- **Tabelle**: `task_template` (titolo, descrizione, ruolo/reparto, ricorrenza giornaliera/settimanale), `task_assegnati` (template, dipendente, data, completato, completato_at)
- **Generazione automatica** dei task del giorno via server function al primo accesso
- **UI dipendente** (`/dipendente/tasks`): checklist con tap-per-completare
- **UI manager**: CRUD template + vista "completamento di oggi" per dipendente/reparto

## Epica 6 — Rifiniture trasversali

- **Inviti dipendenti** via email: server function admin che crea utente + ruolo dipendente + magic link
- **Notifiche in-app**: bell icon con contatore (turno pubblicato, nuovo messaggio, nuovo task)
- **Report manager esteso**: ore lavorate, straordinari, assenze, completamento task, export CSV
- **Dark mode** automatica via `prefers-color-scheme` (token già pronti)

## Architettura tecnica

- Tutta la logica server in `createServerFn` con `requireSupabaseAuth` (no Edge Functions)
- Realtime chat: client browser Supabase + canali postgres_changes
- Storage: bucket `timbrature-foto` con RLS
- Migration SQL in step separati per epica → ogni epica testabile da sola
- PWA: resta come già configurata, niente service worker custom

## Ordine di consegna

1. **Epica 2** — scheduling avanzato (drag & drop, template, pubblicazione, swap, disponibilità)
2. **Epica 3** — time clock evoluto (GPS, foto, pause, straordinari)
3. **Epica 4** — chat realtime
4. **Epica 5** — task & checklist
5. **Epica 6** — rifiniture (inviti, notifiche in-app, report CSV, dark mode)

A fine di ogni epica mi fermo, ti faccio provare e poi proseguo con la successiva.
