# Backend (VDS, /opt/codwey-backend) — reference copy

`app.py` — FastAPI (`/api/health`, `/api/order`) + aiogram 3 support bot @codway_bot. Prices: `site/data/*.json` (copy to the VDS).

Env (/etc/codwey.env): BOT_TOKEN, ADMIN_ID, DATABASE_PATH, ALLOWED_ORIGINS.

AI manager (off until you set the flag; keys stay out of logs and out of the site deploy):
- `AI_MANAGER_MODE=off|admin_only|all` — default `off`. `admin_only` shows «🤖 Обсудить проект с AI» and «↩️ Выйти из AI» only to ADMIN_ID.
- `NVIDIA_KEYS` — newline or comma separated keys for `https://integrate.api.nvidia.com/v1/chat/completions` (models `nvidia/nemotron-3.5-super-vl-120b-a12b`, then `nvidia/nemotron-3.5-lightning-30b-a3b`).
- `MISTRAL_KEYS` — same format for `https://api.mistral.ai/v1/chat/completions`, model `mistral-small-latest`. One 1.5s backoff on HTTP 429, then at most one other key (keys in one workspace share a quota).
- `AI_DAILY_CAP=800` — global messages per Krasnoyarsk day. Also fixed: 1 message / 3s and 40/day per user (`AI_USER_INTERVAL`, `AI_USER_DAILY`), 12 turns, 12 history messages, 20s timeout.
- Put the keys in root-only `/etc/codwey/ai.env` (`chmod 0600`) and add a systemd drop-in, not in the site repo:

```
# /etc/systemd/system/codwey.service.d/ai.conf
[Service]
EnvironmentFile=/etc/codwey/ai.env
```

Then `systemctl daemon-reload && systemctl restart codwey`. Do not print `systemctl show Environment`. The hosted NVIDIA trial endpoint is not a production licence for client traffic; keep `AI_MANAGER_MODE=off` or `admin_only` until the provider terms allow it.

Optional:
- `TELEGRAM_API_BASE=https://<relay>` — Bot API relay (see ../telegram-relay-worker.js)
- `TELEGRAM_PROXY=socks5://user:pass@host:port` or `http://…` (aiohttp-socks installed)
- `SMTP_HOST, SMTP_PORT (465|587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ALERT_EMAIL` — e-mail if Telegram to the owner is stuck > 10 min

Routes are tried in order direct → relay → proxy; health worker switches automatically and returns to direct when it recovers.
