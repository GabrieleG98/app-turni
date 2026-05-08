
-- 1. Aggiungo flag pubblicato ai turni
ALTER TABLE public.turni
  ADD COLUMN IF NOT EXISTS pubblicato boolean NOT NULL DEFAULT false;

-- I dipendenti vedono solo turni pubblicati: aggiorno la policy esistente
DROP POLICY IF EXISTS "Dipendente vede propri turni" ON public.turni;
CREATE POLICY "Dipendente vede propri turni"
  ON public.turni FOR SELECT
  USING (auth.uid() = dipendente_id AND pubblicato = true);

-- 2. Template settimanali
CREATE TABLE IF NOT EXISTS public.turni_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.turni_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager gestisce template"
  ON public.turni_template FOR ALL
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_turni_template_updated_at
  BEFORE UPDATE ON public.turni_template
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Richieste di scambio turno
CREATE TYPE public.swap_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS public.turno_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id uuid NOT NULL REFERENCES public.turni(id) ON DELETE CASCADE,
  da_dipendente uuid NOT NULL,
  a_dipendente uuid NOT NULL,
  motivo text,
  status public.swap_status NOT NULL DEFAULT 'pending',
  decisione_di uuid,
  decisione_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.turno_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dipendente vede propri swap"
  ON public.turno_swap_requests FOR SELECT
  USING (auth.uid() = da_dipendente OR auth.uid() = a_dipendente);

CREATE POLICY "Dipendente crea propri swap"
  ON public.turno_swap_requests FOR INSERT
  WITH CHECK (auth.uid() = da_dipendente);

CREATE POLICY "Dipendente annulla proprio swap pendente"
  ON public.turno_swap_requests FOR UPDATE
  USING (auth.uid() = da_dipendente AND status = 'pending');

CREATE POLICY "Manager gestisce swap"
  ON public.turno_swap_requests FOR ALL
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_swap_updated_at
  BEFORE UPDATE ON public.turno_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Disponibilità dipendenti
CREATE TYPE public.disponibilita_tipo AS ENUM ('disponibile', 'non_disponibile', 'preferito');

CREATE TABLE IF NOT EXISTS public.disponibilita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id uuid NOT NULL,
  giorno_settimana smallint NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6),
  ora_inizio time NOT NULL,
  ora_fine time NOT NULL,
  tipo public.disponibilita_tipo NOT NULL DEFAULT 'disponibile',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disponibilita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dipendente gestisce proprie disponibilita"
  ON public.disponibilita FOR ALL
  USING (auth.uid() = dipendente_id)
  WITH CHECK (auth.uid() = dipendente_id);

CREATE POLICY "Manager vede tutte disponibilita"
  ON public.disponibilita FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_disponibilita_updated_at
  BEFORE UPDATE ON public.disponibilita
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_disponibilita_dipendente ON public.disponibilita(dipendente_id);
CREATE INDEX IF NOT EXISTS idx_swap_status ON public.turno_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_turni_pubblicato ON public.turni(pubblicato);
