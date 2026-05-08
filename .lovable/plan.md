# Sidebar dipendente + Task evolute

## 1. Layout dipendente con sidebar (no bottom nav)

**Nuovo `src/components/dipendente-sidebar.tsx`**: speculare a `manager-sidebar.tsx` ma con voci dipendente (Oggi, Turni, Calendario, Disponibilità, Tasks, Chat, Profilo) + footer con nome utente e logout.

**`src/routes/dipendente.tsx` — riscrittura**:
- Avvolge tutto in `SidebarProvider` con `<DipendenteSidebar />` + area principale.
- Header sticky in alto: `SidebarTrigger` (apre il drawer su mobile, collassa su desktop) + titolo + `NotificheBell` + `ThemeToggle`.
- `<TimbraFAB />` (lo stesso usato dai manager) sempre visibile in basso a destra → mantiene l'azione di timbratura senza bottom nav.
- Rimuovo l'uso di `<DipendenteBottomNav />` e il bottone calendario floating.

**`src/components/dipendente-bottom-nav.tsx`**: cancellato.

**Padding**: rimuovo `pb-20` dal layout dato che non c'è più la barra inferiore; le pagine figlie già scrollano internamente.

## 2. Tasks: dettaglio, foto, notifiche

### Schema (migration)
- `task_template`: aggiungo `richiede_foto boolean not null default false`.
- `task_assegnati`: aggiungo `foto_url text` e `note text` (già presente `note`, riuso).
- Bucket Storage `task-foto` (privato) + RLS:
  - dipendente può `insert/select` solo cartella `{auth.uid}/...`
  - manager può `select` tutto.
- Estendo enum `notifica_tipo` con `task` (se non già presente).

### Trigger di notifica
- `notify_task_assegnato` (AFTER INSERT su `task_assegnati`): notifica `dipendente_id` con link `/dipendente/tasks`.
- `notify_task_completato` (AFTER UPDATE su `task_assegnati`, quando `completato_at` passa da NULL a valorizzato): notifica tutti i manager con titolo task + nome dipendente, link `/manager/tasks`.

### Promemoria task non completate
- Server route `src/routes/api/public/hooks/task-reminder.ts`: per ogni dipendente con task aperti del giorno, crea una notifica "Hai N task da completare".
- Cron pg_cron alle 19:00 ogni giorno (via tool insert).

### UI dipendente — `src/routes/dipendente.tasks.tsx`
- Click sulla card apre un `Dialog` di dettaglio:
  - titolo, descrizione, stato.
  - se `template.richiede_foto = true` e non completato: input file (camera) **obbligatorio** prima di chiudere.
  - se opzionale: pulsante "Aggiungi foto" facoltativo + "Segna come fatto".
  - upload foto su `task-foto/{userId}/{taskId}.jpg`, poi `update task_assegnati set completato_at=now(), foto_url=...`.
  - se già completato: mostra foto allegata (se esiste) e timestamp, con possibilità di "Riapri".

### UI manager — `src/routes/manager.tasks.tsx`
- Nel form template: nuovo `Switch` "Richiede foto a fine task".
- Sezione "Task di oggi": nuova card che lista task assegnati del giorno con stato + thumbnail foto (se presente, click per ingrandire). Permette di filtrare per dipendente.

### Componenti
- Nuovo `src/components/task-dettaglio-dialog.tsx` riutilizzabile (riceve task + flag richiede_foto, gestisce upload e completamento).

## 3. File toccati

**Creati**: `dipendente-sidebar.tsx`, `task-dettaglio-dialog.tsx`, `api/public/hooks/task-reminder.ts`, migration SQL.

**Modificati**: `dipendente.tsx`, `dipendente.tasks.tsx`, `manager.tasks.tsx`, `notifiche-bell.tsx` (icona per tipo `task`).

**Eliminati**: `dipendente-bottom-nav.tsx`.

## Note tecniche
- Il FAB timbra (`TimbraFAB`) è già responsive e non interferisce con la sidebar.
- Sidebar usa `collapsible="offcanvas"` di default → su mobile è un drawer che scompare completamente, su desktop si può collassare a icone.
- Le notifiche sfruttano la tabella `notifiche` già esistente e il `NotificheBell` già montato nell'header.
- La foto è obbligatoria solo quando il template ha `richiede_foto=true`; il pulsante "Completa" resta disabilitato finché non viene scattata.
