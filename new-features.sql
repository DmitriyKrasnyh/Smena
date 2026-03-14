-- =============================================
-- СМЕНА — новые функции
-- Запустить в Supabase SQL Editor
-- =============================================

-- 1. КАТЕГОРИИ ЗАДАЧ
-- =============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

UPDATE tasks SET category = 'other' WHERE category IS NULL;
UPDATE task_templates SET category = 'other' WHERE category IS NULL;


-- 2. ОБЪЯВЛЕНИЯ
-- =============================================
CREATE TABLE IF NOT EXISTS announcements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  content       text        NOT NULL,
  created_by    uuid        NOT NULL REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements: team view" ON announcements
  FOR SELECT USING (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "announcements: managers insert" ON announcements
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'manager')
  );

CREATE POLICY "announcements: creator delete" ON announcements
  FOR DELETE USING (
    created_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'manager')
  );


-- 3. УВЕДОМЛЕНИЯ
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL,
  type          text        NOT NULL,  -- task_assigned | task_status | task_comment | announcement
  title         text        NOT NULL,
  body          text,
  task_id       uuid        REFERENCES tasks(id) ON DELETE CASCADE,
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: user select" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: user mark read" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications: team insert" ON notifications
  FOR INSERT WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

-- Индекс для быстрого получения уведомлений пользователя
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);


-- 4. ЛОГ АКТИВНОСТИ ЗАДАЧИ
-- =============================================
CREATE TABLE IF NOT EXISTS task_activity (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  full_name  text,       -- денормализовано для истории
  action     text        NOT NULL,  -- created | status_changed | completed | edited | comment_added
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_activity: team select" ON task_activity
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "task_activity: auth insert" ON task_activity
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS task_activity_task_id_idx ON task_activity(task_id, created_at DESC);
