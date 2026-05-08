CREATE OR REPLACE FUNCTION public.restrict_dipendente_timbrature_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- I manager possono modificare tutto
  IF public.has_role(auth.uid(), 'manager') THEN
    RETURN NEW;
  END IF;

  -- Per i dipendenti: vietato cambiare campi chiave
  IF NEW.dipendente_id IS DISTINCT FROM OLD.dipendente_id
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.orario_clock_in IS DISTINCT FROM OLD.orario_clock_in
     OR NEW.note IS DISTINCT FROM OLD.note THEN
    RAISE EXCEPTION 'Non puoi modificare manualmente la timbratura. Contatta il manager.';
  END IF;

  -- Permesso solo impostare clock_out su una timbratura ancora aperta
  IF OLD.orario_clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Questa timbratura è già stata chiusa.';
  END IF;

  IF NEW.orario_clock_out IS NULL THEN
    RAISE EXCEPTION 'Devi impostare un orario di fine turno valido.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_dipendente_timbrature_update ON public.timbrature;
CREATE TRIGGER trg_restrict_dipendente_timbrature_update
BEFORE UPDATE ON public.timbrature
FOR EACH ROW
EXECUTE FUNCTION public.restrict_dipendente_timbrature_update();