-- Funzione per identificare il proprietario dell'app (primo manager registrato)
CREATE OR REPLACE FUNCTION public.is_owner(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _uid = (
    SELECT user_id FROM public.user_roles
    WHERE role = 'manager'
    ORDER BY created_at ASC
    LIMIT 1
  );
$$;

-- Aggiorna set_user_role: blocca modifiche al proprietario
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'manager') THEN
    RAISE EXCEPTION 'Solo i manager possono modificare i ruoli';
  END IF;

  IF _user_id = auth.uid() AND _role <> 'manager' THEN
    RAISE EXCEPTION 'Non puoi retrocedere te stesso';
  END IF;

  IF public.is_owner(_user_id) AND NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Non puoi modificare il ruolo del proprietario dell''app';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

-- RLS user_roles: sostituisci la policy ALL aperta
DROP POLICY IF EXISTS "Manager gestisce ruoli" ON public.user_roles;

CREATE POLICY "Manager inserisce ruoli"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(user_id) OR public.is_owner(auth.uid()))
);

CREATE POLICY "Manager aggiorna ruoli"
ON public.user_roles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(user_id) OR public.is_owner(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(user_id) OR public.is_owner(auth.uid()))
);

CREATE POLICY "Manager elimina ruoli"
ON public.user_roles FOR DELETE
USING (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(user_id) OR public.is_owner(auth.uid()))
);

-- RLS profiles: proteggi profilo proprietario da modifiche/eliminazioni altrui
DROP POLICY IF EXISTS "Manager modifica profili" ON public.profiles;
DROP POLICY IF EXISTS "Manager elimina profili" ON public.profiles;

CREATE POLICY "Manager modifica profili"
ON public.profiles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(id) OR public.is_owner(auth.uid()))
);

CREATE POLICY "Manager elimina profili"
ON public.profiles FOR DELETE
USING (
  public.has_role(auth.uid(), 'manager')
  AND (NOT public.is_owner(id) OR public.is_owner(auth.uid()))
);