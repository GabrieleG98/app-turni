## Profilo modificabile + owner gestisce ruolo/reparto

### 1. Profilo editabile (dipendenti + manager)

**Componente condiviso `src/components/profilo-editor.tsx`**
- Form con: Nome, Cognome, Ruolo lavoro, Reparto, Email
- Validazione zod (lunghezze, email valida)
- Salva: `supabase.from("profiles").update(...)` + `supabase.auth.updateUser({ email })` se email cambiata
- Toast di conferma; avviso che il cambio email richiede conferma via mail

**`src/routes/dipendente.profilo.tsx`** — sostituire le righe di sola lettura con `<ProfiloEditor />`. Mantenere link Disponibilità ed Esci.

**Nuova `src/routes/manager.profilo.tsx`** — pagina con `<ProfiloEditor />` in stile manager.

**`src/components/manager-sidebar.tsx`** — aggiungere voce "Profilo" (icona `UserCircle`) → `/manager/profilo`.

### 2. Owner modifica ruolo/reparto di tutti

**`src/routes/manager.dipendenti.$id.tsx`**
- Calcolare `ownerId` (primo `user_roles` manager per `created_at`) e `iAmOwner`.
- Aggiungere Card "Modifica dati lavorativi" visibile solo se `iAmOwner`, con due input (`ruolo_lavoro`, `reparto`) e pulsante Salva.
- Update via `supabase.from("profiles").update(...).eq("id", id)` — le RLS attuali consentono già all'owner di modificare qualsiasi profilo, manager inclusi.

### Dettagli tecnici
- Nessuna migrazione DB: le policy `Manager modifica profili` e `Dipendente aggiorna proprio profilo` coprono tutti i casi.
- Cambio email: usa flusso standard Supabase con conferma via email al nuovo indirizzo.

### File toccati
- Nuovo: `src/components/profilo-editor.tsx`
- Nuovo: `src/routes/manager.profilo.tsx`
- Modificato: `src/routes/dipendente.profilo.tsx`
- Modificato: `src/routes/manager.dipendenti.$id.tsx`
- Modificato: `src/components/manager-sidebar.tsx`