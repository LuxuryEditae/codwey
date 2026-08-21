"""ИИ-менеджер Вей: OpenRouter через Tor. Ключ только в .env на VDS."""
from __future__ import annotations

import json
import re
from typing import Any

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import settings

router = APIRouter()

SYSTEM_PROMPT = """Ты — Вей, ИИ-менеджер студии Codwey (codway.su).
Говоришь по-русски, коротко, по делу, без канцелярита и без эмодзи. На «ты».

Codwey продаёт готовые сайты, Telegram-боты, веб-приложения, Roblox-игры и делает то же на заказ.
Цены ниже Авито: готовые сборки и небольшие кастомные работы.

Мы делаем только сайт, бота, приложение или игру. Хостинг, домен, сервер, токены и всё остальное лежит на клиенте.

Каталог готового (₽): PulseShop 1490, TicketGate 1290, QuizPulse 990, SitePulse 2490, FolioKit 1990, ShopPeek 3490, PWA Kit 3990, ObbyStart 1290, TycoonLite 2490.

Правила цен на заказ:
- Telegram-бот: база 990, магазин +400–800, оплата +400, админка +300.
- Лендинг 1990–3490. Магазин-витрина 3490–5990.
- PWA от 3990. Roblox обби от 1290. Парсеры от 790.
- Не завышай. Валюта только ₽. Не обещай App Store / Google Play.

Если бриф дырявый — доспроси 1–2 вопроса. Когда данных хватает — верни quote.

ФОРМАТ — строго JSON без markdown:
{
  "message": "текст клиенту",
  "questions": ["вопрос"],
  "quote": null или {
    "title": "заголовок",
    "items": [{"name": "блок", "detail": "зачем", "price": 1490}],
    "total": 1490,
    "timeline": "5–7 дней",
    "notes": "что не входит"
  }
}
"""


class Turn(BaseModel):
    role: str
    content: str


class Payload(BaseModel):
    messages: list[Turn] = Field(default_factory=list)
    context: str | None = None


def _extract_json(text: str) -> dict[str, Any] | None:
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    raw = (fenced.group(1) if fenced else text).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def parse_manager(text: str) -> dict[str, Any]:
    data = _extract_json(text)
    if not data:
        return {"ok": True, "message": text.strip(), "questions": [], "quote": None}
    message = data.get("message")
    message = message.strip() if isinstance(message, str) and message.strip() else text.strip()
    questions = [q for q in data.get("questions", []) if isinstance(q, str) and q.strip()]
    quote = data.get("quote")
    if not isinstance(quote, dict):
        quote = None
    else:
        items = quote.get("items")
        if not isinstance(items, list) or not items:
            quote = None
        else:
            clean = []
            for row in items:
                if not isinstance(row, dict):
                    continue
                name = row.get("name")
                price = row.get("price")
                if not isinstance(name, str) or not isinstance(price, (int, float)):
                    continue
                item = {"name": name, "price": int(price)}
                if isinstance(row.get("detail"), str):
                    item["detail"] = row["detail"]
                clean.append(item)
            if not clean:
                quote = None
            else:
                total = sum(i["price"] for i in clean)
                quote = {
                    "title": quote.get("title") if isinstance(quote.get("title"), str) else "Смета",
                    "items": clean,
                    "total": total,
                    "timeline": quote.get("timeline") if isinstance(quote.get("timeline"), str) else "по согласованию",
                    "notes": quote.get("notes") if isinstance(quote.get("notes"), str) else None,
                }
    return {"ok": True, "message": message, "questions": questions, "quote": quote}


async def complete(messages: list[dict[str, str]]) -> str:
    key = settings.openrouter_api_key
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY missing")
    model = settings.openrouter_model or "qwen/qwen3.7-flash"
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(90.0, connect=15.0),
        proxy="socks5://127.0.0.1:9050",
    ) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "HTTP-Referer": "https://codway.su",
                "X-Title": "Codwey",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1400,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content") or ""
        if not str(text).strip():
            raise RuntimeError("empty model")
        return str(text)


@router.post("")
async def manager(payload: Payload) -> dict[str, Any]:
    trimmed = [
        {"role": m.role, "content": m.content[:4000]}
        for m in payload.messages
        if m.role in ("user", "assistant") and m.content.strip()
    ][-16:]
    if not trimmed or not any(m["role"] == "user" for m in trimmed):
        return {"ok": False, "error": "Напишите сообщение"}

    system = SYSTEM_PROMPT
    if payload.context:
        system += "\n\nКонтекст страницы:\n" + payload.context[:2500]

    try:
        text = await complete([{"role": "system", "content": system}, *trimmed])
        return parse_manager(text)
    except Exception:
        return {"ok": False, "error": "Не удалось ответить"}
