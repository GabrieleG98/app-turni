## Piano di costruzione

Creo una web app per gestione turni resort con Lovable Cloud (auth + database PostgreSQL + RLS).

### 1. Backend (Lovable Cloud)

**Tabelle:**
- `profiles` (id → auth.users, nome, cognome, ruolo_lavoro, reparto)
- `user_roles` (user_id, role enum: 'manager' | 'dipendente') — tabella separata per sicurezza
- `turni` (id, dipendente_id, data, ora_inizio, ora_fine, tipo_turno enum: 'mattina'|'pomeriggio'|'sera', location, note)
- `timbrature` (id, dipendente_id, data, orario_clock_in, orario_clock_out, note)

**Trigger:** auto-crea profilo al signup. **Funzione SECURITY DEFINER** `has_role()` per evitare ricorsione RLS.

**RLS:**
- Manager: full access su tutto
- Dipendente: SELECT solo i propri turni; INSERT/UPDATE solo le proprie timbrature

### 2. Auth

- Email + password (italiano)
- Primo utente registrato diventa manager (oppure assegnazione manuale via SQL); successivi default dipendente
- Route protette: `/_authenticated/*` e check ruolo per area manager

### 3. Frontend (TanStack Start, italiano)

**Layout Manager** (desktop, sidebar sinistra): Dashboard, Turni, Dipendenti, Report
**Layout Dipendente** (mobile-first): vista turni settimana + 2 pulsanti grandi clock-in/out

**Pagine:**
- `/login`, `/registrati`
- `/_authenticated/index` → redirect by role
- `/_authenticated/manager/dashboard` — settimana corrente, ore pianificate vs effettive per dipendente, filtri
- `/_authenticated/manager/turni` — griglia settimanale (righe=dipendenti, colonne=Lun-Dom), CRUD turno via dialog, copia settimana
- `/_authenticated/manager/dipendenti` — lista + dettaglio dipendente
- `/_authenticated/manager/report` — tabella settimanale + export CSV
- `/_authenticated/dipendente` — card per ogni giorno + pulsanti Inizio/Fine turno

### 4. Design system

- Sfondo bianco/grigio chiarissimo, design pulito
- Token colori turni in `styles.css`:
  - Mattina: giallo chiaro
  - Pomeriggio: arancione chiaro
  - Sera: blu scuro (testo bianco)
  - Libero: grigio chiaro
- Tipografia: Inter (semplice e leggibile)
- Sidebar shadcn per area manager; vista dipendente mobile-first con bottoni grandi

### 5. Logica ore

Calcolo ore effettive = `orario_clock_out - orario_clock_in`. Timbrature senza clock-out marcate "incomplete" e non conteggiate. Aggregazione per settimana ISO.

### 6. Funzionalità chiave

- Validazione doppio clock-in/out con messaggi italiani
- Export CSV report ore
- Copia turni settimana → settimana
- Evidenziazione discrepanza ore pianificate vs effettive

### Note tecniche

- Tutti i testi UI in italiano
- date-fns con locale `it` per formattazione date
- shadcn components (Sidebar, Dialog, Table, Card, Button)
- `has_role()` SECURITY DEFINER per check ruolo lato RLS
