-- Only attach a migrated role/scope to an account whose email is already confirmed at creation
-- (the server-side demo provisioning confirms it); a self-service sign-up using a demo address gets no role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare d public.demo_accounts;
begin
  if new.email_confirmed_at is not null then
    select * into d from public.demo_accounts where lower(email) = lower(new.email);
  end if;
  insert into public.profiles(id, legacy_user_id, username, email, full_name)
  values (new.id, d.legacy_user_id, coalesce(d.username, split_part(new.email, '@', 1)), new.email, coalesce(d.full_name, new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  if d.legacy_user_id is not null then
    insert into public.user_roles(user_id, role, district_id, godown_id, shop_id)
    values (new.id, d.role, d.district_id, d.godown_id, d.shop_id)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;
