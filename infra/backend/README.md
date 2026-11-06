# Backend (VDS, /opt/codwey-backend) — reference copy

`app.py` — FastAPI (`/api/health`, `/api/order`) + aiogram 3 support bot @codway_bot. Prices: `site/data/*.json` (copy to the VDS).

Env (/etc/codwey.env): BOT_TOKEN, ADMIN_ID, DATABASE_PATH, ALLOWED_ORIGINS.

AI manager (off until you set the flag; keys stay out of logs and out of the site deploy):
- `AI_MANAGER_MODE=off|admin_only|all` — default `off`. `admin_only` shows the AI entry points only to `ADMIN_ID` and `AI_ALLOWED_IDS`.
- `AI_ALLOWED_IDS` — comma-separated Telegram ids. In `admin_only` they can open AI together with `ADMIN_ID`. Entry points: reply button, `/ai`, and the inline button «Обсудить проект с AI» under `/start`.
- `PAID_BASE_URL` — default `https://polza.ai/api/v1`. The only model provider: `{base}/chat/completions`, Bearer auth, 20s timeout. HTTP 429 tries the next `PAID_KEYS` entry, with one 1.5s backoff per message. The attempt stops after 25s and the chat goes to a person.
- `PAID_KEYS` — comma or newline separated keys.
- `PAID_MODELS` — comma list, default `google/gemma-4-31b-it`.
- `PAID_DAILY_RUB_CAP` — default `30`. If a response includes `usage.cost_rub`, that amount is added to the Krasnoyarsk-day total and only the sum is logged. At or over the cap the paid call is skipped and the chat goes to a person.
- `STT_MODEL` — default `openai/whisper-large-v3-turbo`, via `{base}/audio/transcriptions`, language `ru`, 60s budget, audio up to about 2 minutes. Photos in AI mode are sent as a data URL (max 5 MB) and only a short note is stored.
- `AI_DAILY_CAP=800` — global messages per Krasnoyarsk day. Also fixed: 1 message / 3s and 40/day per user (`AI_USER_INTERVAL`, `AI_USER_DAILY`), 12 turns, 12 history messages, 20s per request inside the 25s budget.
- Put the keys in root-only `/etc/codwey/ai.env` (`chmod 0600`) and add a systemd drop-in, not in the site repo:

```
# /etc/systemd/system/codwey.service.d/ai.conf
[Service]
EnvironmentFile=/etc/codwey/ai.env
```

Then `systemctl daemon-reload && systemctl restart codwey`. Do not print `systemctl show Environment`. Keep `AI_MANAGER_MODE=off` or `admin_only` until you want clients in the AI dialog.

Optional:
- `TELEGRAM_API_BASE=https://<relay>` — Bot API relay (see ../telegram-relay-worker.js)
- `TELEGRAM_PROXY=socks5://user:pass@host:port` or `http://…` (aiohttp-socks installed)
- `SMTP_HOST, SMTP_PORT (465|587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ALERT_EMAIL` — e-mail if Telegram to the owner is stuck > 10 min

Routes are tried in order direct → relay → proxy; health worker switches automatically and returns to direct when it recovers.
