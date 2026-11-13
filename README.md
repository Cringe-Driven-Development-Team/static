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

## Атрибуция

| Файл | Источник | Лицензия | Обработка |
|---|---|---|---|
| `img/clouds-horizon-1.webp` | карта Earth Clouds, [Solar System Scope](https://www.solarsystemscope.com/textures/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | строки 100–900 равнопрямоугольной карты 2048×1024 растянуты до 3840×640 с перспективным сжатием к горизонту (у кромки вдвое-втрое плотнее), контраст поднят, цвет — бело-лиловый, яркость карты перенесена в альфа-канал; по ширине бесшовна |
| `img/clouds-horizon-2.webp` | карта Earth Clouds 8192×4096, [Solar System Scope](https://www.solarsystemscope.com/textures/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | то же, что у `-1`, но из 8K: строки 400–3600 растянуты до 7680×1280 (двойная плотность для ретины, показывается как 3840×640 px); качество WebP 60, альфа 40 — в лимит 2 МБ |

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
