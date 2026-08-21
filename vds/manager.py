"""ИИ-менеджер Вей: NVIDIA → Mistral → OpenRouter. Ключи только в .env."""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.ticket_model import Ticket

router = APIRouter()

SYSTEM_PROMPT = """Ты — Вей, ИИ-менеджер студии Codwey (codwey.su).
Говоришь по-русски, коротко, по делу, без канцелярита и без эмодзи. На «ты».

Мы делаем ТОЛЬКО сайт, бота, приложение или игру. Хостинг, домен, сервер, SSL, токены — на клиенте.

Цены НИЖЕ Авито. Не завышай. Готовое и заказ МОЖНО менять: скидка, другие блоки, другой срок — всегда возвращай НОВУЮ смету с новыми цифрами.

Готовое:
PulseShop 1490, TicketGate 1290, QuizPulse 990, SitePulse 2490, FolioKit 1990, ShopPeek 3490, PWA Kit 3990, ObbyStart 1290, TycoonLite 2490.

На заказ база ₽:
Telegram-бот 990, магазин +400–800, оплата +400, админка +300.
Лендинг 1990–3490. Витрина 3490–5990. Портфолио 1990–2990.
PWA от 3990. Roblox обби от 1290, тайкун от 2490. Парсер от 790.

Срок меняет цену:
1–2 дня +25%. 3–5 дней +10%. Неделя 0. 2 недели −5%.

Скидка:
- Если клиент просит скидку — можешь дать до 8%. Сразу посчитай.
- Если клиент СОГЛАСИЛСЯ («да», «рассмотреть», «ок», «берём») — НЕМЕДЛЕННО примени скидку отдельной строкой «Скидка 8%» с отрицательной ценой. Не спрашивай второй раз. Не повторяй «можем рассмотреть».

Смета обязана быть по строкам: каждая строка = что делаем + зачем + цена. Не одна строка «Сайт 2490». Пример:
- Макет лендинга — 900
- Вёрстка и адаптив — 1100
- Форма заявки — 490
- Скидка 8% — −200
Итого сходится с суммой строк.

Заявки:
- Форма полная — submit=true, «Ваш заказ принят», quote сразу.
- Дырки — один вопрос в message, quote-прикидку всё равно дай.
- «Исправьте / стойте» — replace=true, обнови ту же заявку, новый quote.

questions — КОРОТКИЕ кнопки-ответы 2–5 слов: «Да, всё ок», «Хочу скидку 8%», «Срок неделя».
Не пиши туда свои вопросы. Не повторяй те же кнопки, что уже были. Максимум 3. Если клиент уже ответил — [].

ЗАПРЕЩЕНО повторять предыдущий ответ почти дословно.

ФОРМАТ — строго JSON без markdown:
{
  "message": "текст клиенту",
  "questions": ["Да, всё ок"],
  "quote": {
    "title": "заголовок",
    "items": [{"name": "блок", "detail": "зачем", "price": 1490}],
    "total": 1490,
    "timeline": "5–7 дней",
    "notes": "хостинг на клиенте"
  },
  "submit": false,
  "replace": false,
  "lead": {
    "category": "Сайты",
    "contact": "@name",
    "description": "что нужно",
    "amount": 1490,
    "timeline": "5–7 дней"
  }
}
"""


class Turn(BaseModel):
    role: str
    content: str


class ImageIn(BaseModel):
    mime: str = "image/jpeg"
    data: str


class Payload(BaseModel):
    messages: list[Turn] = Field(default_factory=list)
    context: str | None = None
    images: list[ImageIn] = Field(default_factory=list)
    sessionId: str | None = None


