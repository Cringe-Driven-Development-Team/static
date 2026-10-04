# static

Статические файлы продукта — картинки и шрифты. CI выкладывает их в бакет статики, клиент берёт их по
`https://static.cellestial.ru/<путь>`.

Бакет, CDN-ресурс перед ним и домен создаёт [infra](https://github.com/Cringe-Driven-Development-Team/infra)
(`pulumi/README.md`, «Бакет статики»).

## Как из пути получается адрес

Каталог `static/` один в один ложится в корень бакета:

| Где | Путь |
|---|---|
| репозиторий | `static/img/moon.png` |
| бакет статики (`cellestial-static-0`) | `img/moon.png` |
| адрес | `https://static.cellestial.ru/img/moon.png` |

Файлы отдаются с `Cache-Control: public, max-age=31536000, immutable`: браузер и CDN держат файл год
и за новой версией не приходят.

## Как добавить файл

1. Положить файл в `static/` — картинки в `static/img/`.
2. `bun install`, затем `bun run check`.
3. Открыть PR в `main`. После мержа файл выкладывается сам, в Telegram приходит сообщение.

> [!WARNING]
> Новая версия файла — новое имя (`moon-2.png`). Существующий файл нельзя изменить, переименовать
> или удалить: на него ссылаются открытые вкладки и прежние релизы клиента, а кэш держит его год.
> Из бакета CI ничего не удаляет.

Что проверяет `bun run check`:

- расширение из списка: `png`, `jpg`, `jpeg`, `webp`, `avif`, `svg`, `gif`, `ico`, `woff2`;
- размер файла — не больше 2 МБ;
- в именах файлов и каталогов — строчная латиница, цифры, `-`, `_` и `.`;
- ни один файл, который уже есть в `main`, не изменён, не переименован и не удалён (сравнение с
  `origin/main`, перед проверкой — `git fetch origin main`).

## CI

`.github/workflows/ci.yml`, скрипт — `scripts/` (TypeScript под `bun`):

```
PR и push в main
  → Check: bun install --frozen-lockfile → bun run check
push в main (environment production)
  → Upload: static/ → s3://<бакет>/ → Send to tg
```

| Команда | Что делает |
|---|---|
| `bun run check` | проверка типов скрипта и содержимого `static/` |
| `bun run upload` | `static/**` → `s3://<бакет>/**`, `Content-Type` по расширению |
| `bun scripts/index.ts notify <success\|failure\|cancelled> [sha]` | сообщение в Telegram |

`upload` не перезаписывает ключ, который уже есть в бакете: содержимое совпадает — пропуск,
отличается — ошибка, и не загружается ничего. Повторный запуск безопасен.

## Секреты и переменные

`Upload` работает в environment `production` (`Settings` → `Environments`), доступном только из `main`:

| Что | Имя | Откуда (`pulumi stack output` в `infra`) |
|---|---|---|
| секрет | `S3_ACCESS_KEY` | `s3AccessKey --show-secrets` |
| секрет | `S3_SECRET_KEY` | `s3SecretKey --show-secrets` |
| переменная | `S3_ENDPOINT` | `s3Endpoint` |
| переменная | `S3_BUCKET` | `staticBucket` |

`TELEGRAM_BOT_TOKEN` (секрет), `TELEGRAM_CHAT_ID` и `TELEGRAM_TOPIC_ID` (переменные) заданы на уровне
организации.

> [!WARNING]
> Ключ S3 действует на весь проект Selectel, а репозиторий публичный: ограничение environment
> веткой `main` снимать нельзя.

## Задачи и PR

По [CONTRIBUTING.md](https://github.com/Cringe-Driven-Development-Team/.github/blob/main/CONTRIBUTING.md)
организации.
