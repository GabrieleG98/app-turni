CREATE TYPE task_ricorrenza AS ENUM ('daily', 'weekly');

CREATE TABLE public.task_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  descrizione text,
  ricorrenza task_ricorrenza NOT NULL DEFAULT 'daily',
  giorni_settimana smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',  -- 1=lun..7=dom
  assegnato_a uuid,        -- null => a tutti i dipendenti
  reparto text,            -- se non null e assegnato_a null, filtra per reparto
  attivo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_assegnati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.task_template(id) ON DELETE CASCADE,
  dipendente_id uuid NOT NULL,
  titolo text NOT NULL,
  descrizione text,
  data date NOT NULL,
  completato_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, dipendente_id, data)
);

CREATE INDEX idx_task_assegnati_dip_data ON public.task_assegnati(dipendente_id, data DESC);

ALTER TABLE public.task_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assegnati ENABLE ROW LEVEL SECURITY;

-- task_template: solo manager
CREATE POLICY "Manager gestisce task template" ON public.task_template
FOR ALL USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Dipendente vede template attivi" ON public.task_template
FOR SELECT USING (attivo = true);

-- task_assegnati
CREATE POLICY "Dipendente vede propri task" ON public.task_assegnati
FOR SELECT USING (auth.uid() = dipendente_id);

CREATE POLICY "Dipendente aggiorna propri task" ON public.task_assegnati
FOR UPDATE USING (auth.uid() = dipendente_id);

CREATE POLICY "Manager gestisce task assegnati" ON public.task_assegnati
FOR ALL USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_task_template_updated BEFORE UPDATE ON public.task_template
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_task_assegnati_updated BEFORE UPDATE ON public.task_assegnati
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Funzione: garantisce che i task di una data siano materializzati per l'utente corrente
CREATE OR REPLACE FUNCTION public.ensure_my_tasks(_data date DEFAULT current_date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reparto text;
  _giorno smallint;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT reparto INTO _reparto FROM public.profiles WHERE id = _uid;
  -- ISO: lun=1..dom=7
  _giorno := EXTRACT(ISODOW FROM _data)::smallint;

  INSERT INTO public.task_assegnati (template_id, dipendente_id, titolo, descrizione, data)
  SELECT t.id, _uid, t.titolo, t.descrizione, _data
  FROM public.task_template t
  WHERE t.attivo = true
    AND _giorno = ANY(t.giorni_settimana)
    AND (
      t.assegnato_a = _uid
      OR (t.assegnato_a IS NULL AND (t.reparto IS NULL OR t.reparto = COALESCE(_reparto, '')))
    )
  ON CONFLICT (template_id, dipendente_id, data) DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ensure_my_tasks(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_tasks(date) TO authenticated;