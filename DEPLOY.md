# Деплой Codwey: GitHub / Pages / VDS / домен

## 1. GitHub — полный проект

В репозиторий кладётся **всё**, кроме `node_modules`, сборок и секретов:

- `src/` — сайт (каталог, корзина, чат, страницы)
- `public/` — фавикон, og-картинка
- `vds/openrouter-proxy.mjs` — прокси ИИ для VDS
- `package.json`, `vite.config.ts`, `tsconfig.json`

Не коммитить: `.env`, ключи OpenRouter, `node_modules`, `.vercel`.

## 2. GitHub Pages — только витрина

Pages умеет **статику**. Если включить Pages с ветки `main` / папки `/docs` или `gh-pages`:

- Откроются каталог, карточки, корзина в браузере.
- Кнопка менеджера справа снизу. На телефоне — панель: Готовое / На заказ / Менеджер.
- Запросы к ИИ должны идти **на VDS**, иначе чат не ответит.

Чтобы чат с Pages ходил на VDS, на прокси должен быть CORS с `https://<user>.github.io` и `https://codwey.su`.

Этот репозиторий — TanStack Start (сервер есть). Для чистого Pages нужна отдельная статическая выкладка. Пока проще: nginx на VDS отдаёт сайт **или** оставляете SPA на Pages + API на VDS.

## 3. VDS (1 CPU, 1 GB, 10 GB) — скрипты и ИИ

Сюда:

1. Tor
2. Node.js 20+
3. `vds/openrouter-proxy.mjs`
4. ключ OpenRouter

```bash
sudo apt update
sudo apt install -y tor nodejs npm
sudo systemctl enable --now tor

export OPENROUTER_API_KEY=sk-or-...
export TOR_SOCKS_PROXY=127.0.0.1:9050
export PORT=8787
export ALLOW_ORIGIN=https://codwey.su
node vds/openrouter-proxy.mjs
```

Модель: `qwen/qwen3.7-flash`. Трафик на OpenRouter идёт через SOCKS5 Tor — это обход 403 с российского IP.

Держать процесс: `systemd` или `pm2`.

Nginx на VDS может:

- проксировать `/api/chat` → `127.0.0.1:8787`
- (по желанию) отдавать собранный сайт на `codwey.su`

## 4. Домен `codwey.su`

- Если сайт на Pages: у регистратора CNAME/A на GitHub Pages, в настройках репозитория Custom domain = `codwey.su`.
- Если сайт на VDS: A-запись на IP VDS, nginx слушает 80/443 (certbot).

## 5. Секреты

| Переменная | Где |
|---|---|
| `OPENROUTER_API_KEY` | только VDS, не в GitHub |
| `TOR_SOCKS_PROXY` | VDS, обычно `127.0.0.1:9050` |
| `ALLOW_ORIGIN` | VDS, `https://codwey.su` |
| `PLATEGA_MERCHANT_ID` | VDS / хост сайта, из кабинета Platega |
| `PLATEGA_SECRET` | VDS / хост сайта, заголовок `X-Secret` |
| `SITE_URL` | `https://codwey.su` — return/fail URL оплаты |

Ключи в репозиторий не класть.

## 6. Platega

Пока ключей нет, оплата работает как демо-страница (способ → сумма → «Оплатить»).

Когда получите доступ в [platega.io](https://platega.io):

```bash
export PLATEGA_MERCHANT_ID=uuid-из-кабинета
export PLATEGA_SECRET=секрет-из-настроек
export SITE_URL=https://codwey.su
```

Сайт шлёт `POST https://app.platega.io/transaction/process` с заголовками `X-MerchantId` и `X-Secret`. Callback URL в кабинете Platega: `https://codwey.su/pay/success` пока не обязателен — success/fail задаются в `return` и `failedUrl`.
