## Piano modifiche

### 1. Timbratura per tutti (manager inclusi)
- Spostare il pulsante "Timbra" dalla bottom-nav del dipendente in un componente condiviso `TimbraFAB` (Floating Action Button) montato nel layout `manager.tsx` e mantenuto nella bottom-nav `dipendente`.
- Il manager vedrà il pulsante in basso a destra (FAB) su tutte le pagine `/manager/*`.
- L'hook `use-timbratura.ts` funziona già a prescindere dal ruolo (usa `auth.uid()`), e le RLS della tabella `timbrature` permettono già a qualsiasi utente autenticato di inserire/aggiornare le proprie timbrature.

### 2. Giorno corrente evidenziato in Gestione Turni
- In `src/routes/manager.turni.tsx`, nelle intestazioni di colonna della griglia turni, applicare uno sfondo `bg-brand` (blu principale) + testo `text-brand-foreground` quando `isoData(giorno) === isoData(new Date())`.
- Stesso trattamento (più tenue) anche su `dipendente.turni.tsx` per coerenza.

### 3. Calendario settimanale generale + Eventi mensili

**3a. Nuova voce menù "Calendario" (manager + dipendenti)**
- Nuova route `src/routes/calendario.tsx` accessibile a entrambi i ruoli.
- Aggiunta voce nella sidebar manager e nella bottom-nav dipendente (sostituisce/affianca "Tasks" o si aggiunge come 6° tab — da decidere in implementazione, probabilmente come pagina raggiungibile da Profilo o Home per non rompere la nav a 5 voci).
- Vista settimanale a griglia: righe = dipendenti, colonne = 7 giorni, celle = turni (read-only). Stile pulito, simile alla griglia manager ma senza editing.
- Pulsante **"Esporta PowerPoint"** visibile a tutti.

**3b. Export PowerPoint (slide riassuntiva + dettaglio)**
- Installare `pptxgenjs`.
- Genera `.pptx` modificabile con:
  - Slide 1 (riassuntiva): tabella settimanale completa, intestazioni giorno/data, righe dipendenti, celle con orari + tipo turno colorato.
  - Slide 2-8 (una per giorno): elenco turni del giorno con orario, dipendente, ruolo, location, ore.
- Eventi speciali del periodo inclusi nelle slide.
- Download diretto via `pptx.writeFile()`.

**3c. Calendario mensile eventi speciali**
- Nuova tabella DB `eventi_speciali` con: titolo, descrizione, data, ora_inizio, ora_fine, location, categoria (enum: matrimonio, riunione, evento_privato, altro), colore.
- RLS: tutti gli autenticati possono leggere; solo manager può insert/update/delete.
- Nella stessa pagina `/calendario` un toggle Settimana/Mese.
- Vista mensile: griglia calendario classico, eventi mostrati con il loro colore + icona categoria.
- Manager: pulsante "+ Aggiungi evento" con dialog (titolo, data, orari, location, categoria, descrizione).
- Dipendenti: solo lettura, click su evento mostra dettagli in dialog.

### 4. Dettagli tecnici

**Database (migrazione):**
```sql
CREATE TYPE evento_categoria AS ENUM ('matrimonio','riunione','evento_privato','altro');
CREATE TABLE public.eventi_speciali (
  id uuid PK default gen_random_uuid(),
  titolo text NOT NULL,
  descrizione text,
  data date NOT NULL,
  ora_inizio time, ora_fine time,
  location text,
  categoria evento_categoria NOT NULL DEFAULT 'altro',
  colore text NOT NULL DEFAULT '#3b82f6',
  created_by uuid, created_at, updated_at
);
-- RLS: SELECT to authenticated, ALL to manager
```

**File toccati:**
- Nuovi: `src/components/timbra-fab.tsx`, `src/routes/calendario.tsx`, `src/components/calendario-settimanale.tsx`, `src/components/calendario-mensile.tsx`, `src/components/evento-dialog.tsx`, `src/lib/export-pptx.ts`
- Modificati: `src/routes/manager.tsx` (montaggio FAB), `src/routes/manager.turni.tsx` (highlight oggi), `src/routes/dipendente.turni.tsx` (highlight oggi), `src/components/manager-sidebar.tsx` (voce Calendario), `src/components/dipendente-bottom-nav.tsx` (link a Calendario tramite Profilo o Tasks)
- Migrazione SQL per `eventi_speciali`
- `bun add pptxgenjs`

**Note:**
- Notifiche push a app chiusa (Web Push) restano fuori scope, come da discussione precedente.
- Il pulsante "Timbra" del manager non rimuove quello del dipendente, è solo aggiunto al suo layout.
