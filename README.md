<div align="center">
  <img src="public/icon.svg" width="72" height="72" alt="Смена" />
  <h1>Смена</h1>
  <p>Система управления сменами, задачами и командой для ресторанного бизнеса</p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" />
  </p>

  <p>
    <a href="#возможности">Возможности</a> ·
    <a href="#стек">Стек</a> ·
    <a href="#быстрый-старт">Быстрый старт</a> ·
    <a href="#структура-проекта">Структура</a> ·
    <a href="#деплой">Деплой</a>
  </p>
</div>

---

## О проекте

**Смена** — веб-приложение для управления командой в заведениях общественного питания. Позволяет владельцу сети ресторанов и управляющим контролировать задачи, составлять расписание смен и строить многоступенчатые рабочие процессы — всё в одном интерфейсе.

### Роли пользователей

| Роль | Возможности |
|---|---|
| **Владелец** | Все заведения сети, переключение между точками, обзор команды и задач |
| **Управляющий** | Задачи, расписание, команда, аналитика, цепочки задач |
| **Сотрудник** | Просмотр и выполнение назначенных задач |

---

## Возможности

### Задачи
- Создание, назначение и отслеживание задач с приоритетами и статусами
- Категории, дедлайны, фото-отчёты
- Шаблоны с повторением (ежедневно / по дням недели) и точным временем запуска
- Фильтрация и сортировка по статусу, дате, исполнителю

### Цепочки задач
- Конструктор многоступенчатых процессов (выполнение одного шага разблокирует следующий)
- Визуальный редактор с перестановкой шагов
- Запуск цепочки для всей команды одним кликом

### Расписание
- Недельная сетка «сотрудник × день» с цветовым кодированием
- Ввод времени начала и окончания смены, заметки
- Повторяющиеся шаблоны смен (применяются автоматически)
- Итоговые часы по каждому сотруднику и дню
- Разделение по заведениям (для владельцев с несколькими точками)

### Обзор заведений
- Иерархическое дерево: заведение → управляющий → сотрудники
- Прогресс-кольцо выполнения задач по каждой точке
- Быстрое переключение активного заведения

### Команда и приглашения
- Добавление сотрудников по инвайт-ссылке
- Управление ролями

### Прочее
- Тёмный сайдбар + светлый контент — комфортный рабочий интерфейс
- Command Palette (быстрые действия с клавиатуры)
- Киоск-режим для планшетов на кассе
- Уведомления через toast (Sonner)
- Полная поддержка кириллицы (шрифт Geologica + JetBrains Mono)

---

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | [Next.js 15](https://nextjs.org) (App Router, Server Components) |
| Язык | TypeScript 5 |
| Стили | Tailwind CSS 4 |
| UI-компоненты | [shadcn/ui](https://ui.shadcn.com) + Lucide React |
| База данных + Auth | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security) |
| Хостинг | [Render](https://render.com) |
| Шрифты | Geologica, JetBrains Mono (Google Fonts) |

---

## Быстрый старт

### Требования

- Node.js 18+
- npm / yarn / pnpm
- Аккаунт [Supabase](https://supabase.com)

### 1. Клонирование

```bash
git clone https://github.com/DmitriyKrasnyh/Smena.git
cd Smena
npm install
```

### 2. Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Значения `SUPABASE_URL` и `SUPABASE_ANON_KEY` находятся в настройках вашего проекта на supabase.com → **Project Settings → API**.

### 3. База данных

Выполните SQL из файла [`supabase-schema.sql`](supabase-schema.sql) в редакторе запросов Supabase (SQL Editor).

### 4. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

---

## Структура проекта

```
src/
├── app/
│   ├── dashboard/
│   │   ├── analytics/     # Аналитика (заглушка)
│   │   ├── chains/        # Конструктор цепочек задач
│   │   ├── overview/      # Обзор всех заведений (только владелец)
│   │   ├── schedule/      # Расписание смен
│   │   ├── settings/      # Настройки профиля и пароля
│   │   ├── tasks/         # Задачи
│   │   └── team/          # Команда и приглашения
│   ├── auth/              # Callback, forgot-password
│   ├── invite/            # Страница принятия приглашения
│   ├── login/
│   ├── register/
│   └── page.tsx           # Лендинг
├── components/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   ├── CommandPalette.tsx
│   └── ui/                # shadcn/ui компоненты
└── lib/
    ├── supabase/           # Клиент и серверный хелпер
    ├── types.ts
    └── utils.ts
```

---

## База данных

Основные таблицы:

| Таблица | Описание |
|---|---|
| `profiles` | Профили пользователей (роль, restaurant_id, аватар) |
| `restaurants` | Заведения |
| `owner_restaurants` | Связь владелец ↔ заведение |
| `tasks` | Задачи |
| `task_templates` | Шаблоны повторяющихся задач |
| `task_chains` | Цепочки задач |
| `task_chain_steps` | Шаги цепочки |
| `shifts` | Смены сотрудников |
| `shift_templates` | Шаблоны повторяющихся смен |
| `invites` | Инвайт-ссылки |

RLS включён на всех таблицах. Функции `SECURITY DEFINER` используются для кросс-ресторанных запросов (например, `get_owner_overview()`).

---

## Деплой

### Render (рекомендуется)

1. Создайте новый **Web Service** в [Render](https://render.com)
2. Подключите репозиторий `DmitriyKrasnyh/Smena`
3. Укажите ветку: `main`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Добавьте переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (ваш домен на Render, например `https://smena.onrender.com`)

> **Примечание:** На бесплатном тарифе Render доступно ~512 МБ RAM. Проект использует Next.js 15 с webpack (не Turbopack) для совместимости с этим ограничением.

### Supabase Auth — redirect URL

В Supabase Dashboard → **Authentication → URL Configuration** добавьте в **Redirect URLs**:
```
https://your-app.onrender.com/**
```

---

## Разработка

```bash
# Запуск с hot-reload
npm run dev

# Сборка
npm run build

# Запуск production-сборки локально
npm start

# Линтинг
npm run lint
```

---

## Лицензия

Распространяется под лицензией **MIT**. Подробнее — в файле [LICENSE](LICENSE).

---

<div align="center">
  <sub>Сделано с ☕ by <a href="https://github.com/DmitriyKrasnyh">Dmitriy Krasnykh</a></sub>
</div>
