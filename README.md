# CodWay — codway.su

Static site, prerendered by a zero-dependency Node generator.

- `site/build.mjs` — pages, texts, SEO (title/description/canonical/og, JSON-LD Organization/Service/FAQPage/Breadcrumb), sitemap.xml, robots.txt
- `site/data/pricing.json`, `site/data/solutions.json` — prices (keep in sync with `/opt/codwey-backend/*.json` on the VDS)
- `site/assets/` — style.css, app.js (calculator + lead form → https://api.codway.su/api/order)
- `site/static/` — CNAME, .nojekyll, favicon, og.png, Google/Yandex verification files (copied as is)
- `infra/telegram-relay-worker.js` — optional Cloudflare Worker relay for api.telegram.org

Build locally: `node site/build.mjs` → `dist/`. Deploy: push to `main`, GitHub Actions builds and publishes to Pages.