def _csv(name: str) -> list[str]:
    raw = os.environ.get(name, "") or ""
    return [x.strip() for x in raw.split(",") if x.strip()]


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
        return {
            "ok": True,
            "message": text.strip(),
            "questions": [],
            "quote": None,
            "submit": False,
            "replace": False,
            "lead": None,
        }
    message = data.get("message")
    message = message.strip() if isinstance(message, str) and message.strip() else text.strip()
    questions = [
        q.strip()
        for q in data.get("questions", [])
        if isinstance(q, str) and 1 < len(q.strip()) <= 36
    ][:3]
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
                quote = {
                    "title": quote.get("title") if isinstance(quote.get("title"), str) else "Смета",
                    "items": clean,
                    "total": sum(i["price"] for i in clean),
                    "timeline": quote.get("timeline") if isinstance(quote.get("timeline"), str) else "по согласованию",
                    "notes": quote.get("notes") if isinstance(quote.get("notes"), str) else "Хостинг на клиенте",
                }
    lead = data.get("lead") if isinstance(data.get("lead"), dict) else None
    return {
        "ok": True,
        "message": message,
        "questions": questions,
        "quote": quote,
        "submit": bool(data.get("submit")),
        "replace": bool(data.get("replace")),
        "lead": lead,
    }


def _user_content(text: str, images: list[ImageIn]) -> Any:
    if not images:
        return text
    parts: list[dict[str, Any]] = [{"type": "text", "text": text}]
    for img in images[:2]:
        mime = img.mime if img.mime.startswith("image/") else "image/jpeg"
        parts.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{img.data[:350_000]}"},
            }
        )
    return parts


async def _post(url: str, key: str, body: dict[str, Any], extra: dict[str, str] | None = None) -> str:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        **(extra or {}),
    }
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(70.0, connect=12.0),
        proxy="socks5://127.0.0.1:9050",
    ) as client:
        response = await client.post(url, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content") or ""
        if isinstance(text, list):
            text = "".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in text
            )
        if not str(text).strip():
            raise RuntimeError("empty")
        return str(text)


async def complete(messages: list[dict[str, Any]]) -> str:
    nim_keys = _csv("NIM_KEYS")
    mistral_keys = _csv("MISTRAL_KEYS")
    nim_model = os.environ.get("NIM_MODEL") or "google/gemma-3-4b-it"
    nim_model_2 = os.environ.get("NIM_MODEL_FALLBACK") or "meta/llama-3.2-11b-vision-instruct"
    mistral_model = os.environ.get("MISTRAL_MODEL") or "pixtral-12b-2409"
    openrouter_model = getattr(settings, "openrouter_model", None) or "qwen/qwen3.7-flash"
    openrouter_key = os.environ.get("OPENROUTER_API_KEY") or settings.openrouter_api_key

    errors: list[str] = []

    for key in nim_keys:
        for model in (nim_model, nim_model_2):
            try:
                return await _post(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    key,
                    {"model": model, "messages": messages, "max_tokens": 1200, "temperature": 0.4},
                )
            except Exception as exc:
                errors.append(f"nim:{type(exc).__name__}")

    for key in mistral_keys:
        try:
            return await _post(
                "https://api.mistral.ai/v1/chat/completions",
                key,
                {"model": mistral_model, "messages": messages, "max_tokens": 1200, "temperature": 0.4},
            )
        except Exception as exc:
            errors.append(f"mistral:{type(exc).__name__}")

    if openrouter_key:
        try:
            return await _post(
                "https://openrouter.ai/api/v1/chat/completions",
                openrouter_key,
                {
                    "model": openrouter_model,
                    "messages": messages,
                    "max_tokens": 1200,
                    "temperature": 0.4,
                },
                extra={"HTTP-Referer": "https://codwey.su", "X-Title": "Codwey"},
            )
        except Exception as exc:
            errors.append(f"or:{type(exc).__name__}")

    raise RuntimeError(";".join(errors[-6:]) or "no providers")


