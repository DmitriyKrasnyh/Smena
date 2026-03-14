-- Запустить в Supabase: SQL Editor

-- 1. Получить данные приглашения по токену (обходит RLS)
CREATE OR REPLACE FUNCTION public.check_invite_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invites%rowtype;
  v_restaurant_name text;
BEGIN
  SELECT * INTO v_invite
  FROM invites
  WHERE token = p_token
    AND used = false
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false);
  END IF;

  SELECT name INTO v_restaurant_name
  FROM restaurants
  WHERE id = v_invite.restaurant_id;

  RETURN json_build_object(
    'valid',           true,
    'id',              v_invite.id,
    'role',            v_invite.role,
    'email',           v_invite.email,
    'restaurant_id',   v_invite.restaurant_id,
    'restaurant_name', COALESCE(v_restaurant_name, '')
  );
END;
$$;

-- 2. Принять приглашение: создать профиль + отметить ссылку как использованную
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_token     text,
  p_user_id   uuid,
  p_email     text,
  p_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invites%rowtype;
BEGIN
  SELECT * INTO v_invite
  FROM invites
  WHERE token = p_token
    AND used = false
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Ссылка недействительна или устарела');
  END IF;

  INSERT INTO profiles (id, email, full_name, role, restaurant_id)
  VALUES (p_user_id, p_email, p_full_name, v_invite.role, v_invite.restaurant_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name     = excluded.full_name,
    role          = excluded.role,
    restaurant_id = excluded.restaurant_id;

  UPDATE invites SET used = true WHERE id = v_invite.id;

  RETURN json_build_object('success', true);
END;
$$;

-- 3. Выдать права на вызов анонимным и авторизованным пользователям
GRANT EXECUTE ON FUNCTION public.check_invite_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, uuid, text, text) TO anon, authenticated;
