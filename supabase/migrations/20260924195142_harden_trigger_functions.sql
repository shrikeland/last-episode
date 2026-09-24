-- Security advisor fixes for trigger functions.
--
-- handle_new_user() is SECURITY DEFINER and lives in the exposed public schema,
-- so anon/authenticated could call it via /rest/v1/rpc/handle_new_user
-- (lints 0028/0029). It is only meant to run as the on_auth_user_created
-- trigger — triggers do not check EXECUTE for the role that fires them, so
-- revoking it keeps signup working.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Empty search_path: the body references public.profiles fully qualified,
-- LOWER/TRIM resolve from pg_catalog, which is always searched.
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- Role-mutable search_path (lint 0011). Body only calls NOW() from pg_catalog.
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
