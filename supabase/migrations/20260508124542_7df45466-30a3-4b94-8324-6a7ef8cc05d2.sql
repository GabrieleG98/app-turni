
-- Enum per ruoli applicazione
CREATE TYPE public.app_role AS ENUM ('manager', 'dipendente');

-- Enum per tipo turno
CREATE TYPE public.tipo_turno AS ENUM ('mattina', 'pomeriggio', 'sera');

-- Tabella profili dipendenti
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  cognome TEXT NOT NULL DEFAULT '',
  ruolo_lavoro TEXT NOT NULL DEFAULT '',
  reparto TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella ruoli utente (separata per sicurezza)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabella turni
CREATE TABLE public.turni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  tipo_turno tipo_turno NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_turni_dipendente_data ON public.turni(dipendente_id, data);

-- Tabella timbrature
CREATE TABLE public.timbrature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  orario_clock_in TIMESTAMPTZ NOT NULL,
  orario_clock_out TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timbrature_dipendente_data ON public.timbrature(dipendente_id, data);

-- Funzione SECURITY DEFINER per check ruolo (evita ricorsione RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger per auto-creazione profilo + ruolo al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Verifica se è il primo utente registrato
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first_user;

  -- Crea il profilo
  INSERT INTO public.profiles (id, nome, cognome, ruolo_lavoro, reparto, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    COALESCE(NEW.raw_user_meta_data->>'ruolo_lavoro', ''),
    COALESCE(NEW.raw_user_meta_data->>'reparto', ''),
    NEW.email
  );

  -- Assegna ruolo: primo utente = manager, altri = dipendente
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'dipendente');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_turni_updated_at BEFORE UPDATE ON public.turni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_timbrature_updated_at BEFORE UPDATE ON public.timbrature
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Abilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timbrature ENABLE ROW LEVEL SECURITY;

-- RLS profiles
CREATE POLICY "Profili visibili a manager"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Dipendente vede proprio profilo"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Manager modifica profili"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Dipendente aggiorna proprio profilo"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Manager inserisce profili"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager elimina profili"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'manager'));

-- RLS user_roles
CREATE POLICY "Utente vede propri ruoli"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Manager vede tutti i ruoli"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager gestisce ruoli"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- RLS turni
CREATE POLICY "Manager vede tutti i turni"
  ON public.turni FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Dipendente vede propri turni"
  ON public.turni FOR SELECT
  USING (auth.uid() = dipendente_id);

CREATE POLICY "Manager gestisce turni"
  ON public.turni FOR ALL
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- RLS timbrature
CREATE POLICY "Manager vede tutte le timbrature"
  ON public.timbrature FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Dipendente vede proprie timbrature"
  ON public.timbrature FOR SELECT
  USING (auth.uid() = dipendente_id);

CREATE POLICY "Dipendente crea proprie timbrature"
  ON public.timbrature FOR INSERT
  WITH CHECK (auth.uid() = dipendente_id);

CREATE POLICY "Dipendente aggiorna proprie timbrature"
  ON public.timbrature FOR UPDATE
  USING (auth.uid() = dipendente_id);

CREATE POLICY "Manager gestisce timbrature"
  ON public.timbrature FOR ALL
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));
