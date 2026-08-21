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

SYSTEM_PROMPT = """Ты — Вей, ИИ-менеджер студии Codwey.
Кто ты: если спрашивают «кто ты», «ты бот», «ты человек» — ответь ровно: «Я Вей, ИИ-менеджер Codwey. Помогаю выбрать готовое и собрать заказ.»
Язык: русский, коротко, на «ты». Без эмодзи, без канцелярита.

ЧТО ДЕЛАЕМ
Только продукт: сайт, Telegram-бот, веб-приложение, Roblox-игра.
Хостинг, домен, сервер, SSL, токен бота — на клиенте. Скажи это один раз за диалог.

ЦЕНЫ (₽, ниже Авито, не завышай)
Готовое: PulseShop 1490, TicketGate 1290, QuizPulse 990, SitePulse 2490, FolioKit 1990, ShopPeek 3490, PWA Kit 3990, ObbyStart 1290, TycoonLite 2490. Готовое можно доработать — доплата отдельными строками.
На заказ:
- Бот заявок: база 990 (форма + отправка в Telegram).
- Каталог/магазин в боте: +500–800.
- Админка заявок: +300.
- Рассылка: +250.
- Платёжка ЮKassa / СБП / Robokassa / Crypto Pay: +700–1200, отдельная строка «Подключение {агрегатор}».
- Логотип/оформление под бренд: +200–400, если есть бренд.
- Лендинг 1990–3490. Витрина 3490–5990. Портфолио 1990–2990. PWA от 3990.
- Roblox обби от 1290, тайкун от 2490. Парсер от 790.
Срок: 1–2 дня +25%, 3–5 дней +10%, неделя 0, 2 недели −5%.
Бюджет клиента — ориентир. Можно чуть больше или меньше, объясни одной фразой.

СКИДКА
Сам НЕ предлагай скидку, проценты, «можем уступить». Никогда.
Только если клиент сам написал «скидка», «дешевле», «уступи». Тогда до 8%, строка «Скидка» с минусом, один раз.

КАК ВЕСТИ ДИАЛОГ
Не принимай заказ с первого «да». Сначала расспроси. По 1–2 вопроса за ход, живым языком.
Для Telegram-бота заявок обязательно выясни:
1) какие поля (имя, телефон, город, товар…)
2) куда падают заявки (личный Telegram / группа)
3) есть ли логотип и цвета, или делать нейтрально
4) нужна ли оплата и какой агрегатор
5) только форма или ещё каталог товаров
Для сайта: сколько страниц, логотип, чьи тексты, форма, оплата.
Кнопки questions — короткие ВАРИАНТЫ ОТВЕТА, не «да всё нормально».
Примеры: «Есть логотип», «Без логотипа», «ЮKassa», «Без оплаты», «Только форма», «Есть каталог».
Запрещены кнопки: «Да всё ок», «Да всё нормально», «Рассмотреть скидку» — пока не пришло время принять заявку.

СМЕТА
Не пиши одну строку «Бот 990» / «Услуга 990» / «Сайт 2490».
Минимум 2 строки с смыслом, лучше 3–5. Каждая: что именно + зачем + цена.
Пример после расспроса:
- Бот заявок, поля имя/телефон/товар — 990
- Оформление под логотип строймагазина — 300
- Подключение ЮKassa — 1000
Пока не ответил про оплату и логотип — quote=null, сначала вопросы.
Смету присылай когда детали ясны ИЛИ клиент спросил «сколько». Не дублируй ту же смету в каждом сообщении.

ПРИНЯТИЕ ЗАЯВКИ
Когда поля, куда слать, логотип и оплата ясны — спроси один раз: «Принять заявку?»
Кнопки тогда: «Принять заявку», «Ещё поправить».
Если клиент принял:
submit=true
questions=[]
message: «Заявка принята!» и 3–5 строк сводки: что делаем, блоки сметы коротко, сумма, срок, контакт.
quote: финальная подробная смета.
Дальше не продавай и не спрашивай «всё ок?». Если пишет ещё без правок: «Заявка уже в работе. Напишите, что поправить.»
replace=true только при правке уже принятой заявки.

ФОРМАТ — только JSON:
{"message":"...","questions":[],"quote":null,"submit":false,"replace":false,"lead":null}
quote: {"title":"...","items":[{"name":"блок","detail":"зачем","price":1000}],"total":1000,"timeline":"5–7 дней","notes":"хостинг на клиенте"}
lead при принятии: {"category":"Боты","contact":"@name","description":"подробно что делать","amount":2290,"timeline":"неделя"}
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
            elif len(clean) == 1 and re.search(
                r"^(услуга|сайт|бот|работа|заказ)$", clean[0]["name"], re.I
            ):
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
    conversation = ""
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


def _asked_discount(trimmed: list[dict[str, str]]) -> bool:
    return any(
        re.search(r"скидк|дешевл|уступ|подешев", m["content"], re.I)
        for m in trimmed
        if m["role"] == "user"
    )


def _brief_ready(trimmed: list[dict[str, str]]) -> bool:
    users = [m["content"] for m in trimmed if m["role"] == "user"]
    if len(users) < 3:
        return False
    blob = " ".join(users).lower()
    hits = 0
    for w in (
        "логотип",
        "лого",
        "цвет",
        "юkassa",
        "юкасса",
        "сбп",
        "robokassa",
        "оплат",
        "без оплат",
        "групп",
        "поля",
        "телефон",
        "каталог",
        "без лого",
        "нейтральн",
    ):
        if w in blob:
            hits += 1
    return hits >= 2 or len(users) >= 5


def _filter_questions(questions: list[str], submitting: bool) -> list[str]:
    out = []
    for q in questions:
        low = q.lower()
        if any(b in low for b in ("скидк", "уступ", "8%")):
            continue
        confirm = bool(re.search(r"да|всё ок|все ок|нормально", low))
        if confirm and not submitting:
            continue
        out.append(q)
    return out[:3]


def _should_submit(parsed: dict[str, Any], last: str, trimmed: list[dict[str, str]]) -> bool:
    msg = (parsed.get("message") or "").lower()
    user = last.lower().strip()
    prev = trimmed[-2]["content"].lower() if len(trimmed) > 1 else ""
    if parsed.get("replace"):
        return True
    if not _brief_ready(trimmed):
        return False
    if "заявка принята" in msg:
        return True
    yes = user in ("да", "да.", "ок", "хорошо", "ага", "принимаем", "принимаю", "принять заявку")
    asked = "принять заявк" in prev or "принять заказ" in prev
    if user.startswith("принять"):
        return True
    if asked and yes:
        return True
    if parsed.get("submit") and asked:
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

    last = trimmed[-1]["content"] if trimmed else "Смотри фото и оцени задачу."
    already = any(
        "заявка принята" in m["content"].lower()
        for m in trimmed[:-1]
        if m["role"] == "assistant"
    )
    if already and not any(
        w in last.lower() for w in ("исправ", "измен", "добав", "передел", "убер", "другое")
    ):
        return {
            "ok": True,
            "message": "Заявка уже принята. Если нужно поправить — напишите что именно.",
            "questions": [],
            "quote": None,
            "submit": False,
        }

    system = SYSTEM_PROMPT
    if payload.context:
        system += "\n\nКонтекст:\n" + payload.context[:2500]
    last_assistant = next((m["content"] for m in reversed(trimmed) if m["role"] == "assistant"), None)
    if last_assistant:
        system += (
            "\n\nТвой прошлый ответ:\n"
            + last_assistant[:900]
            + "\nНе повторяй его. Смету не дублируй, если цифры не изменились."
        )
    if not _asked_discount(trimmed):
        system += "\nКлиент скидку не просил — не предлагай скидку и не пиши про 8%."

    last = trimmed[-1]["content"] if trimmed else "Смотри фото и оцени задачу."
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for m in trimmed[:-1]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": _user_content(last, payload.images)})

    try:
        text = await complete(messages)
        parsed = parse_manager(text)
        if not _asked_discount(trimmed) and isinstance(parsed.get("quote"), dict):
            items = [
                i
                for i in parsed["quote"].get("items", [])
                if "скид" not in str(i.get("name", "")).lower()
            ]
            if items:
                parsed["quote"]["items"] = items
                parsed["quote"]["total"] = sum(int(i["price"]) for i in items)
            else:
                parsed["quote"] = None
        if not parsed.get("lead"):
            cat = re.search(r"Категория:\s*(.+)", last)
            task = re.search(r"Задача:\s*(.+)", last, re.S)
            contact = re.search(r"Контакт:\s*(.+)", last)
            due = re.search(r"Срок:\s*(.+)", last)
            budget = re.search(r"Бюджет клиента примерно:\s*(.+)", last)
            if cat or contact:
                desc = (task.group(1).strip(" .") if task else last)[:4000]
                if budget:
                    desc = (desc + f" Бюджет ~{budget.group(1).strip()}").strip()
                parsed["lead"] = {
                    "category": (cat.group(1).strip(" .") if cat else "")[:40],
                    "contact": (contact.group(1).strip(" .") if contact else "")[:160],
                    "description": desc,
                    "timeline": (due.group(1).strip(" .") if due else "")[:80],
                }
        ready = _brief_ready(trimmed)
        if parsed.get("submit") and not ready and not parsed.get("replace"):
            parsed["submit"] = False
            if "принять заявк" not in (parsed.get("message") or "").lower():
                parsed["message"] = (
                    (parsed.get("message") or "").strip()
                    + "\n\nЕщё уточню: есть логотип и цвета? Нужна оплата в боте — ЮKassa, СБП или без оплаты? Куда слать заявки — вам в личку или в группу?"
                ).strip()
        submitting = _should_submit(parsed, last, trimmed)
        parsed["questions"] = _filter_questions(parsed.get("questions") or [], submitting)
        if submitting:
            parsed["submit"] = True
            parsed["questions"] = []
            lead = parsed.get("lead") if isinstance(parsed.get("lead"), dict) else {}
            quote = parsed.get("quote") if isinstance(parsed.get("quote"), dict) else {}
            total = lead.get("amount") or quote.get("total") or ""
            parsed["message"] = (
                "Заявка принята!\n\n"
                + f"{lead.get('category') or 'Заказ'}: {lead.get('description') or 'по переписке'}\n"
                + (f"Сумма: {total} ₽\n" if total else "")
                + (f"Срок: {lead.get('timeline') or quote.get('timeline') or 'по договорённости'}\n")
                + (f"Контакт: {lead.get('contact')}\n" if lead.get("contact") else "")
                + "Напишите, если нужно что-то поправить."
            )
            parsed["ticketId"] = await save_ticket(parsed, trimmed, payload.sessionId)
        else:
            parsed["submit"] = False
        return parsed
    except Exception:
        return {"ok": False, "error": "Не удалось ответить. Напишите ещё раз."}
