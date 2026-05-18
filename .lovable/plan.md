## Problema individuato

La promozione chiama `set_user_role`, ma l’errore `new row violates row-level security policy ... user_roles` indica che l’inserimento finale in `user_roles` viene ancora valutato dalle policy RLS.

Nel database la funzione esiste ed è `SECURITY DEFINER`, ma è opportuno renderla più robusta: evitare il ciclo `DELETE` + `INSERT` e usare un aggiornamento atomico con `UPSERT`, mantenendo i controlli lato server su manager/proprietario.

## Piano di correzione

1. Aggiornare la funzione database `public.set_user_role`
   - Verificare che chi esegue sia manager.
   - Impedire la retrocessione di sé stessi.
   - Impedire modifiche al proprietario da parte di altri manager.
   - Sostituire `DELETE` + `INSERT` con `INSERT ... ON CONFLICT (user_id) DO UPDATE`, così la promozione modifica il ruolo esistente senza passare da una sequenza fragile.

2. Garantire il vincolo necessario su `user_roles`
   - Assicurare che `user_id` sia univoco, perché un utente deve avere un solo ruolo applicativo alla volta.
   - Questo rende l’`UPSERT` affidabile e previene ruoli duplicati.

3. Lasciare invariata la UI esistente
   - Il pulsante “Promuovi a manager” può continuare a chiamare `set_user_role`.
   - Non cambio layout o flussi: correggo solo la causa backend dell’errore.

4. Validazione
   - Dopo la migrazione, verificare definizione funzione e policy.
   - Se necessario, ritestare la promozione dal browser e controllare che non compaia più l’errore RLS.