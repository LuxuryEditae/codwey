#!/usr/bin/env node
/**
 * Codwey OpenRouter proxy for a small VDS (1 CPU / 1 GB).
 *
 * OpenRouter returns 403 from many Russian IPs. Run Tor on the VDS and send
 * traffic through SOCKS5:
 *
 *   sudo apt install tor
 *   sudo systemctl enable --now tor
 *
 *   export OPENROUTER_API_KEY=sk-or-...
 *   export TOR_SOCKS_PROXY=127.0.0.1:9050
 *   export PORT=8787
 *   export ALLOW_ORIGIN=https://codwey.su
 *   node vds/openrouter-proxy.mjs
 *
 * Frontend / GitHub Pages should POST https://api.codwey.su/api/chat
 * with { messages, context } — same shape as the in-app manager.
 */

import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8787);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "https://codwey.su";
const MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.7-flash";
const SOCKS = (process.env.TOR_SOCKS_PROXY || "127.0.0.1:9050").replace(
  /^socks5h?:\/\//i,
  "",
);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "not found" }));
    return;
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "OPENROUTER_API_KEY missing" }));
    return;
  }

  try {
    const incoming = JSON.parse(await readBody(req));
    const payload = JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 1400,
      messages: incoming.messages,
    });
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sS",
        "-g",
        "--max-time",
        "90",
        "--socks5-hostname",
        SOCKS,
        "-X",
        "POST",
        "-H",
        "Content-Type: application/json",
        "-H",
        `Authorization: Bearer ${key}`,
        "-H",
        "HTTP-Referer: https://codwey.su",
        "-H",
        "X-Title: Codwey",
        "-d",
        payload,
        "https://openrouter.ai/api/v1/chat/completions",
      ],
      { maxBuffer: 2_000_000 },
    );
    res.setHeader("Content-Type", "application/json");
    res.end(stdout);
  } catch (err) {
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "proxy failed",
      }),
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Codwey OpenRouter proxy on :${PORT} via Tor ${SOCKS}`);
});
