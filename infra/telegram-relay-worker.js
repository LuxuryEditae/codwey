/**
 * CodWay — Telegram Bot API relay for Cloudflare Workers (free plan is enough).
 * Use it when api.telegram.org is slow/blocked from the VDS in Russia.
 *
 * Setup (5 steps):
 * 1. dash.cloudflare.com → Workers & Pages → Create → Worker "tg-relay" → Deploy.
 * 2. Edit code → paste this file → Deploy.
 * 3. Settings → Variables → add ALLOWED_BOT_ID = 8832827308 (only this bot can use the relay).
 * 4. On the VDS add to /etc/codwey.env:  TELEGRAM_API_BASE=https://tg-relay.<your-subdomain>.workers.dev
 * 5. systemctl restart codwey   (the bot keeps direct access as primary and fails over to the relay automatically;
 *    check with: curl -s https://api.codway.su/api/health)
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only Bot API paths: /bot<token>/<method> and /file/bot<token>/<path>
    const m = url.pathname.match(/^\/(?:file\/)?bot(\d+):[A-Za-z0-9_-]+\//);
    if (!m) return new Response("ok", { status: 200 });
    if (env.ALLOWED_BOT_ID && m[1] !== String(env.ALLOWED_BOT_ID)) return new Response("forbidden", { status: 403 });
    const target = "https://api.telegram.org" + url.pathname + url.search;
    const init = { method: request.method, headers: new Headers(request.headers), redirect: "follow" };
    init.headers.delete("host");
    if (!["GET", "HEAD"].includes(request.method)) init.body = request.body;
    const resp = await fetch(target, init);
    return new Response(resp.body, { status: resp.status, headers: resp.headers });
  },
};
