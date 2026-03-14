-- =============================================
-- СМЕНА — Поддержка нескольких точек у владельца
-- Запустить в Supabase SQL Editor
-- =============================================

-- 1. ТАБЛИЦА СВЯЗИ ВЛАДЕЛЕЦ → РЕСТОРАН
-- =============================================
CREATE TABLE IF NOT EXISTS owner_restaurants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, restaurant_id)
);

ALTER TABLE owner_restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_restaurants: owner select" ON owner_restaurants
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner_restaurants: owner insert" ON owner_restaurants
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner_restaurants: owner delete" ON owner_restaurants
  FOR DELETE USING (owner_id = auth.uid());


-- 2. МИГРАЦИЯ: занести существующих владельцев
-- =============================================
INSERT INTO owner_restaurants (owner_id, restaurant_id)
SELECT id, restaurant_id
FROM profiles
WHERE role = 'owner' AND restaurant_id IS NOT NULL
ON CONFLICT (owner_id, restaurant_id) DO NOTHING;


-- 3. ОБНОВИТЬ ПОЛИТИКУ ЧТЕНИЯ РЕСТОРАНОВ
--    Владелец должен видеть все свои рестораны (не только активный)
-- =============================================
DROP POLICY IF EXISTS "restaurants_select" ON restaurants;

CREATE POLICY "restaurants_select" ON restaurants FOR SELECT
  USING (
    id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    OR id IN (
      SELECT restaurant_id FROM owner_restaurants WHERE owner_id = auth.uid()
    )
  );


-- 4. ОБНОВИТЬ register_owner: добавить запись в owner_restaurants
-- =============================================
DROP FUNCTION IF EXISTS register_owner(uuid, text, text, text);

CREATE OR REPLACE FUNCTION register_owner(
  p_user_id       uuid,
  p_email         text,
  p_full_name     text,
  p_restaurant_name text
) RETURNS void AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  -- Создать ресторан
  INSERT INTO restaurants (name)
  VALUES (p_restaurant_name)
  RETURNING id INTO v_restaurant_id;

  -- Создать профиль
  INSERT INTO profiles (id, email, full_name, role, restaurant_id)
  VALUES (p_user_id, p_email, p_full_name, 'owner', v_restaurant_id)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        restaurant_id = EXCLUDED.restaurant_id;

  -- Зарегистрировать владение
  INSERT INTO owner_restaurants (owner_id, restaurant_id)
  VALUES (p_user_id, v_restaurant_id)
  ON CONFLICT (owner_id, restaurant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. СОЗДАТЬ ДОПОЛНИТЕЛЬНУЮ ТОЧКУ (вызывается из клиента)
-- =============================================
CREATE OR REPLACE FUNCTION create_additional_restaurant(
  p_name text
) RETURNS uuid AS $$
DECLARE
  v_restaurant_id uuid;
  v_user_id       uuid := auth.uid();
  v_role          text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role != 'owner' THEN
    RAISE EXCEPTION 'Только владелец может создавать точки';
  END IF;

  INSERT INTO restaurants (name) VALUES (p_name) RETURNING id INTO v_restaurant_id;

  INSERT INTO owner_restaurants (owner_id, restaurant_id)
  VALUES (v_user_id, v_restaurant_id);

  RETURN v_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. ПЕРЕКЛЮЧИТЬ АКТИВНУЮ ТОЧКУ
-- =============================================
CREATE OR REPLACE FUNCTION switch_restaurant(
  p_restaurant_id uuid
) RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Проверить, что ресторан принадлежит владельцу
  IF NOT EXISTS (
    SELECT 1 FROM owner_restaurants
    WHERE owner_id = v_user_id AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Вы не являетесь владельцем этой точки';
  END IF;

  UPDATE profiles SET restaurant_id = p_restaurant_id WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. ПЕРЕИМЕНОВАТЬ РЕСТОРАН (только свой)
-- =============================================
CREATE OR REPLACE FUNCTION rename_restaurant(
  p_restaurant_id uuid,
  p_name          text
) RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM owner_restaurants
    WHERE owner_id = v_user_id AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Вы не являетесь владельцем этой точки';
  END IF;

  UPDATE restaurants SET name = p_name WHERE id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
