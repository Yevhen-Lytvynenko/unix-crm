# Unix CRM — деплой

## Локально

1. Поднимите Postgres: из корня репозитория `docker compose up -d`.
2. Строка подключения по умолчанию в `appsettings.json` уже подходит для этого compose.
3. Из папки `backend`: `dotnet ef database update` (при необходимости), затем `dotnet run`.
4. Фронт: `cd frontend && npm run dev`. В dev запросы идут через Vite-прокси на API.

## Продакшен (схема)

- **Фронт (Vercel и т.п.):** сборка `npm run build`, переменная **`VITE_API_BASE_URL`** = публичный URL API **без** завершающего слэша, например `https://api.example.com`.
- **API (Render, Railway, Fly, VPS + Docker):** задайте переменные окружения:
  - `ConnectionStrings__Default` — строка Npgsql (Postgres).
  - `Jwt__Issuer`, `Jwt__Audience`, `Jwt__SigningKey` (минимум 32 символа), `Jwt__AccessTokenMinutes`.
  - `Cors__Origins` — разрешённые origin через **`;` или `,`**, например `https://your-app.vercel.app;https://www.example.com`.
  - `ASPNETCORE_ENVIRONMENT=Production`
- После деплоя API миграции применяются при старте приложения (`MigrateAsync`).

## Docker (только API)

Сборка из каталога `backend`:

```bash
docker build -t unixcrm-api .
docker run -e ConnectionStrings__Default="Host=...;Database=...;Username=...;Password=...;Ssl Mode=Require" \
  -e Jwt__SigningKey="..." -e Cors__Origins="https://..." -p 8080:8080 unixcrm-api
```

## Health check

`GET /health` — ответ `{ "status": "ok", ... }`.

## Миграции (разработка)

```bash
cd backend
$env:UNIXCRM_CONNECTION_STRING="Host=localhost;Port=5432;Database=unixcrm;Username=postgres;Password=postgres"
dotnet ef migrations add <Name> -o Migrations
dotnet ef database update
```

Старый файл `Data/unixcrm.db` (SQLite) больше не используется — данные храните в Postgres.
