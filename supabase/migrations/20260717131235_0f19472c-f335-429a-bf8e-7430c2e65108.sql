
-- Drop overly permissive invite read policies (admin-manage policy remains)
DROP POLICY IF EXISTS "Anon read invite by token" ON public.invites;
DROP POLICY IF EXISTS "Auth read invite by token" ON public.invites;

-- Drop broad same-filial profile read policy (admins and self-read remain)
DROP POLICY IF EXISTS "Same filial can read colleagues" ON public.profiles;

-- Convert has_role to SECURITY INVOKER (users can read their own user_roles rows,
-- and has_role is only ever called with auth.uid())
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
