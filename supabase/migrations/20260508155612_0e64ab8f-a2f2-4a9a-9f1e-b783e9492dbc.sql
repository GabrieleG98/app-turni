
CREATE OR REPLACE FUNCTION public.notify_turno_modificato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Solo se il turno era già pubblicato e qualcosa di rilevante è cambiato
    IF COALESCE(OLD.pubblicato, false) = true AND COALESCE(NEW.pubblicato, false) = true AND (
      OLD.data IS DISTINCT FROM NEW.data
      OR OLD.ora_inizio IS DISTINCT FROM NEW.ora_inizio
      OR OLD.ora_fine IS DISTINCT FROM NEW.ora_fine
      OR OLD.tipo_turno IS DISTINCT FROM NEW.tipo_turno
      OR OLD.location IS DISTINCT FROM NEW.location
    ) THEN
      INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
      VALUES (NEW.dipendente_id, 'turno',
        'Turno modificato',
        to_char(NEW.data, 'DD/MM') || ' · ' || NEW.tipo_turno || ' (' || NEW.ora_inizio::text || '–' || NEW.ora_fine::text || ')',
        '/dipendente/turni');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.pubblicato, false) = true THEN
      INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
      VALUES (OLD.dipendente_id, 'turno',
        'Turno annullato',
        to_char(OLD.data, 'DD/MM') || ' · ' || OLD.tipo_turno,
        '/dipendente/turni');
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_turno_modificato_upd ON public.turni;
CREATE TRIGGER trg_notify_turno_modificato_upd
AFTER UPDATE ON public.turni
FOR EACH ROW EXECUTE FUNCTION public.notify_turno_modificato();

DROP TRIGGER IF EXISTS trg_notify_turno_modificato_del ON public.turni;
CREATE TRIGGER trg_notify_turno_modificato_del
AFTER DELETE ON public.turni
FOR EACH ROW EXECUTE FUNCTION public.notify_turno_modificato();

-- Assicura che il trigger di pubblicazione esista anche su INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_notify_turno_pubblicato ON public.turni;
CREATE TRIGGER trg_notify_turno_pubblicato
AFTER INSERT OR UPDATE ON public.turni
FOR EACH ROW EXECUTE FUNCTION public.notify_turno_pubblicato();
