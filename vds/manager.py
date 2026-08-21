"""ИИ-менеджер Вей: NVIDIA → Mistral → OpenRouter. Ключи только в .env."""
from __future__ import annotations

import json
import os
import re
import asyncio
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

SYSTEM_PROMPT = """Ты — Вей, менеджер студии Codwey. На «кто ты» отвечай: «Я менеджер Вей.»

Пиши как живой человек в чате. Коротко, на «ты», по-русски.
Запрещено в тексте клиенту: markdown, звёздочки *, **, подчёркивания __, решётки #, обратные кавычки, слова JSON, quote, submit.
Не пиши «Поле: значение». Не нумеруй 1. 2. 3. с жирным. Не говори «парсер», «ID пользователя», «логика проверки», «эндпоинт».
Простыми словами: «бот», «сайт», «скачивать ролики», «после подписки», «оплата картой».

Codwey делает только продукт. Хостинг, домен, токен бота — на клиенте, один раз за диалог.

ЦЕНЫ ₽, не завышай:
Готовое: PulseShop 1490, TicketGate 1290, QuizPulse 990, SitePulse 2490, FolioKit 1990, ShopPeek 3490, PWA Kit 3990, ObbyStart 1290, TycoonLite 2490.
Заказ: бот заявок 990; магазин в боте +500–800; проверка подписки на каналы +400–700; скачивание видео с сайтов от 1490; оплата ЮKassa/СБП +700–1200 отдельной строкой; логотип +200–400; лендинг 1990–3490; парсер данных от 790; Roblox обби 1290.
Срок: 1–2 дня +25%, 3–5 +10%, неделя 0, 2 недели −5%.
Бюджет — ориентир. Скидку сам не предлагай.

КАК ГОВОРИТЬ
Сначала 2–3 простых вопроса одним сообщением, без канцелярита.
Пример на бот «скачать ролик после подписки»:
Понял: бот даёт скачать видео с Ютуба, ТикТока, ВК и Рутуба, если человек подписан на два канала.
Напиши ещё: каналы свои? оплата в боте нужна или бесплатно? есть логотип?
Кнопки questions — ответы человека: «Без оплаты», «Есть логотип», «Каналы свои». Не «Тип бота».

СМЕТА
Цифры НЕ пиши в message. Клади только в quote — на сайте смета сама встанет в рамку.
В message после сметы 2–4 простых предложения: что входит, и «так пойдёт?»
quote минимум 2 строки, по делу. Пример:
{"title":"Бот скачивания видео","items":[{"name":"Бот: скачать ролик после подписки","detail":"Ютуб, ТикТок, ВК, Рутуб","price":1490},{"name":"Проверка подписки на 2 канала","detail":"без подписки не качает","price":500}],"total":1990,"timeline":"неделя","notes":"хостинг и токен бота на клиенте"}

ПРИНЯТИЕ
Пока нет ответов — не принимай. В вопросах не пиши «принять заявку».
Когда смета уже в рамке и клиент пишет «давайте», «всё устраивает», «все согласен», «да», «так пойдёт» — сразу submit=true. Цены не меняй. Вопросы больше не задавай.
Никогда не пиши JSON в message. Смету только в поле quote.
Правка уже принятой: replace=true, «Заявку обновил.»
Ссылку на файлы из чата сохрани в lead.description.

ФОРМАТ ответа серверу — JSON, клиент его не видит:
{"message":"простой текст без звёздочек","questions":["Без оплаты","Есть логотип"],"quote":null,"submit":false,"replace":false,"lead":null}
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


def _escape_newlines_in_strings(blob: str) -> str:
    out: list[str] = []
    in_str = False
    esc = False
    for ch in blob:
        if in_str:
            if esc:
                out.append(ch)
                esc = False
            elif ch == "\\":
                out.append(ch)
                esc = True
            elif ch == '"':
                out.append(ch)
                in_str = False
            elif ch == "\n":
                out.append("\\n")
            elif ch == "\r":
                continue
            else:
                out.append(ch)
        else:
            if ch == '"':
                in_str = True
            out.append(ch)
    return "".join(out)


def _loose_message(blob: str) -> str | None:
    m = re.search(r'"message"\s*:\s*"(.*)"\s*,\s*"questions"', blob, re.S)
    if not m:
        m = re.search(r'"message"\s*:\s*"(.*?)"', blob, re.S)
    if not m:
        return None
    return m.group(1).replace("\\n", "\n").replace('\\"', '"').strip()


def _extract_json(text: str) -> dict[str, Any] | None:
    t = text.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if fenced:
        t = fenced.group(1).strip()
    start, end = t.find("{"), t.rfind("}")
    if start < 0 or end <= start:
        return None
    blob = t[start : end + 1]
    for candidate in (blob, _escape_newlines_in_strings(blob)):
        cleaned = re.sub(r",(\s*[}\]])", r"\1", candidate)
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict) and (
                "message" in data or "questions" in data or "quote" in data or "items" in data
            ):
                return data
        except json.JSONDecodeError:
            continue
    msg = _loose_message(blob)
    if not msg:
        return None
    qs_raw = re.search(r'"questions"\s*:\s*\[(.*?)\]', blob, re.S)
    questions = re.findall(r'"([^"]{2,40})"', qs_raw.group(1)) if qs_raw else []
    return {"message": msg, "questions": questions, "quote": None, "submit": False, "replace": False, "lead": None}


def _normalize_quote(quote: Any) -> dict[str, Any] | None:
    if not isinstance(quote, dict):
        return None
    items = quote.get("items")
    if not isinstance(items, list) or not items:
        return None
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
        return None
    if len(clean) == 1 and re.search(r"^(услуга|сайт|бот|работа|заказ)$", clean[0]["name"], re.I):
        return None
    return {
        "title": quote.get("title") if isinstance(quote.get("title"), str) else "Смета",
        "items": clean,
        "total": sum(i["price"] for i in clean),
        "timeline": quote.get("timeline") if isinstance(quote.get("timeline"), str) else "по согласованию",
        "notes": quote.get("notes") if isinstance(quote.get("notes"), str) else "Хостинг на клиенте",
    }


def _quote_from_context(ctx: str | None) -> dict[str, Any] | None:
    if not ctx:
        return None
    m = re.search(r"LAST_QUOTE:\s*(\{.*\})", ctx, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return _normalize_quote(_extract_json(m.group(1)))
    return _normalize_quote(data)


def _plain_text(message: str) -> str:
    t = _visible_text(message)
    t = re.sub(r"```[\s\S]*?```", "", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"\*(.+?)\*", r"\1", t)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    t = t.replace("*", "")
    t = re.sub(r"^\s*[-•]\s+", "", t, flags=re.M)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _strip_smeta_lines(message: str) -> str:
    keep = []
    for line in message.splitlines():
        low = line.lower()
        if re.search(r"(пример смет|итого\s*:|итого\s+\d)", low):
            continue
        if re.search(r"[—\-]\s*\d{3,}\s*(₽|руб)?\s*$", line):
            continue
        keep.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(keep)).strip()


def _visible_text(message: str) -> str:
    t = message.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t).strip()
    if t.startswith("{") and '"message"' in t:
        data = _extract_json(t)
        if data and isinstance(data.get("message"), str) and data["message"].strip():
            inner = data["message"].strip()
            if not inner.startswith("{"):
                return inner
        loose = _loose_message(t)
        if loose:
            return loose
    return t


def parse_manager(text: str) -> dict[str, Any]:
    data = _extract_json(text)
    if not data:
        return {
            "ok": True,
            "message": _plain_text(text),
            "questions": [],
            "quote": None,
            "submit": False,
            "replace": False,
            "lead": None,
        }
    raw_message = data.get("message")
    if isinstance(raw_message, str) and raw_message.strip():
        message = _plain_text(raw_message)
    else:
        message = _plain_text(text)
    quote = _normalize_quote(data.get("quote"))
    if quote is None and isinstance(data.get("items"), list):
        quote = _normalize_quote(data)
        if quote and (not isinstance(raw_message, str) or not raw_message.strip()):
            message = "Смета ниже. Так пойдёт?"
    buried = _extract_json(message)
    if buried and isinstance(buried.get("items"), list):
        quote = quote or _normalize_quote(buried)
        message = "Смета ниже. Так пойдёт?"
    questions = [
        q.strip()
        for q in data.get("questions", [])
        if isinstance(q, str)
        and 1 < len(q.strip()) <= 36
        and not re.search(r"^(тип|место|поля|логотип|оплат|категори|срок|контакт)\b", q.strip(), re.I)
        and "?" not in q
    ][:3]
    lead = data.get("lead") if isinstance(data.get("lead"), dict) else None
    if quote:
        message = _strip_smeta_lines(message)
        if message.strip().startswith("{"):
            message = "Смета ниже. Так пойдёт?"
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
                "image_url": {"url": f"data:{mime};base64,{img.data}"},
            }
        )
    return parts


async def _post(
    url: str,
    key: str,
    body: dict[str, Any],
    extra: dict[str, str] | None = None,
    use_proxy: bool = True,
) -> str:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        **(extra or {}),
    }
    kwargs: dict[str, Any] = {"timeout": httpx.Timeout(55.0, connect=10.0)}
    if use_proxy:
        kwargs["proxy"] = "socks5://127.0.0.1:9050"
    async with httpx.AsyncClient(**kwargs) as client:
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


async def _post_with_retries(
    url: str,
    key: str,
    body: dict[str, Any],
    extra: dict[str, str] | None = None,
    use_proxy: bool = True,
) -> str:
    last: Exception | None = None
    for attempt in range(5):
        try:
            return await _post(url, key, body, extra, use_proxy)
        except httpx.HTTPStatusError as exc:
            last = exc
            code = exc.response.status_code if exc.response is not None else 0
            if code in (400, 401, 403, 404, 422):
                raise
        except Exception as exc:
            last = exc
        if attempt < 4:
            await asyncio.sleep(10)
    raise last or RuntimeError("retry")


def _strip_images(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for m in messages:
        content = m.get("content")
        if isinstance(content, list):
            text = " ".join(
                p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
            ).strip() or "Клиент приложил фото."
            out.append({**m, "content": text + "\n[фото не прочиталось — попроси описать или кинуть ссылку на диск]"})
        else:
            out.append(m)
    return out


async def complete(messages: list[dict[str, Any]], _text_retry: bool = False) -> str:
    nim_keys = _csv("NIM_KEYS")
    mistral_keys = _csv("MISTRAL_KEYS")
    nim_model = os.environ.get("NIM_MODEL") or "google/gemma-3-4b-it"
    nim_model_2 = os.environ.get("NIM_MODEL_FALLBACK") or "meta/llama-3.2-11b-vision-instruct"
    mistral_model = os.environ.get("MISTRAL_MODEL") or "pixtral-12b-2409"
    openrouter_model = getattr(settings, "openrouter_model", None) or "qwen/qwen3.7-flash"
    openrouter_key = os.environ.get("OPENROUTER_API_KEY") or settings.openrouter_api_key
    errors: list[str] = []
    has_vision = any(isinstance(m.get("content"), list) for m in messages)

    async def try_nim(proxy: bool) -> str | None:
        for key in nim_keys:
            for model in (nim_model, nim_model_2):
                try:
                    return await _post_with_retries(
                        "https://integrate.api.nvidia.com/v1/chat/completions",
                        key,
                        {"model": model, "messages": messages, "max_tokens": 1200, "temperature": 0.35},
                        use_proxy=proxy,
                    )
                except Exception as exc:
                    errors.append(f"nim:{model.split('/')[-1]}:{type(exc).__name__}")
        return None

    async def try_mistral(proxy: bool) -> str | None:
        for key in mistral_keys:
            try:
                return await _post_with_retries(
                    "https://api.mistral.ai/v1/chat/completions",
                    key,
                    {"model": mistral_model, "messages": messages, "max_tokens": 1200, "temperature": 0.35},
                    use_proxy=proxy,
                )
            except Exception as exc:
                errors.append(f"mistral:{type(exc).__name__}")
        return None

    for fn in (
        lambda: try_nim(False),
        lambda: try_mistral(False),
        lambda: try_nim(True),
        lambda: try_mistral(True),
    ):
        got = await fn()
        if got:
            return got

    if openrouter_key:
        try:
            return await _post_with_retries(
                "https://openrouter.ai/api/v1/chat/completions",
                openrouter_key,
                {
                    "model": openrouter_model,
                    "messages": messages,
                    "max_tokens": 1200,
                    "temperature": 0.35,
                },
                extra={"HTTP-Referer": "https://codwey.su", "X-Title": "Codwey"},
                use_proxy=True,
            )
        except Exception as exc:
            errors.append(f"or:{type(exc).__name__}")

    if has_vision and not _text_retry:
        return await complete(_strip_images(messages), True)

    raise RuntimeError(";".join(errors[-8:]) or "no providers")


def _file_links(history: list[dict[str, str]]) -> list[str]:
    found: list[str] = []
    for m in history:
        found.extend(re.findall(r"https?://[^\s)<>\"']+", m.get("content") or ""))
    out: list[str] = []
    for u in found:
        if u not in out:
            out.append(u)
    return out[:8]


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
    links = _file_links(history)
    if links and "http" not in description.lower():
        description = (description + "\nФайлы: " + " ".join(links))[:4000]
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


ACCEPT_PHRASES = {
    "принять заявку",
    "принимаю",
    "принимаем",
    "оформляем",
    "оформить",
    "да, принять",
    "да принять",
    "давайте",
    "да давайте",
    "да, давайте",
    "давай",
    "делаем",
    "погнали",
    "все согласен",
    "всё согласен",
    "все устраивает",
    "всё устраивает",
    "хорошо все устраивает",
    "хорошо всё устраивает",
    "так пойдёт",
    "так пойдет",
    "ок",
    "хорошо",
}


def _is_accept(text: str) -> bool:
    t = re.sub(r"[.!?]+$", "", text.lower().strip())
    t = re.sub(r"\s+", " ", t)
    if t in ACCEPT_PHRASES or t.startswith("принять заявк"):
        return True
    if len(t) < 80 and re.search(
        r"все устраива|всё устраива|все соглас|всё соглас|так пойд|давайте|принима",
        t,
    ):
        return True
    return False


def _deal_on_table(trimmed: list[dict[str, str]]) -> bool:
    prev = " ".join(m["content"] for m in trimmed if m["role"] == "assistant")[-1200:].lower()
    return bool(re.search(r"так пойд|смета|итого|скину смет", prev))


def _prev_is_accept_only(prev: str) -> bool:
    p = prev.lower()
    if not re.search(r"принять заявк|принять заказ|так пойд|устраива", p):
        return False
    if p.count("?") > 2:
        return False
    return True


def _should_submit(parsed: dict[str, Any], last: str, trimmed: list[dict[str, str]]) -> bool:
    if parsed.get("replace"):
        return True
    prev = trimmed[-2]["content"] if len(trimmed) > 1 else ""
    if not _is_accept(last):
        return False
    if _deal_on_table(trimmed) or _prev_is_accept_only(prev):
        return True
    if _brief_ready(trimmed):
        return True
    users = [m for m in trimmed if m["role"] == "user"]
    return len(users) >= 4


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
    if re.search(r"кто ты|ты кто|ты бот|ты человек|ты ии|ты нейрон", last, re.I) and len(last) < 80:
        return {
            "ok": True,
            "message": "Я менеджер Вей.",
            "questions": [],
            "quote": None,
            "submit": False,
        }
    already = any(
        "заявка принята" in m["content"].lower()
        for m in trimmed[:-1]
        if m["role"] == "assistant"
    )
    if already and not any(
        w in last.lower()
        for w in ("исправ", "измен", "добав", "передел", "убер", "другое", "поправ", "замен", "файл", "ссылк", "срок", "цен", "скидк", "контакт")
    ):
        return {
            "ok": True,
            "message": "Заявка уже принята. Если нужно поправить — напишите что именно.",
            "questions": [],
            "quote": None,
            "submit": False,
        }
    frozen = _quote_from_context(payload.context)
    if _is_accept(last) and not already and (frozen or _deal_on_table(trimmed)):
        lead: dict[str, Any] = {}
        form = next((m["content"] for m in trimmed if m["role"] == "user" and m["content"].startswith("Заявка с сайта")), last)
        cat = re.search(r"Категория:\s*(.+)", form)
        contact = re.search(r"Контакт:\s*(.+)", form)
        task = re.search(r"Задача:\s*(.+)", form)
        due = re.search(r"Срок:\s*(.+)", form)
        lead = {
            "category": (cat.group(1).strip(" .") if cat else "Заказ")[:40],
            "contact": (contact.group(1).strip(" .") if contact else "")[:160],
            "description": (task.group(1).strip(" .") if task else last)[:4000],
            "amount": int(frozen["total"]) if frozen else 0,
            "timeline": (frozen or {}).get("timeline") or (due.group(1).strip(" .") if due else "")[:80],
        }
        parsed = {
            "ok": True,
            "message": "Заявка принята!",
            "questions": [],
            "quote": frozen,
            "submit": True,
            "replace": False,
            "lead": lead,
        }
        parsed["ticketId"] = await save_ticket(parsed, trimmed, payload.sessionId)
        parsed["message"] = (
            "Заявка принята!\n\n"
            + f"{lead.get('category')}: {lead.get('description')}\n"
            + (f"Сумма: {lead.get('amount')} ₽\n" if lead.get("amount") else "")
            + (f"Срок: {lead.get('timeline')}\n" if lead.get("timeline") else "")
            + (f"Контакт: {lead.get('contact')}\n" if lead.get("contact") else "")
            + "Напишите, если нужно что-то поправить."
        )
        return parsed
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
    if already:
        system += (
            "\nКлиент меняет уже принятую заявку. replace=true, обнови lead и quote. "
            "Напиши «Заявку обновил.» и новую смету по строкам."
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
        ready = _brief_ready(trimmed) or _deal_on_table(trimmed) or bool(frozen)
        if already:
            parsed["replace"] = True
            parsed["submit"] = True
            parsed["questions"] = []
            if frozen and not parsed.get("quote"):
                parsed["quote"] = frozen
            parsed["ticketId"] = await save_ticket(parsed, trimmed, payload.sessionId)
            if "заявку обновил" not in (parsed.get("message") or "").lower():
                parsed["message"] = "Заявку обновил.\n" + (parsed.get("message") or "")
            return parsed
        if _is_accept(last) and frozen:
            parsed["quote"] = frozen
        submitting = _should_submit(parsed, last, trimmed)
        if not ready:
            parsed["questions"] = [
                q
                for q in (parsed.get("questions") or [])
                if "принять" not in q.lower()
            ]
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
            msg = parsed.get("message") or ""
            if "заявка принята" in msg.lower():
                parsed["message"] = (
                    "Пока рано принимать. Ответьте по пунктам: логотип, оплата, куда слать заявки, какие страницы/поля. "
                    "Когда всё ясно — напишите «принять заявку»."
                )
        return parsed
    except Exception:
        return {"ok": False, "error": "Не удалось ответить. Напишите ещё раз."}
