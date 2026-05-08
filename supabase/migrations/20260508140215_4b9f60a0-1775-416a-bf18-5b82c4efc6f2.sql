CREATE TYPE chat_canale_tipo AS ENUM ('generale', 'annunci', 'reparto', 'privato');

CREATE TABLE public.chat_canali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  tipo chat_canale_tipo NOT NULL DEFAULT 'generale',
  solo_manager_scrive boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_membri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canale_id uuid NOT NULL REFERENCES public.chat_canali(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ultimo_letto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canale_id, user_id)
);

CREATE TABLE public.chat_messaggi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canale_id uuid NOT NULL REFERENCES public.chat_canali(id) ON DELETE CASCADE,
  autore_id uuid NOT NULL,
  contenuto text NOT NULL CHECK (length(contenuto) > 0 AND length(contenuto) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_membri_canale ON public.chat_membri(canale_id);
CREATE INDEX idx_chat_membri_user ON public.chat_membri(user_id);
CREATE INDEX idx_chat_messaggi_canale_at ON public.chat_messaggi(canale_id, created_at DESC);

-- Helper: utente è membro di canale
CREATE OR REPLACE FUNCTION public.is_membro_canale(_canale uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_membri WHERE canale_id = _canale AND user_id = _user
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_membro_canale(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_membro_canale(uuid, uuid) TO authenticated;

ALTER TABLE public.chat_canali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_membri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messaggi ENABLE ROW LEVEL SECURITY;

-- chat_canali
CREATE POLICY "Vede canali di cui è membro" ON public.chat_canali
FOR SELECT USING (public.is_membro_canale(id, auth.uid()) OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager gestisce canali" ON public.chat_canali
FOR ALL USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- chat_membri
CREATE POLICY "Vede propri membership" ON public.chat_membri
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager gestisce membri" ON public.chat_membri
FOR ALL USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Utente aggiorna ultimo letto" ON public.chat_membri
FOR UPDATE USING (auth.uid() = user_id);

-- chat_messaggi
CREATE POLICY "Membri vedono messaggi" ON public.chat_messaggi
FOR SELECT USING (
  public.is_membro_canale(canale_id, auth.uid()) OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Membri inviano messaggi" ON public.chat_messaggi
FOR INSERT WITH CHECK (
  auth.uid() = autore_id
  AND public.is_membro_canale(canale_id, auth.uid())
  AND (
    NOT EXISTS (SELECT 1 FROM public.chat_canali c WHERE c.id = canale_id AND c.solo_manager_scrive)
    OR public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Autore elimina propri messaggi" ON public.chat_messaggi
FOR DELETE USING (auth.uid() = autore_id OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_chat_canali_updated BEFORE UPDATE ON public.chat_canali
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messaggi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_canali;

-- Auto-iscrivi nuovi utenti ai canali "broadcast" (generale + annunci)
CREATE OR REPLACE FUNCTION public.auto_iscrivi_canali_broadcast()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_membri (canale_id, user_id)
  SELECT id, NEW.id FROM public.chat_canali
  WHERE tipo IN ('generale', 'annunci')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.auto_iscrivi_canali_broadcast() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_auto_iscrivi_chat
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_iscrivi_canali_broadcast();

-- Crea canali iniziali e iscrivi tutti gli utenti esistenti
INSERT INTO public.chat_canali (nome, descrizione, tipo, solo_manager_scrive)
VALUES
  ('Generale', 'Canale generale del team', 'generale', false),
  ('Annunci', 'Comunicazioni ufficiali dal manager', 'annunci', true);

INSERT INTO public.chat_membri (canale_id, user_id)
SELECT c.id, p.id
FROM public.chat_canali c
CROSS JOIN public.profiles p
WHERE c.tipo IN ('generale', 'annunci')
ON CONFLICT DO NOTHING;