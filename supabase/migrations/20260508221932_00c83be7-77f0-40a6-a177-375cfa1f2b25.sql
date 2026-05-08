
-- 1. Schema columns
ALTER TABLE public.task_template
  ADD COLUMN IF NOT EXISTS richiede_foto boolean NOT NULL DEFAULT false;

ALTER TABLE public.task_assegnati
  ADD COLUMN IF NOT EXISTS foto_url text;

-- 2. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-foto', 'task-foto', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
DROP POLICY IF EXISTS "Dipendente carica proprie foto task" ON storage.objects;
CREATE POLICY "Dipendente carica proprie foto task"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-foto'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Dipendente vede proprie foto task" ON storage.objects;
CREATE POLICY "Dipendente vede proprie foto task"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-foto'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

DROP POLICY IF EXISTS "Dipendente aggiorna proprie foto task" ON storage.objects;
CREATE POLICY "Dipendente aggiorna proprie foto task"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'task-foto'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Dipendente elimina proprie foto task" ON storage.objects;
CREATE POLICY "Dipendente elimina proprie foto task"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-foto'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- 4. Notify on assign
CREATE OR REPLACE FUNCTION public.notify_task_assegnato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
  VALUES (NEW.dipendente_id, 'task', 'Nuovo task assegnato',
    NEW.titolo, '/dipendente/tasks');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_task_assegnato ON public.task_assegnati;
CREATE TRIGGER trg_notify_task_assegnato
AFTER INSERT ON public.task_assegnati
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assegnato();

-- 5. Notify managers on completion
CREATE OR REPLACE FUNCTION public.notify_task_completato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _nome text;
BEGIN
  IF NEW.completato_at IS NOT NULL AND OLD.completato_at IS NULL THEN
    SELECT nome || ' ' || cognome INTO _nome FROM public.profiles WHERE id = NEW.dipendente_id;
    INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
    SELECT ur.user_id, 'task', 'Task completato',
      COALESCE(_nome, 'Un dipendente') || ' ha completato: ' || NEW.titolo,
      '/manager/tasks'
    FROM public.user_roles ur
    WHERE ur.role = 'manager';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_task_completato ON public.task_assegnati;
CREATE TRIGGER trg_notify_task_completato
AFTER UPDATE ON public.task_assegnati
FOR EACH ROW EXECUTE FUNCTION public.notify_task_completato();
