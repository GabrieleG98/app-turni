-- ============================================================
-- Bug 1: Manager non riesce a salvare Ruolo/Reparto del dipendente
-- La policy profiles_update precedente era limitata al proprio profilo.
-- Aggiungiamo una policy separata che permette a manager/owner
-- di aggiornare qualsiasi riga di profiles.
-- ============================================================

-- Rimuove eventuali policy precedente con lo stesso nome (idempotente)
DROP POLICY IF EXISTS profiles_update_manager ON profiles;

CREATE POLICY profiles_update_manager ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS me
      WHERE me.id = auth.uid()
        AND me.ruolo IN ('manager', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS me
      WHERE me.id = auth.uid()
        AND me.ruolo IN ('manager', 'owner')
    )
  );

-- ============================================================
-- Bug 2: Notifiche non vengono inviate ai manager
-- La vecchia WITH CHECK su notifiche_insert era:
--   auth.uid() = user_id
-- Questo bloccava il dipendente che inserisce una notifica
-- con user_id = manager_id (es. richiesta scambio turno).
-- Aggiungiamo una policy che permette INSERT quando:
--   a) l'inserente è il destinatario (proprio flusso), OPPURE
--   b) l'inserente è manager/owner (invio notifiche ai dipendenti)
--   c) il dipendente inserisce una notifica destinata al manager
-- ============================================================

DROP POLICY IF EXISTS notifiche_insert_manager ON notifiche;

CREATE POLICY notifiche_insert_manager ON notifiche
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Caso 1: l'utente inserisce notifiche per sé stesso
    auth.uid() = user_id
    OR
    -- Caso 2: chi inserisce è manager/owner (può notificare chiunque)
    EXISTS (
      SELECT 1 FROM profiles AS me
      WHERE me.id = auth.uid()
        AND me.ruolo IN ('manager', 'owner')
    )
    OR
    -- Caso 3: dipendente invia notifica al proprio manager
    -- (es. richiesta scambio turno, ferie, ecc.)
    EXISTS (
      SELECT 1 FROM profiles AS dest
      WHERE dest.id = notifiche.user_id
        AND dest.ruolo IN ('manager', 'owner')
    )
  );
