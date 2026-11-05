# Backend (VDS, /opt/codwey-backend) — reference copy

`app.py` — FastAPI (`/api/health`, `/api/order`) + aiogram 3 support bot @codwey_bot. Prices: `site/data/*.json` (copy to the VDS).

Env (/etc/codwey.env): BOT_TOKEN, ADMIN_ID, DATABASE_PATH, ALLOWED_ORIGINS, optional:
- `TELEGRAM_API_BASE=https://<relay>` — Bot API relay (see ../telegram-relay-worker.js)
- `TELEGRAM_PROXY=socks5://user:pass@host:port` or `http://…` (aiohttp-socks installed)
- `SMTP_HOST, SMTP_PORT (465|587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ALERT_EMAIL` — e-mail if Telegram to the owner is stuck > 10 min

Routes are tried in order direct → relay → proxy; health worker switches automatically and returns to direct when it recovers.
