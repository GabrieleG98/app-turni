
# Piano: trasformazione in stile "Homebase"

Obiettivo: portare l'app attuale (manager + dipendenti, turni base + clock-in/out) al livello di Homebase, mantenendo l'italiano e lo stack Lovable Cloud + TanStack Start. Stile visivo Homebase (verde acceso, mobile-first, playful) e installabile come PWA.

Lavoro suddiviso in 5 epiche indipendenti, ciascuna rilasciabile in modo incrementale.

---

## 1. Re-skin in stile Homebase + PWA

- Nuovo design system in `src/styles.css`:
  - Primario verde Homebase (`oklch` ~ verde brillante), accento arancio caldo, sfondi quasi-bianchi, bordi morbidi (radius 14–18px), ombre soft.
  - Tipografia: heading "Sora" o "Manrope", body "Inter".
  - Token turni rivisti: mattina giallo soft, pomeriggio arancio, sera blu notte, libero grigio chiaro — coerenti col verde primario.
- Rifacimento layout dipendente mobile-first: header verde con saluto + giorno, card grandi turno corrente, due bottoni enormi clock-in / clock-out, bottom-nav (Oggi · Turni · Chat · Tasks · Profilo).
- Layout manager: sidebar resta su desktop, su mobile diventa bottom-nav. Dashboard con KPI card colorate (ore pianificate, ore effettive, in turno ora, no-show).
- PWA installabile (manifest + icone). **No service worker / no offline cache** (per evitare i problemi noti nel preview Lovable). L'utente potrà fare "Aggiungi a schermata Home" da iOS/Android.

## 2. Scheduling avanzato

- **Drag & drop** turni nella griglia settimanale (libreria `@dnd-kit/core`): trascinare per spostare giorno/dipendente, duplicare con Alt.
- **Template di turno**: tabella `shift_templates` (nome, tipo, ora_inizio, ora_fine, location, colore). Pannello laterale con i template, drag dal pannello alla cella.
- **Disponibilità dipendente**: tabella `disponibilita` (dipendente_id, giorno_settimana 0–6, fascia preferita, indisponibile_da/a). Il manager le vede in overlay nella griglia; warning se assegna un turno in fascia "indisponibile".
- **Richieste di scambio turno (swap)**: tabella `swap_requests` (turno_id, da_user, a_user, stato: pending/accettato/rifiutato/approvato_manager). Flusso: dipendente A propone → dipendente B accetta → manager approva → turno riassegnato automaticamente.
- **Pubblicazione schedule**: campo `pubblicato` su `turni`. I dipendenti vedono solo turni pubblicati. Bottone "Pubblica settimana" che notifica tutti i coinvolti.

## 3. Time clock evoluto

- Estendere `timbrature` con: `clock_in_lat`, `clock_in_lng`, `clock_in_foto_url`, `clock_out_lat`, `clock_out_lng`, `clock_out_foto_url`, `pause` (jsonb array di `{inizio, fine}`), `straordinario_minuti` (calcolato).
- **Geofencing**: tabella `worksites` (nome, lat, lng, raggio_m). Al clock-in si verifica che il dipendente sia nel raggio; se fuori, si registra l'evento ma si segna `fuori_area = true` (visibile al manager).
- **Foto selfie**: scattata via `getUserMedia`, caricata su Storage bucket `clock-photos` (privato, RLS per dipendente_id).
- **Pause**: bottoni "Inizia pausa" / "Fine pausa" durante un turno aperto; tempo in pausa scalato dalle ore lavorate.
- **Straordinari**: regole semplici (oltre l'orario pianificato del turno = straordinario). Visualizzati in giallo nei report.
- **Correzione manager**: il manager può modificare/aggiungere/cancellare timbrature (già presente via RLS), con audit log `timbrature_audit`.

## 4. Team communication

- Tabelle:
  - `chat_rooms` (id, tipo: 'team' | 'reparto' | 'diretta' | 'annunci', nome, creato_da)
  - `chat_members` (room_id, user_id, ruolo)
  - `chat_messages` (room_id, autore_id, testo, allegato_url, created_at, letto_da jsonb)
- **Realtime** via Supabase Realtime sulla tabella `chat_messages`.
- Canale "Annunci" di default in cui solo i manager scrivono e tutti leggono.
- UI chat mobile-first stile Messenger/Homebase: lista conversazioni → thread con bubble, timestamp, indicatore "letto".
- Notifiche in-app (badge sul tab Chat). Push notifications fuori scope (no SW).

## 5. Task management & checklist

- Tabelle:
  - `task_lists` (nome, descrizione, ricorrenza: 'una_volta' | 'giornaliera' | 'settimanale', reparto)
  - `tasks` (lista_id, titolo, ordine, obbligatorio)
  - `task_assignments` (task_id, dipendente_id, turno_id?, data, stato: 'da_fare' | 'fatto' | 'saltato', completato_at, note)
- Manager crea liste (es. "Apertura piscina", "Chiusura ristorante") e le assegna a un reparto/turno.
- Dipendente vede nella propria home la checklist del turno corrente, spunta i task; il manager vede % completamento per turno.
- Filtro report: tasks non completati, per reparto/dipendente.

---

## Sicurezza (RLS)

Tutte le nuove tabelle replicano il pattern esistente:
- Manager (`has_role(auth.uid(), 'manager')`): ALL.
- Dipendente: SELECT/INSERT/UPDATE solo riga propria (o `chat_members.user_id = auth.uid()` per la chat).
- Storage `clock-photos`: read/write solo `dipendente_id = auth.uid()`, manager full read.
- Trigger `restrict_dipendente_timbrature_update` esteso ai nuovi campi (no auto-modifica di lat/lng/foto).

## Stack tecnico (dettagli)

- Drag & drop: `@dnd-kit/core` + `@dnd-kit/sortable`
- Realtime chat: Supabase channel `postgres_changes` su `chat_messages`
- Camera: `navigator.mediaDevices.getUserMedia` + canvas → blob → Supabase Storage
- Geo: `navigator.geolocation.getCurrentPosition`
- Date: `date-fns` con locale `it` (già presente)
- Server logic: `createServerFn` di TanStack Start (no Edge Functions)
- PWA: solo `manifest.webmanifest` + icone, niente `vite-plugin-pwa`

## Roadmap di implementazione (ordine consigliato)

1. **Re-skin + PWA manifest** (visibile subito, basso rischio)
2. **Scheduling avanzato** (drag&drop, template, pubblicazione)
3. **Time clock evoluto** (geo + foto + pause)
4. **Chat di team** (realtime)
5. **Task & checklist**
6. Disponibilità + swap turni (rifinitura scheduling)

---

## Cosa NON faremo (fuori scope, come da brief originale)

- Payroll, buste paga, tasse
- App native iOS/Android (resta web responsive + PWA installabile)
- Push notifications (richiederebbero service worker, sconsigliato in Lovable preview)
- Hiring / applicant tracking
- Integrazioni POS

Vuoi che procediamo con tutto in quest'ordine o partiamo solo dalle prime 1–2 epiche?
