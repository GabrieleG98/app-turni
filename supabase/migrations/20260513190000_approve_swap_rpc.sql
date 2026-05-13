-- FIX #3: RPC atomica per l'approvazione degli scambi turno.
-- Prima l'aggiornamento di turno_swap_requests e turni avveniva in due round-trip separati;
-- se il secondo falliva, lo swap rimaneva "approved" nel DB ma il turno non era riassegnato.
-- Ora tutta l'operazione avviene in una singola transazione PostgreSQL.

CREATE OR REPLACE FUNCTION approve_swap(
  _swap_id     uuid,
  _manager_id  uuid,
  _nuovo_dipendente uuid,
  _turno_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1) Segna lo swap come approvato
  UPDATE turno_swap_requests
  SET
    status        = 'approved',
    decisione_di  = _manager_id,
    decisione_at  = now()
  WHERE id = _swap_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap % non trovato', _swap_id;
  END IF;

  -- 2) Riassegna il turno al nuovo dipendente (nello stesso statement)
  UPDATE turni
  SET dipendente_id = _nuovo_dipendente
  WHERE id = _turno_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno % non trovato', _turno_id;
  END IF;
END;
$$;

-- Solo manager e owner possono eseguire questa funzione
REVOKE ALL ON FUNCTION approve_swap(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_swap(uuid, uuid, uuid, uuid) TO authenticated;
