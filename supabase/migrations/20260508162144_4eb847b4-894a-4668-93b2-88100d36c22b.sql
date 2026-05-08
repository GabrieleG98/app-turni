CREATE TYPE evento_categoria AS ENUM ('matrimonio','riunione','evento_privato','altro');

CREATE TABLE public.eventi_speciali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  descrizione text,
  data date NOT NULL,
  ora_inizio time,
  ora_fine time,
  location text,
  categoria evento_categoria NOT NULL DEFAULT 'altro',
  colore text NOT NULL DEFAULT '#3b82f6',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.eventi_speciali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti autenticati vedono eventi"
ON public.eventi_speciali FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Manager gestisce eventi"
ON public.eventi_speciali FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER eventi_speciali_updated_at
BEFORE UPDATE ON public.eventi_speciali
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_eventi_speciali_data ON public.eventi_speciali(data);