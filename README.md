# ИИ-ассистент для заметок и календаря

Многопользовательское веб-приложение: заметки и календарь управляются на естественном языке —
текстом или голосом. Полное ТЗ — [docs/TZ.md](docs/TZ.md).

**Текущий этап:** 2 — агент по заметкам. Завершены: Этап 0 (каркас), Этап 1 (заметки без ИИ).

## Стек

Next.js 16 (App Router) · TypeScript · Tailwind 4 · PostgreSQL 17 + pgvector · Drizzle ORM ·
Auth.js v5 · Vitest · Playwright · Docker Compose.

## Локальный запуск

Нужны Node.js 22+, pnpm (`corepack enable`) и Docker.

```bash
cp .env.example .env          # заполнить, см. ниже
docker compose up -d db       # PostgreSQL с pgvector на localhost:5433
pnpm install
pnpm db:migrate
pnpm dev                      # http://localhost:3000
pnpm worker                   # фоновые задачи (pg-boss), в отдельном терминале
```

Минимальный `.env` для разработки:

```dotenv
DATABASE_URL=postgres://assistant:assistant@localhost:5433/assistant
TEST_DATABASE_URL=postgres://assistant:assistant@localhost:5433/assistant_test
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
```

### Вход

- **Яндекс ID** — основной способ. Нужны `AUTH_YANDEX_ID` и `AUTH_YANDEX_SECRET` (см. ниже).
- **Dev-вход** — форма «Войти как dev-пользователь» на `/login`. Работает только при
  `NODE_ENV=development` (`pnpm dev`); в production маршрут `/api/dev/login` отвечает 404.

### Регистрация приложения в Яндекс ID

1. Создать приложение на <https://oauth.yandex.ru/client/new> (платформа «Веб-сервисы»).
2. Redirect URI: `<AUTH_URL>/api/auth/callback/yandex`, например
   `http://localhost:3000/api/auth/callback/yandex`.
3. Доступы: «Доступ к логину, имени и фамилии, полу», «Доступ к адресу электронной почты»,
   «Доступ к портрету пользователя».
4. ClientID и Client secret записать в `AUTH_YANDEX_ID` / `AUTH_YANDEX_SECRET`.

OAuth-токены Яндекса после входа не сохраняются — они не нужны (ТЗ, раздел 10).

### Весь стек в Docker

```bash
docker compose up --build     # db → migrate → app (http://localhost:3000) + worker
```

Сервис `app` работает в production-режиме и читает `.env`; там обязательны ключи Яндекс ID.

## Тесты и проверки

```bash
pnpm lint             # ESLint + Prettier
pnpm typecheck        # tsc
pnpm test             # юнит + интеграционные (нужен TEST_DATABASE_URL и запущенная БД)
pnpm test:coverage    # то же с покрытием, порог 70%
pnpm test:e2e         # Playwright: использует pnpm dev на :3000 или поднимает его сам
```

Интеграционные тесты перед прогоном пересоздают схему в `TEST_DATABASE_URL` — не указывайте
там рабочую базу. Внешние сервисы в тестах заменяются моками.

CI (GitHub Actions, `.github/workflows/ci.yml`) запускает lint, typecheck, тесты с покрытием,
сборку и e2e.

## Переменные окружения

| Переменная                             | Обязательна  | Назначение                                  |
| -------------------------------------- | ------------ | ------------------------------------------- |
| `DATABASE_URL`                         | да           | PostgreSQL                                  |
| `TEST_DATABASE_URL`                    | для тестов   | отдельная база для интеграционных тестов    |
| `AUTH_SECRET`                          | да           | секрет Auth.js, ≥ 32 символов               |
| `AUTH_URL`                             | да           | публичный адрес приложения                  |
| `AUTH_TRUST_HOST`                      | за прокси    | `true`, если перед приложением nginx и т.п. |
| `AUTH_YANDEX_ID`, `AUTH_YANDEX_SECRET` | в production | OAuth-приложение Яндекс ID                  |

## Заметки

Страницы: `/notes` (список, поиск, фильтр по тегам), `/notes/new`, `/notes/<id>` (редактор
Markdown), `/notes/<id>/history` (версии и откат), `/notes/trash` (корзина).

REST API (нужна сессия; для POST/PATCH/DELETE — заголовок `Origin` своего сайта):

| Метод и путь                                        | Что делает                                   |
| --------------------------------------------------- | -------------------------------------------- |
| `GET /api/notes?q=&tag=&limit=&offset=`             | список; `q` — полнотекстовый поиск по-русски |
| `POST /api/notes`                                   | создать `{ title?, content, tags? }`         |
| `GET / PATCH / DELETE /api/notes/<id>`              | получить / изменить / удалить в корзину      |
| `POST /api/notes/<id>/restore`                      | восстановить из корзины                      |
| `GET /api/notes/trash`                              | корзина                                      |
| `GET /api/notes/<id>/versions`                      | история версий                               |
| `POST /api/notes/<id>/versions/<versionId>/restore` | откат к версии                               |
| `GET /api/tags`                                     | теги с количеством заметок                   |

Чужая, удалённая или несуществующая заметка — всегда `404`. Заметки из корзины окончательно
удаляет задача `purge-trash` воркера (ежедневно в 03:00 МСК) через 30 дней.

## Миграции

Схема — `src/db/schema.ts`. После изменения: `pnpm db:generate --name <имя>`, затем
`pnpm db:migrate`. Миграции лежат в `src/db/migrations` и коммитятся.

## Подключение Яндекс Календаря

Появится на Этапе 3.
