## Obiettivo
Permettere al proprietario (e ai manager, esclusi se stessi e il proprietario) di **rimuovere completamente un membro** dal team: cancella account, profilo, ruolo e tutti i dati collegati (turni, timbrature, pause, disponibilità, correzioni, scambi, task, messaggi chat, notifiche).

## Dove appare il pulsante
1. **`src/routes/manager.dipendenti.index.tsx`** — nuova colonna/azione "Elimina" (icona cestino rossa) accanto a "Promuovi/Retrocedi". Disabilitata per:
   - Sé stessi
   - Il proprietario (a meno che non sia l'owner stesso ad agire — ma l'owner non può eliminare sé stesso comunque)
2. **`src/routes/manager.dipendenti.$id.tsx`** — card "Zona pericolo" in fondo con bottone "Elimina dipendente dal team".

## Flusso conferma
- `AlertDialog` di conferma con avviso esplicito: *"Questa azione è irreversibile. Verranno eliminati: profilo, account, turni, timbrature, pause, task, disponibilità, scambi, correzioni, messaggi chat e notifiche di {Nome Cognome}."*
- Richiede di digitare il nome del dipendente per confermare (anti-click accidentale).

## Backend — Edge Function `elimina-dipendente`
Serve perché cancellare da `auth.users` richiede la **service role key**, non disponibile dal client.

**`supabase/functions/elimina-dipendente/index.ts`**
- Verifica JWT del chiamante (`verify_jwt = true`, default).
- Controlla che il chiamante sia manager via `has_role`.
- Riceve `{ user_id: string }`.
- Rifiuta se: `user_id === chiamante` (no auto-eliminazione) oppure target è owner e chiamante non è owner (`is_owner` RPC).
- Pulisce a cascata con la service role:
  1. `chat_membri`, `chat_messaggi` (autore_id)
  2. `notifiche` (user_id)
  3. `pause`, `timbrature`, `timbrature_correzioni`
  4. `turni`, `turno_swap_requests` (sia da/a)
  5. `disponibilita`
  6. `task_assegnati`, `task_template` (assegnato_a → set null o delete dei suoi)
  7. `user_roles`, `profiles`
  8. `supabaseAdmin.auth.admin.deleteUser(user_id)`
- Ritorna `{ ok: true }` o errore strutturato.

Nessuna nuova migration — usa solo le RLS esistenti via service role (bypassa).

## Frontend
- Mutazione `useMutation` che chiama `supabase.functions.invoke("elimina-dipendente", { body: { user_id } })`.
- Su successo: toast + `qc.invalidateQueries(["profiles"])`, `["user_roles"]`. Se siamo sulla pagina dettaglio, naviga a `/manager/dipendenti`.

## Note
- Le foto in storage (`timbrature-foto`) restano orfane: le ignoriamo per ora (bucket privato, costo minimo). Lo segnalo nel piano se vuoi che le elimini anch'esse.
- Nessuna modifica al `dipendente.*` lato utente (chi viene eliminato semplicemente non potrà più loggarsi).