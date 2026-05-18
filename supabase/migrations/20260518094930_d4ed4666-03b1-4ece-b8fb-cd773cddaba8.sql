-- Rendi set_user_role più robusto: usa UPSERT e mantiene SECURITY DEFINER (owner = postgres con BYPASSRLS)
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
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

  -- Rimuovi solo gli altri ruoli per l'utente target, mantieni quello desiderato se già presente
  DELETE FROM public.user_roles
   WHERE user_id = _user_id AND role <> _role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Assicurati che il proprietario sia postgres (BYPASSRLS) e i permessi corretti
ALTER FUNCTION public.set_user_role(uuid, public.app_role) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;