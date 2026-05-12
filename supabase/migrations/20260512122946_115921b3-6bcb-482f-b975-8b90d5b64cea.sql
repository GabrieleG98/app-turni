
-- 1. Restrict task_template SELECT to authenticated users
DROP POLICY IF EXISTS "Dipendente vede template attivi" ON public.task_template;
CREATE POLICY "Dipendente vede template attivi"
ON public.task_template
FOR SELECT
TO authenticated
USING (attivo = true);

-- 2. Realtime authorization on realtime.messages
-- Topic conventions in app:
--   chat:<canale_id>      => verify membership in chat_membri
--   notif:<user_id>       => only that user
--   public:*              => anyone authenticated (open broadcast)
-- Default deny: any topic not explicitly allowed is denied.

DROP POLICY IF EXISTS "realtime_chat_membri" ON realtime.messages;
CREATE POLICY "realtime_chat_membri"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'chat:%'
    AND EXISTS (
      SELECT 1 FROM public.chat_membri cm
      WHERE cm.user_id = auth.uid()
        AND cm.canale_id::text = split_part(realtime.topic(), ':', 2)
    ))
  OR (realtime.topic() LIKE 'notif:%'
    AND split_part(realtime.topic(), ':', 2) = auth.uid()::text)
  OR realtime.topic() LIKE 'public:%'
);

-- Allow broadcasting via realtime.send only when user has access to the topic
DROP POLICY IF EXISTS "realtime_chat_membri_insert" ON realtime.messages;
CREATE POLICY "realtime_chat_membri_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE 'chat:%'
    AND EXISTS (
      SELECT 1 FROM public.chat_membri cm
      WHERE cm.user_id = auth.uid()
        AND cm.canale_id::text = split_part(realtime.topic(), ':', 2)
    ))
  OR (realtime.topic() LIKE 'notif:%'
    AND split_part(realtime.topic(), ':', 2) = auth.uid()::text)
  OR realtime.topic() LIKE 'public:%'
);

-- 3. Storage policies for timbrature-foto: explicit UPDATE & DELETE
DROP POLICY IF EXISTS "Dipendente aggiorna proprie foto timbratura" ON storage.objects;
CREATE POLICY "Dipendente aggiorna proprie foto timbratura"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'timbrature-foto'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'timbrature-foto'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Dipendente elimina proprie foto timbratura" ON storage.objects;
CREATE POLICY "Dipendente elimina proprie foto timbratura"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'timbrature-foto'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Manager aggiorna tutte foto timbrature" ON storage.objects;
CREATE POLICY "Manager aggiorna tutte foto timbrature"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager'::app_role)
);

DROP POLICY IF EXISTS "Manager elimina tutte foto timbrature" ON storage.objects;
CREATE POLICY "Manager elimina tutte foto timbrature"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager'::app_role)
);
