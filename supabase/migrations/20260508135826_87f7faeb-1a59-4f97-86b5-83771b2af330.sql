-- Aggiungi campi GPS e foto a timbrature
ALTER TABLE public.timbrature
  ADD COLUMN IF NOT EXISTS lat_in numeric,
  ADD COLUMN IF NOT EXISTS lng_in numeric,
  ADD COLUMN IF NOT EXISTS lat_out numeric,
  ADD COLUMN IF NOT EXISTS lng_out numeric,
  ADD COLUMN IF NOT EXISTS foto_in_url text,
  ADD COLUMN IF NOT EXISTS foto_out_url text;

-- Aggiorna trigger per consentire al dipendente di salvare anche lat_out, lng_out, foto_out_url
CREATE OR REPLACE FUNCTION public.restrict_dipendente_timbrature_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'manager') THEN
    RETURN NEW;
  END IF;

  IF NEW.dipendente_id IS DISTINCT FROM OLD.dipendente_id
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.orario_clock_in IS DISTINCT FROM OLD.orario_clock_in
     OR NEW.lat_in IS DISTINCT FROM OLD.lat_in
     OR NEW.lng_in IS DISTINCT FROM OLD.lng_in
     OR NEW.foto_in_url IS DISTINCT FROM OLD.foto_in_url
     OR NEW.note IS DISTINCT FROM OLD.note THEN
    RAISE EXCEPTION 'Non puoi modificare manualmente la timbratura. Contatta il manager.';
  END IF;

  IF OLD.orario_clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Questa timbratura è già stata chiusa.';
  END IF;

  IF NEW.orario_clock_out IS NULL THEN
    RAISE EXCEPTION 'Devi impostare un orario di fine turno valido.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restrict_dipendente_timbrature_update ON public.timbrature;
CREATE TRIGGER trg_restrict_dipendente_timbrature_update
BEFORE UPDATE ON public.timbrature
FOR EACH ROW EXECUTE FUNCTION public.restrict_dipendente_timbrature_update();

-- Tabella pause
CREATE TYPE pausa_tipo AS ENUM ('pranzo', 'caffe', 'altro');

CREATE TABLE public.pause (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timbratura_id uuid NOT NULL REFERENCES public.timbrature(id) ON DELETE CASCADE,
  dipendente_id uuid NOT NULL,
  inizio timestamptz NOT NULL DEFAULT now(),
  fine timestamptz,
  tipo pausa_tipo NOT NULL DEFAULT 'altro',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pause ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dipendente gestisce proprie pause"
ON public.pause FOR ALL
USING (auth.uid() = dipendente_id)
WITH CHECK (auth.uid() = dipendente_id);

CREATE POLICY "Manager vede tutte le pause"
ON public.pause FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager gestisce pause"
ON public.pause FOR ALL
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_pause_updated_at
BEFORE UPDATE ON public.pause
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_pause_timbratura ON public.pause(timbratura_id);
CREATE INDEX idx_pause_dipendente ON public.pause(dipendente_id);

-- Storage bucket per foto timbrature
INSERT INTO storage.buckets (id, name, public)
VALUES ('timbrature-foto', 'timbrature-foto', false)
ON CONFLICT (id) DO NOTHING;

-- RLS per il bucket: i file sono organizzati come {user_id}/...
CREATE POLICY "Dipendente carica proprie foto timbratura"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'timbrature-foto'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Dipendente vede proprie foto timbratura"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'timbrature-foto'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Manager vede tutte foto timbrature"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager')
);