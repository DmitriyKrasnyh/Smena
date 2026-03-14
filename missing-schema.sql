-- =============================================
-- СМЕНА — Missing tables & columns migration
-- Запустить в Supabase SQL Editor
-- =============================================

-- 1. ДОБАВИТЬ ОТСУТСТВУЮЩИЕ КОЛОНКИ В tasks
-- =============================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other'
    CHECK (category IN ('kitchen','hall','bar','admin','cleaning','other'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_note text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_template_id uuid;


-- 2. ТАБЛИЦА ШАБЛОНОВ ПОВТОРЯЮЩИХСЯ ЗАДАЧ
-- =============================================
CREATE TABLE IF NOT EXISTS task_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  title            text        NOT NULL,
  description      text,
  priority         text        NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low','medium','high')),
  category         text        DEFAULT 'other',
  assigned_to      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  random_assignees uuid[]      DEFAULT NULL,
  recurrence_type  text        NOT NULL DEFAULT 'daily'
                               CHECK (recurrence_type IN ('daily','weekly')),
  recurrence_days  integer[]   DEFAULT NULL,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates_select" ON task_templates;
CREATE POLICY "task_templates_select" ON task_templates FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "task_templates_insert" ON task_templates;
CREATE POLICY "task_templates_insert" ON task_templates FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','manager')
  );

DROP POLICY IF EXISTS "task_templates_update" ON task_templates;
CREATE POLICY "task_templates_update" ON task_templates FOR UPDATE
  USING (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','manager')
  );

DROP POLICY IF EXISTS "task_templates_delete" ON task_templates;
CREATE POLICY "task_templates_delete" ON task_templates FOR DELETE
  USING (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','manager')
  );


-- 3. ЧЕК-ЛИСТ ЗАДАЧИ
-- =============================================
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  completed  boolean     NOT NULL DEFAULT false,
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select" ON task_checklist_items;
CREATE POLICY "checklist_select" ON task_checklist_items FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "checklist_insert" ON task_checklist_items;
CREATE POLICY "checklist_insert" ON task_checklist_items FOR INSERT
  WITH CHECK (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "checklist_update" ON task_checklist_items;
CREATE POLICY "checklist_update" ON task_checklist_items FOR UPDATE
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "checklist_delete" ON task_checklist_items;
CREATE POLICY "checklist_delete" ON task_checklist_items FOR DELETE
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));


-- 4. КОММЕНТАРИИ К ЗАДАЧЕ
-- =============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON task_comments;
CREATE POLICY "comments_select" ON task_comments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "comments_insert" ON task_comments;
CREATE POLICY "comments_insert" ON task_comments FOR INSERT
  WITH CHECK (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "comments_delete" ON task_comments;
CREATE POLICY "comments_delete" ON task_comments FOR DELETE
  USING (author_id = auth.uid());


-- 5. ИСТОРИЯ АКТИВНОСТИ ЗАДАЧИ
-- =============================================
CREATE TABLE IF NOT EXISTS task_activity (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  full_name  text,
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON task_activity;
CREATE POLICY "activity_select" ON task_activity FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "activity_insert" ON task_activity;
CREATE POLICY "activity_insert" ON task_activity FOR INSERT
  WITH CHECK (task_id IN (
    SELECT id FROM tasks WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));


-- 6. УВЕДОМЛЕНИЯ
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type          text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  task_id       uuid        REFERENCES tasks(id) ON DELETE SET NULL,
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());


-- 7. ОБЪЯВЛЕНИЯ
-- =============================================
CREATE TABLE IF NOT EXISTS announcements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  content       text        NOT NULL,
  created_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON announcements;
CREATE POLICY "announcements_select" ON announcements FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "announcements_insert" ON announcements;
CREATE POLICY "announcements_insert" ON announcements FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','manager')
  );

DROP POLICY IF EXISTS "announcements_delete" ON announcements;
CREATE POLICY "announcements_delete" ON announcements FOR DELETE
  USING (created_by = auth.uid());


-- 8. ФУНКЦИЯ ГЕНЕРАЦИИ ПОВТОРЯЮЩИХСЯ ЗАДАЧ
-- =============================================
CREATE OR REPLACE FUNCTION generate_recurring_tasks(p_restaurant_id uuid)
RETURNS void AS $$
DECLARE
  tmpl         RECORD;
  today_date   date    := CURRENT_DATE;
  today_dow    integer := EXTRACT(DOW FROM CURRENT_DATE)::integer;
  v_assigned   uuid;
  v_count      integer;
  v_arr_len    integer;
BEGIN
  FOR tmpl IN
    SELECT * FROM task_templates
    WHERE restaurant_id = p_restaurant_id AND active = true
  LOOP
    -- Проверяем день недели для weekly шаблонов
    IF tmpl.recurrence_type = 'weekly' THEN
      IF tmpl.recurrence_days IS NULL OR NOT (today_dow = ANY(tmpl.recurrence_days)) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Проверяем, не создавали ли уже задачу сегодня из этого шаблона
    SELECT COUNT(*) INTO v_count
    FROM tasks
    WHERE source_template_id = tmpl.id
      AND created_at::date = today_date;

    IF v_count > 0 THEN CONTINUE; END IF;

    -- Определяем исполнителя
    v_assigned := tmpl.assigned_to;

    IF tmpl.random_assignees IS NOT NULL THEN
      v_arr_len := array_length(tmpl.random_assignees, 1);
      IF v_arr_len > 0 THEN
        v_assigned := tmpl.random_assignees[
          1 + floor(random() * v_arr_len)::integer
        ];
      END IF;
    END IF;

    -- Создаём задачу
    INSERT INTO tasks (
      title, description, priority, category,
      assigned_to, restaurant_id, status, source_template_id
    ) VALUES (
      tmpl.title, tmpl.description, tmpl.priority, COALESCE(tmpl.category, 'other'),
      v_assigned, p_restaurant_id, 'new', tmpl.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. STORAGE BUCKETS
-- =============================================
-- Создайте бакеты вручную в Supabase Dashboard → Storage → New bucket:
--   • avatars    (Public: true)
--   • task-photos (Public: true)
--
-- Затем выполните политики для task-photos:

DROP POLICY IF EXISTS "task_photos_select" ON storage.objects;
CREATE POLICY "task_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');

DROP POLICY IF EXISTS "task_photos_insert" ON storage.objects;
CREATE POLICY "task_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_photos_update" ON storage.objects;
CREATE POLICY "task_photos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'task-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
