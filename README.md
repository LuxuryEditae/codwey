# Codwey

Студия готовых сайтов, Telegram-ботов, приложений и Roblox-игр. ИИ-менеджер Вей считает смету в чате.

Сайт: [codwey.su](https://codwey.su) · репозиторий: [LuxuryEditae/codwey](https://github.com/LuxuryEditae/codwey)

## Что куда класть

Подробно: [DEPLOY.md](./DEPLOY.md)

| Куда | Что |
|---|---|
| **GitHub** | Весь этот репозиторий — исходники сайта |
| **GitHub Pages** | Только статическая сборка фронта. Чат с ИИ на Pages **не заработает** сам по себе |
| **VDS** (1 CPU / 1 GB) | `vds/openrouter-proxy.mjs` + Tor. Прокси к OpenRouter (`qwen/qwen3.7-flash`), обход 403 с российских IP |
| **Домен codwey.su** | A/CNAME на Pages или на VDS nginx |

## Локально

```bash
npm install
npm run dev
```

Чат на превью работает через серверные функции приложения. На своём VDS чат идёт через прокси в папке `vds/`.
