CREATE TYPE notifica_tipo AS ENUM ('turno','scambio','annuncio','task','generico');

CREATE TABLE public.notifiche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo notifica_tipo NOT NULL DEFAULT 'generico',
  titolo text NOT NULL,
  descrizione text,
  link text,
  letto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifiche_user ON public.notifiche(user_id, created_at DESC);

ALTER TABLE public.notifiche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vede proprie notifiche" ON public.notifiche
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Aggiorna proprie notifiche" ON public.notifiche
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Manager vede tutte" ON public.notifiche
FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifiche;

-- Trigger: turno pubblicato (insert con pubblicato=true OPPURE update da false→true)
CREATE OR REPLACE FUNCTION public.notify_turno_pubblicato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.pubblicato) OR
     (TG_OP = 'UPDATE' AND NEW.pubblicato AND COALESCE(OLD.pubblicato,false) = false) THEN
    INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
    VALUES (NEW.dipendente_id, 'turno',
      'Nuovo turno pubblicato',
      to_char(NEW.data, 'DD/MM') || ' · ' || NEW.tipo_turno || ' (' || NEW.ora_inizio::text || '–' || NEW.ora_fine::text || ')',
      '/dipendente/turni');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_turno_pubblicato() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_turno
AFTER INSERT OR UPDATE OF pubblicato ON public.turni
FOR EACH ROW EXECUTE FUNCTION public.notify_turno_pubblicato();

-- Trigger: richiesta scambio creata → notifica al destinatario
CREATE OR REPLACE FUNCTION public.notify_swap_creato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nome text;
BEGIN
  SELECT nome || ' ' || cognome INTO _nome FROM public.profiles WHERE id = NEW.da_dipendente;
  INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
  VALUES (NEW.a_dipendente, 'scambio',
    'Richiesta di scambio turno',
    COALESCE(_nome,'Un collega') || ' ti propone uno scambio',
    '/dipendente/turni');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_swap_creato() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_swap_creato
AFTER INSERT ON public.turno_swap_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_swap_creato();

-- Trigger: decisione scambio → notifica al richiedente
CREATE OR REPLACE FUNCTION public.notify_swap_decisione()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','cancelled') THEN
    INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
    VALUES (NEW.da_dipendente, 'scambio',
      CASE NEW.status
        WHEN 'approved' THEN 'Scambio approvato'
        WHEN 'rejected' THEN 'Scambio rifiutato'
        ELSE 'Scambio annullato'
      END,
      'La tua richiesta di scambio è stata aggiornata',
      '/dipendente/turni');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_swap_decisione() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_swap_decisione
AFTER UPDATE OF status ON public.turno_swap_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_swap_decisione();

-- Trigger: messaggio in canale "annunci" → notifica a tutti i membri
CREATE OR REPLACE FUNCTION public.notify_annuncio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_annuncio boolean;
BEGIN
  SELECT (tipo = 'annunci') INTO _is_annuncio FROM public.chat_canali WHERE id = NEW.canale_id;
  IF NOT _is_annuncio THEN RETURN NEW; END IF;

  INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
  SELECT m.user_id, 'annuncio', '📢 Nuovo annuncio',
         left(NEW.contenuto, 120),
         '/dipendente/chat'
  FROM public.chat_membri m
  WHERE m.canale_id = NEW.canale_id AND m.user_id <> NEW.autore_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_annuncio() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_annuncio
AFTER INSERT ON public.chat_messaggi
FOR EACH ROW EXECUTE FUNCTION public.notify_annuncio();