async def save_ticket(parsed: dict[str, Any], history: list[dict[str, str]], session_id: str | None) -> str | None:
    lead = parsed.get("lead") if isinstance(parsed.get("lead"), dict) else {}
    quote = parsed.get("quote")
    conversation = "\n".join(f"{m['role']}: {m['content']}" for m in history[-20:])
    amount = 0
    if isinstance(lead.get("amount"), (int, float)):
        amount = int(lead["amount"])
    elif isinstance(quote, dict) and isinstance(quote.get("total"), (int, float)):
        amount = int(quote["total"])
    category = str(lead.get("category") or "")[:40]
    contact = str(lead.get("contact") or "")[:160]
    description = str(lead.get("description") or parsed.get("message") or "")[:4000]
    timeline = str(lead.get("timeline") or (quote or {}).get("timeline") or "")[:80]
    quote_json = json.dumps(quote, ensure_ascii=False) if quote else ""
    async with SessionLocal() as db:
        existing = None
        if session_id:
            result = await db.execute(
                select(Ticket)
                .where(Ticket.session_id == session_id)
                .where(Ticket.status.in_(("new", "updated")))
                .order_by(Ticket.created_at.desc())
            )
            existing = result.scalars().first()
        if existing:
            existing.category = category or existing.category
            existing.contact = contact or existing.contact
            existing.description = description
            if amount:
                existing.amount = amount
            existing.timeline = timeline or existing.timeline
            existing.quote_json = quote_json or existing.quote_json
            existing.conversation = conversation[:8000]
            existing.status = "updated"
            await db.commit()
            return existing.id
        ticket_id = uuid.uuid4().hex[:16]
        db.add(
            Ticket(
                id=ticket_id,
                category=category,
                contact=contact,
                description=description,
                amount=amount,
                timeline=timeline,
                quote_json=quote_json,
                conversation=conversation[:8000],
                status="new",
                source="chat",
                session_id=session_id or "",
                created_at=datetime.utcnow(),
            )
        )
        await db.commit()
        return ticket_id


def _should_submit(parsed: dict[str, Any], last: str, context: str | None) -> bool:
    msg = (parsed.get("message") or "").lower()
    user = last.lower()
    if parsed.get("submit") or parsed.get("replace"):
        return True
    if "заказ принят" in msg:
        return True
    if any(w in user for w in ("исправ", "стойте", "подожд", "не то", "забудьте", "передел")):
        parsed["replace"] = True
        return True
    if context and "заявка с формы" in context.lower():
        missing = "не указан" in last or "пока коротко" in last
        asking = any(w in msg for w in ("уточн", "напиши", "какой", "какая"))
        if not missing and not asking:
            return True
    return False


@router.post("")
async def manager(payload: Payload) -> dict[str, Any]:
    trimmed = [
        {"role": m.role, "content": m.content[:4000]}
        for m in payload.messages
        if m.role in ("user", "assistant") and m.content.strip()
    ][-16:]
    if not trimmed and not payload.images:
        return {"ok": False, "error": "Напишите сообщение или прикрепите фото"}

    system = SYSTEM_PROMPT
    if payload.context:
        system += "\n\nКонтекст:\n" + payload.context[:2500]
    last_assistant = next((m["content"] for m in reversed(trimmed) if m["role"] == "assistant"), None)
    if last_assistant:
        system += (
            "\n\nТвой прошлый ответ:\n"
            + last_assistant[:900]
            + "\nНе повторяй его. Если клиент согласился со скидкой или правкой — сразу новый quote с новыми цифрами."
        )

    last = trimmed[-1]["content"] if trimmed else "Смотри фото и оцени задачу."
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for m in trimmed[:-1]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": _user_content(last, payload.images)})

    try:
        text = await complete(messages)
        parsed = parse_manager(text)
        if not parsed.get("lead"):
            cat = re.search(r"Категория:\s*(.+)", last)
            task = re.search(r"Задача:\s*(.+)", last, re.S)
            contact = re.search(r"Контакт:\s*(.+)", last)
            due = re.search(r"Срок:\s*(.+)", last)
            if cat or contact:
                parsed["lead"] = {
                    "category": (cat.group(1).strip(" .") if cat else "")[:40],
                    "contact": (contact.group(1).strip(" .") if contact else "")[:160],
                    "description": (task.group(1).strip(" .") if task else last)[:4000],
                    "timeline": (due.group(1).strip(" .") if due else "")[:80],
                }
        if _should_submit(parsed, last, payload.context):
            parsed["submit"] = True
            parsed["ticketId"] = await save_ticket(parsed, trimmed, payload.sessionId)
        return parsed
    except Exception:
        return {"ok": False, "error": "Не удалось ответить. Напишите ещё раз."}
