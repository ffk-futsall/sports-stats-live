-- Keep the security-definer helper outside the exposed API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_app_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_accounts a
    join auth.users u on u.id = a.user_id
    where a.user_id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_app_admin() from public, anon;
grant execute on function private.is_app_admin() to authenticated;
alter policy "Admin media insert" on storage.objects with check (bucket_id = 'media' and private.is_app_admin());
alter policy "Admin media update" on storage.objects using (bucket_id = 'media' and private.is_app_admin()) with check (bucket_id = 'media' and private.is_app_admin());
alter policy "Admin media delete" on storage.objects using (bucket_id = 'media' and private.is_app_admin());
alter policy "Admin media select" on storage.objects using (bucket_id = 'media' and private.is_app_admin());
drop function public.is_app_admin();
