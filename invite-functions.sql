-- Запустить в Supabase: SQL Editor

-- 1. Получить данные приглашения по токену (обходит RLS)
create or replace function public.check_invite_by_token(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_restaurant_name text;
begin
  select * into v_invite
  from invites
  where token = p_token
    and used = false
    and expires_at > now();

  if not found then
    return json_build_object('valid', false);
  end if;

  select name into v_restaurant_name
  from restaurants
  where id = v_invite.restaurant_id;

  return json_build_object(
    'valid',           true,
    'id',              v_invite.id,
    'role',            v_invite.role,
    'email',           v_invite.email,
    'restaurant_id',   v_invite.restaurant_id,
    'restaurant_name', coalesce(v_restaurant_name, '')
  );
end;
$$;

-- 2. Принять приглашение: создать профиль + отметить ссылку как использованную
create or replace function public.accept_invite(
  p_token    uuid,
  p_user_id  uuid,
  p_email    text,
  p_full_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite
  from invites
  where token = p_token
    and used = false
    and expires_at > now();

  if not found then
    return json_build_object('error', 'Ссылка недействительна или устарела');
  end if;

  insert into profiles (id, email, full_name, role, restaurant_id)
  values (p_user_id, p_email, p_full_name, v_invite.role, v_invite.restaurant_id)
  on conflict (id) do update set
    full_name    = excluded.full_name,
    role         = excluded.role,
    restaurant_id = excluded.restaurant_id;

  update invites set used = true where id = v_invite.id;

  return json_build_object('success', true);
end;
$$;
