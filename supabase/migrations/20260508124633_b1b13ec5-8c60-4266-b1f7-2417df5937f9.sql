
-- handle_new_user è usato solo dal trigger; revoca da tutti
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role serve nelle policy RLS chiamate da utenti autenticati: revoca solo da anon e public
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
