-- Attach the migrated role/scope once the account's email is confirmed (covers server-side demo
-- provisioning, where confirmation is recorded right after the row is inserted).
create or replace function public.attach_demo_identity(_user_id uuid, _email text)
returns void language plpgsql security definer set search_path = public as $$
declare d public.demo_accounts;
begin
  select * into d from public.demo_accounts where lower(email) = lower(_email);
  if d.legacy_user_id is null then return; end if;
  if exists (select 1 from public.profiles where legacy_user_id = d.legacy_user_id and id <> _user_id) then return; end if;
  insert into public.profiles(id, legacy_user_id, username, email, full_name)
  values (_user_id, d.legacy_user_id, d.username, _email, d.full_name)
  on conflict (id) do update set legacy_user_id = excluded.legacy_user_id, username = excluded.username, full_name = excluded.full_name;
  insert into public.user_roles(user_id, role, district_id, godown_id, shop_id)
  values (_user_id, d.role, d.district_id, d.godown_id, d.shop_id)
  on conflict (user_id, role) do nothing;
end $$;
revoke execute on function public.attach_demo_identity(uuid, text) from public, anon, authenticated;

create or replace function public.handle_user_email_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform public.attach_demo_identity(new.id, new.email);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- Backfill accounts that were already provisioned and confirmed.
do $$
declare u record;
begin
  for u in select id, email from auth.users where email_confirmed_at is not null loop
    perform public.attach_demo_identity(u.id, u.email);
  end loop;
end $$;
