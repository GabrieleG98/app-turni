
-- ========== Correzioni timbrature ==========
CREATE TYPE public.correzione_tipo AS ENUM ('mancata_clock_in','mancata_clock_out','orario_errato','altro');
CREATE TYPE public.correzione_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.timbrature_correzioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id uuid NOT NULL,
  timbratura_id uuid REFERENCES public.timbrature(id) ON DELETE SET NULL,
  data date NOT NULL,
  tipo public.correzione_tipo NOT NULL,
  orario_richiesto_in timestamptz,
  orario_richiesto_out timestamptz,
  motivo text NOT NULL,
  status public.correzione_status NOT NULL DEFAULT 'pending',
  decisione_di uuid,
  decisione_at timestamptz,
  note_manager text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timbrature_correzioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dipendente vede proprie correzioni" ON public.timbrature_correzioni
  FOR SELECT USING (auth.uid() = dipendente_id);
CREATE POLICY "Dipendente crea proprie correzioni" ON public.timbrature_correzioni
  FOR INSERT WITH CHECK (auth.uid() = dipendente_id AND status = 'pending');
CREATE POLICY "Dipendente annulla pending" ON public.timbrature_correzioni
  FOR UPDATE USING (auth.uid() = dipendente_id AND status = 'pending');
CREATE POLICY "Manager gestisce correzioni" ON public.timbrature_correzioni
  FOR ALL USING (public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'manager'));

CREATE TRIGGER trg_correzioni_updated_at
  BEFORE UPDATE ON public.timbrature_correzioni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.notify_correzione_decisa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifiche (user_id, tipo, titolo, descrizione, link)
    VALUES (NEW.dipendente_id, 'generico',
      CASE NEW.status WHEN 'approved' THEN 'Correzione approvata' ELSE 'Correzione rifiutata' END,
      'Richiesta del ' || to_char(NEW.data,'DD/MM') || ' aggiornata',
      '/dipendente');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_correzione_decisa
  AFTER UPDATE ON public.timbrature_correzioni
  FOR EACH ROW EXECUTE FUNCTION public.notify_correzione_decisa();

-- ========== Categorie eventi ==========
CREATE TABLE public.evento_categorie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  colore text NOT NULL DEFAULT '#3b82f6',
  ordine smallint NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evento_categorie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti vedono categorie" ON public.evento_categorie
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner gestisce categorie" ON public.evento_categorie
  FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE TRIGGER trg_categorie_updated_at
  BEFORE UPDATE ON public.evento_categorie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default categorie con i colori già usati nell'app
INSERT INTO public.evento_categorie (nome, colore, ordine) VALUES
  ('Matrimonio', '#ec4899', 1),
  ('Riunione', '#3b82f6', 2),
  ('Evento privato', '#a855f7', 3),
  ('Altro', '#64748b', 4);

-- Aggiungi categoria_id a eventi_speciali
ALTER TABLE public.eventi_speciali ADD COLUMN categoria_id uuid REFERENCES public.evento_categorie(id) ON DELETE SET NULL;

-- Mappa eventi esistenti
UPDATE public.eventi_speciali e SET categoria_id = c.id
FROM public.evento_categorie c
WHERE (e.categoria::text = 'matrimonio' AND c.nome = 'Matrimonio')
   OR (e.categoria::text = 'riunione' AND c.nome = 'Riunione')
   OR (e.categoria::text = 'evento_privato' AND c.nome = 'Evento privato')
   OR (e.categoria::text = 'altro' AND c.nome = 'Altro');
