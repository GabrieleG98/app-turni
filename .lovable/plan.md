## Obiettivo
Permettere a un manager (es. te) di promuovere altri utenti a manager (es. il tuo team manager e la responsabile miniclub) o retrocederli a dipendenti, direttamente dalla pagina **/manager/dipendenti**. I nuovi manager avranno gli stessi identici permessi attuali: creare, modificare ed eliminare turni, gestire timbrature, chat, task, ecc.

## Modifiche

### 1. Database
Nessuna modifica di schema: la tabella `user_roles` e la policy "Manager gestisce ruoli" già consentono ai manager di inserire/eliminare ruoli.

Aggiungere una funzione SQL `set_user_role(_user_id uuid, _role app_role)` (SECURITY DEFINER) che:
- verifica che il chiamante sia manager;
- impedisce a un manager di retrocedere sé stesso (per evitare di restare senza alcun manager);
- sostituisce in modo atomico il ruolo dell'utente target (delete + insert).

### 2. UI — `src/routes/manager.dipendenti.index.tsx`
- Mostrare per ogni dipendente un **badge con il ruolo attuale** (Manager / Dipendente).
- Aggiungere un pulsante azione contestuale:
  - **"Promuovi a manager"** se l'utente è dipendente
  - **"Retrocedi a dipendente"** se è manager (disabilitato sulla riga dell'utente loggato)
- Conferma tramite `AlertDialog` prima di applicare il cambio.
- Toast di esito + refresh automatico della lista.

### 3. Caricamento dati
Estendere la query dei profili per includere anche i ruoli (lettura aggiuntiva da `user_roles`) così da mostrare il badge corretto e decidere quale azione mostrare.

## Note
- Nessuna modifica ai flussi di registrazione: il primo utente resta automaticamente manager, gli altri restano dipendenti finché non vengono promossi.
- Tutti i permessi (turni, scambi, timbrature, report, chat annunci, task template, notifiche) sono già governati da `has_role(uid, 'manager')`: una volta promossi, i nuovi manager avranno automaticamente accesso completo come te.
- Nessun impatto su RLS, chat, notifiche o turni esistenti.
