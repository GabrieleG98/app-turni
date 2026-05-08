CREATE POLICY "Autenticati vedono colleghi"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_timbrature_dip_data
  ON public.timbrature (dipendente_id, data, orario_clock_in);