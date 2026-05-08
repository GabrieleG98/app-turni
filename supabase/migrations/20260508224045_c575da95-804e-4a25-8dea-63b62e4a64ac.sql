
-- Allow managers to upload selfies to any user folder (for "Timbra per…")
CREATE POLICY "Manager carica timbrature-foto"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Manager legge timbrature-foto"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'timbrature-foto'
  AND public.has_role(auth.uid(), 'manager')
);
