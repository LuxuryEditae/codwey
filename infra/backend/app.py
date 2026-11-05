"""CodWay API + Telegram support bot (aiogram 3).

Site leads -> tickets; clients write to the bot -> tickets; the owner replies with
Telegram "reply" and the answer is copied to the client. Every Telegram send goes
through a durable SQLite outbox (survives restarts, retries with backoff) and the
bot can fail over between direct access, TELEGRAM_API_BASE and TELEGRAM_PROXY.
"""
import asyncio
from contextlib import asynccontextmanager, contextmanager, suppress
from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import secrets
import smtplib
import sqlite3
import time
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode
from aiogram.exceptions import (TelegramBadRequest, TelegramForbiddenError, TelegramNetworkError,
                                TelegramRetryAfter, TelegramServerError)
from aiogram.methods import GetMe
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton,
                           Message, ReactionTypeEmoji, ReplyKeyboardMarkup, ReplyParameters)
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
import psutil

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("aiogram.event").setLevel(logging.WARNING)
log = logging.getLogger("codwey")
ROOT = Path(__file__).resolve().parent
PRICING = json.loads((ROOT / "pricing.json").read_text(encoding="utf-8"))
PROJECTS = {p["id"]: p for p in PRICING["projects"]}
FEATURES = {p["id"]: p for p in PRICING["features"]}
SOLUTIONS = {p["id"]: p for p in json.loads((ROOT / "solutions.json").read_text(encoding="utf-8"))}
DB_PATH = Path(os.getenv("DATABASE_PATH", str(ROOT / "data" / "orders.sqlite3")))
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_ID = os.getenv("ADMIN_ID", "")
BOOTSTRAP_TOKEN = os.getenv("BOOTSTRAP_TOKEN", "")
TELEGRAM_API_BASE = os.getenv("TELEGRAM_API_BASE", "").strip().rstrip("/")
TELEGRAM_PROXY = os.getenv("TELEGRAM_PROXY", "").strip()
SMTP = {k: os.getenv(k, "") for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM")}
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "coddweyy@gmail.com")
RATE_SALT = hashlib.sha256((BOT_TOKEN or "local-development").encode()).digest()
MSK = ZoneInfo("Europe/Moscow")
DELAY_NOTE_AFTER = 300
CONTACTS = ("📞 <b>Контакты CodWay</b>\n\nТелефон: +7 960 753-61-62\nTelegram: @mexciti\nПочта: coddweyy@gmail.com\n"
            "Сайт: https://codway.su\n\nОтвечаем 9:00–22:00 МСК, обычно в течение часа.")
SERVICE_LABELS = {**{k: v["label"] for k, v in PROJECTS.items()}, "other": "Другое / консультация", "question": "Вопрос"}
bot: Bot | None = None
dispatcher = Dispatcher()
outbox_event = asyncio.Event()
STATE = {"route": "direct", "last_ok": 0.0, "fail_streak": 0, "last_alert": 0.0, "alert_note": ""}

# ---------------------------------------------------------------- database
@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        with conn:
            yield conn
    finally:
        conn.close()

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript("""
          CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
            contact TEXT NOT NULL, project TEXT NOT NULL, features TEXT NOT NULL, description TEXT NOT NULL,
            price_min INTEGER NOT NULL, price_max INTEGER NOT NULL, days_min INTEGER NOT NULL, days_max INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'new', created_at REAL NOT NULL, notified_at REAL,
            attempts INTEGER NOT NULL DEFAULT 0, next_attempt REAL NOT NULL DEFAULT 0, telegram_message_id INTEGER);
          CREATE TABLE IF NOT EXISTS rate_events (ip_hash TEXT NOT NULL, created_at REAL NOT NULL);
          CREATE INDEX IF NOT EXISTS rates_time ON rate_events(created_at);
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id TEXT NOT NULL, amount INTEGER NOT NULL,
            description TEXT NOT NULL, contact TEXT NOT NULL, items TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
            payment_url TEXT, created_at REAL NOT NULL, notified_at REAL);
          CREATE TABLE IF NOT EXISTS bot_users (
            user_id INTEGER PRIMARY KEY, username TEXT, name TEXT, blocked INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL, last_ack REAL NOT NULL DEFAULT 0);
          CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, name TEXT, contact TEXT,
            source TEXT NOT NULL, order_id INTEGER, service TEXT, solution_id TEXT, description TEXT,
            status TEXT NOT NULL DEFAULT 'new', created_at REAL NOT NULL, updated_at REAL NOT NULL,
            card_msg_id INTEGER, card_sent_at REAL);
          CREATE INDEX IF NOT EXISTS tickets_user ON tickets(user_id, status);
          CREATE TABLE IF NOT EXISTS msg_map (admin_msg_id INTEGER PRIMARY KEY, ticket_id INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, kind TEXT NOT NULL, chat_id INTEGER,
            ticket_id INTEGER, payload TEXT NOT NULL, orig_time REAL NOT NULL, created_at REAL NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, next_attempt REAL NOT NULL DEFAULT 0, sent_at REAL,
            failed INTEGER NOT NULL DEFAULT 0, last_error TEXT);
          CREATE INDEX IF NOT EXISTS outbox_due ON outbox(sent_at, failed, next_attempt);
        """)
        if ADMIN_ID:
            conn.execute("INSERT INTO settings VALUES ('admin_id',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(int(ADMIN_ID)),))
        cols = {row[1] for row in conn.execute("PRAGMA table_info(orders)")}
        if "solution_id" not in cols:
            conn.execute("ALTER TABLE orders ADD COLUMN solution_id TEXT")
        # migrate: site orders never delivered by the old notifier become tickets
        for o in conn.execute("SELECT * FROM orders WHERE notified_at IS NULL AND id NOT IN (SELECT order_id FROM tickets WHERE order_id IS NOT NULL)").fetchall():
            ticket_from_order(conn, o)

def owner_id():
    with db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key='admin_id'").fetchone()
    return int(row[0]) if row else None

def enqueue(conn, direction, kind, chat_id, payload, orig_time, ticket_id=None):
    conn.execute("INSERT INTO outbox (direction,kind,chat_id,ticket_id,payload,orig_time,created_at) VALUES (?,?,?,?,?,?,?)",
                 (direction, kind, chat_id, ticket_id, json.dumps(payload, ensure_ascii=False), orig_time, time.time()))
    try:
        asyncio.get_running_loop()
        outbox_event.set()  # same thread as the worker; API threads rely on the 2 s poll
    except RuntimeError:
        pass

# ---------------------------------------------------------------- formatting
money = lambda v: f"{v:,}".replace(",", " ")

def msk(ts):
    return datetime.fromtimestamp(ts, timezone.utc).astimezone(MSK).strftime("%d.%m.%Y %H:%M")

def delay_text(seconds):
    m = int(seconds // 60)
    return f"{m // 60} ч {m % 60} мин" if m >= 60 else f"{m} мин"

def time_lines(orig, sent=None):
    sent = sent or time.time()
    line = f"🕒 Отправлено: {msk(orig)} МСК"
    if sent - orig > DELAY_NOTE_AFTER:
        line += f"\n⏳ доставлено с задержкой {delay_text(sent - orig)}"
    return line

def who(t):
    parts = [escape(t["name"] or "")] if t["name"] else []
    if t["username"]:
        parts.append("@" + escape(t["username"]))
    if t["contact"] and t["contact"] != ("@" + (t["username"] or "")):
        parts.append(escape(t["contact"]))
    if t["user_id"]:
        parts.append(f"id {t['user_id']}")
    return " · ".join(parts) or "—"

STATUS = {"new": "🆕 Новая", "active": "🛠 В работе", "closed": "✅ Закрыта"}

def ticket_card(t, order=None):
    src = "сайт" + (f", заявка №{t['order_id']}" if t["order_id"] else "") if t["source"] == "site" else "бот"
    lines = [f"<b>Тикет #{t['id']}</b> · {STATUS.get(t['status'], t['status'])}", f"👤 {who(t)}",
             f"📌 {escape(SERVICE_LABELS.get(t['service'] or '', t['service'] or '—'))}"]
    sol = SOLUTIONS.get(t["solution_id"] or "")
    if sol:
        lines.append(f"🧩 Готовое решение: <b>{escape(sol['title'])}</b> — {money(sol['price'])} ₽")
    if order:
        feats = ", ".join(FEATURES[f]["label"] for f in json.loads(order["features"]) if f in FEATURES)
        if feats:
            lines.append(f"➕ Опции: {escape(feats)}")
        if not sol:
            lines.append(f"💰 Смета: <b>{money(order['price_min'])}–{money(order['price_max'])} ₽</b>, {order['days_min']}–{order['days_max']} дн.")
    lines.append(f"🌐 Источник: {src}")
    lines.append(time_lines(t["created_at"], t["card_sent_at"]))
    if t["description"]:
        lines.append(f"\n<b>Задача:</b>\n{escape(t['description'][:3000])}")
    if t["source"] == "site" and not t["user_id"]:
        lines.append("\n<i>Клиент ещё не писал в бот — свяжитесь по контакту. Когда он напишет в бот, тикет привяжется и можно будет отвечать реплаем.</i>")
    else:
        lines.append("\n<i>Ответьте реплаем на это или любое сообщение тикета — ответ уйдёт клиенту.</i>")
    return "\n".join(lines)

def ticket_kb(t):
    rows = []
    contact = t["contact"] or ""
    if t["username"] or contact.startswith("@"):
        rows.append([InlineKeyboardButton(text="Открыть чат ↗", url=f"https://t.me/{(t['username'] or contact[1:])}")])
    st = []
    if t["status"] != "active":
        st.append(InlineKeyboardButton(text="✋ Взять", callback_data=f"t:take:{t['id']}"))
    if t["status"] != "closed":
        st.append(InlineKeyboardButton(text="✅ Закрыть", callback_data=f"t:close:{t['id']}"))
    rows.append(st)
    if t["user_id"]:
        rows.append([InlineKeyboardButton(text="⛔ Заблокировать", callback_data=f"t:block:{t['id']}")])
    return InlineKeyboardMarkup(inline_keyboard=[r for r in rows if r])

def get_ticket(conn, tid):
    return conn.execute("SELECT * FROM tickets WHERE id=?", (tid,)).fetchone()

def get_order(conn, t):
    return conn.execute("SELECT * FROM orders WHERE id=?", (t["order_id"],)).fetchone() if t and t["order_id"] else None

def ticket_from_order(conn, o):
    contact = o["contact"]
    username = contact[1:] if contact.startswith("@") else None
    user = conn.execute("SELECT * FROM bot_users WHERE lower(username)=lower(?)", (username,)).fetchone() if username else None
    cur = conn.execute("INSERT INTO tickets (user_id,username,name,contact,source,order_id,service,solution_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                       (user["user_id"] if user else None, username, user["name"] if user else None, contact, "site", o["id"], o["project"],
                        o["solution_id"], o["description"], o["created_at"], time.time()))
    admin = owner_id_conn(conn)
    enqueue(conn, "admin", "card", admin, {}, o["created_at"], cur.lastrowid)
    return cur.lastrowid

def owner_id_conn(conn):
    row = conn.execute("SELECT value FROM settings WHERE key='admin_id'").fetchone()
    return int(row[0]) if row else None

# ---------------------------------------------------------------- outbox delivery
async def deliver(job):
    """Send one outbox job. Returns list of admin message ids to map to the ticket."""
    p = json.loads(job["payload"])
    admin = owner_id()
    now = time.time()
    if job["kind"] == "card":
        with db() as conn:
            conn.execute("UPDATE tickets SET card_sent_at=COALESCE(card_sent_at,?) WHERE id=?", (now, job["ticket_id"]))
            t = get_ticket(conn, job["ticket_id"]); order = get_order(conn, t)
        m = await bot.send_message(admin, ticket_card(t, order), reply_markup=ticket_kb(t), request_timeout=15)
        with db() as conn:
            conn.execute("UPDATE tickets SET card_msg_id=? WHERE id=?", (m.message_id, t["id"]))
            if t["order_id"]:
                conn.execute("UPDATE orders SET notified_at=?, telegram_message_id=? WHERE id=?", (now, m.message_id, t["order_id"]))
        return [m.message_id]
    if job["kind"] == "client_msg":  # client -> admin
        with db() as conn:
            t = get_ticket(conn, job["ticket_id"])
        head = f"💬 <b>#{t['id']}</b> · {who(t)}\n{time_lines(job['orig_time'], now)}"
        reply = ReplyParameters(message_id=t["card_msg_id"], allow_sending_without_reply=True) if t["card_msg_id"] else None
        if p["type"] == "text":
            m = await bot.send_message(admin, f"{head}\n\n{p['html']}", reply_parameters=reply, request_timeout=15)
            return [m.message_id]
        if p.get("captionable"):
            cap = f"{head}\n\n{p.get('html') or ''}".strip()[:1024]
            m = await bot.copy_message(admin, p["chat_id"], p["message_id"], caption=cap, parse_mode=ParseMode.HTML, reply_parameters=reply, request_timeout=30)
            return [m.message_id]
        h = await bot.send_message(admin, head, reply_parameters=reply, request_timeout=15)
        m = await bot.copy_message(admin, p["chat_id"], p["message_id"], reply_parameters=ReplyParameters(message_id=h.message_id, allow_sending_without_reply=True), request_timeout=30)
        return [h.message_id, m.message_id]
    if job["kind"] == "admin_msg":  # admin -> client
        late = now - job["orig_time"] > DELAY_NOTE_AFTER
        note = f"\n\n<i>{time_lines(job['orig_time'], now)}</i>" if late else ""
        if p["type"] == "text":
            await bot.send_message(job["chat_id"], f"💬 <b>Менеджер CodWay:</b>\n{p['html']}{note}", request_timeout=15)
        elif p.get("captionable") and (late or p.get("html")):
            await bot.copy_message(job["chat_id"], p["chat_id"], p["message_id"], caption=(f"{p.get('html') or ''}{note}").strip()[:1024], parse_mode=ParseMode.HTML, request_timeout=30)
        else:
            await bot.copy_message(job["chat_id"], p["chat_id"], p["message_id"], request_timeout=30)
            if late:
                await bot.send_message(job["chat_id"], note.strip(), request_timeout=15)
        with suppress(Exception):
            await bot.set_message_reaction(p["chat_id"], p["message_id"], [ReactionTypeEmoji(emoji="👍")], request_timeout=8)
        return []
    if job["kind"] == "text":  # generic text (acks, notices) to any chat
        late = now - job["orig_time"] > DELAY_NOTE_AFTER and p.get("stamp")
        await bot.send_message(job["chat_id"] or admin, p["html"] + (f"\n\n<i>{time_lines(job['orig_time'], now)}</i>" if late else ""),
                               reply_markup=InlineKeyboardMarkup.model_validate(p["kb"]) if p.get("kb") else None, request_timeout=15)
        return []
    raise ValueError(f"unknown job kind {job['kind']}")

async def outbox_worker():
    last_cleanup = 0
    while True:
        try:
            now = time.time()
            if now - last_cleanup > 3600:
                with db() as conn:  # orders/tickets are kept forever; only technical rows are pruned
                    conn.execute("DELETE FROM rate_events WHERE created_at < ?", (now - 86400,))
                    conn.execute("DELETE FROM outbox WHERE sent_at IS NOT NULL AND sent_at < ?", (now - 30 * 86400,))
                last_cleanup = now
            admin = owner_id()
            with db() as conn:
                job = conn.execute("SELECT * FROM outbox WHERE sent_at IS NULL AND failed=0 AND next_attempt<=? AND (direction!='admin' OR ?) ORDER BY id LIMIT 1",
                                   (now, 1 if admin else 0)).fetchone()
            if job and bot:
                if job["direction"] == "admin" and not job["chat_id"]:
                    with db() as conn:
                        conn.execute("UPDATE outbox SET chat_id=? WHERE id=?", (admin, job["id"]))
                try:
                    ids = await deliver(job)
                    with db() as conn:
                        conn.execute("UPDATE outbox SET sent_at=?, last_error=NULL WHERE id=?", (time.time(), job["id"]))
                        for i in ids:
                            conn.execute("INSERT OR REPLACE INTO msg_map VALUES (?,?)", (i, job["ticket_id"]))
                    mark_ok()
                    lag = time.time() - job["orig_time"]
                    log.info("Outbox %s %s/%s delivered (lag %ds)", job["id"], job["direction"], job["kind"], lag)
                    continue
                except Exception as exc:
                    await handle_send_error(job, exc)
            else:
                await maybe_email_alert()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Outbox worker recovered")
        outbox_event.clear()
        with suppress(asyncio.TimeoutError):
            await asyncio.wait_for(outbox_event.wait(), 2)

async def handle_send_error(job, exc):
    name = type(exc).__name__
    permanent = isinstance(exc, TelegramForbiddenError) or (isinstance(exc, TelegramBadRequest) and job["attempts"] >= 4)
    if isinstance(exc, TelegramBadRequest) and "message to be replied not found" in str(exc).lower():
        permanent = False
    if isinstance(exc, TelegramRetryAfter):
        delay = max(1, exc.retry_after)
    elif isinstance(exc, (TelegramNetworkError, TelegramServerError, asyncio.TimeoutError, OSError)):
        delay = min(120, 3 * 2 ** min(job["attempts"], 6))
        mark_fail()
    else:
        delay = min(600, 15 * 2 ** min(job["attempts"], 5))
    log.warning("Outbox %s deferred (%s, attempt %s)%s", job["id"], name, job["attempts"] + 1, " -> failed" if permanent else "")
    with db() as conn:
        conn.execute("UPDATE outbox SET attempts=attempts+1, next_attempt=?, last_error=?, failed=? WHERE id=?",
                     (time.time() + delay, name, 1 if permanent else 0, job["id"]))

# ---------------------------------------------------------------- connectivity / failover
ROUTES: dict[str, AiohttpSession] = {}

def build_routes():
    ROUTES["direct"] = AiohttpSession(timeout=30)
    if TELEGRAM_API_BASE:
        ROUTES["relay"] = AiohttpSession(api=TelegramAPIServer.from_base(TELEGRAM_API_BASE), timeout=30)
    if TELEGRAM_PROXY:
        try:
            ROUTES["proxy"] = AiohttpSession(proxy=TELEGRAM_PROXY, timeout=30)
        except Exception as exc:  # aiohttp-socks missing or bad URL
            log.warning("TELEGRAM_PROXY ignored (%s)", type(exc).__name__)

def mark_ok():
    STATE["last_ok"] = time.time(); STATE["fail_streak"] = 0

def mark_fail():
    STATE["fail_streak"] += 1

def use_route(name):
    if name != STATE["route"]:
        log.warning("Telegram route switched %s -> %s", STATE["route"], name)
    STATE["route"] = name
    bot.session = ROUTES[name]

async def probe(name):
    try:
        await asyncio.wait_for(ROUTES[name].make_request(bot, GetMe(), timeout=12), 15)
        return True
    except Exception:
        return False

async def health_worker():
    """Every minute check the active route; on failure try the others (direct preferred)."""
    last_full = 0
    while True:
        try:
            await asyncio.sleep(60)
            now = time.time()
            stale = now - STATE["last_ok"] > 90 or STATE["fail_streak"] >= 3
            if not stale and STATE["route"] == "direct" and now - last_full < 600:
                continue
            if STATE["route"] != "direct" and await probe("direct"):
                use_route("direct"); mark_ok(); continue
            if await probe(STATE["route"]):
                mark_ok(); continue
            for name in ROUTES:
                if name != STATE["route"] and await probe(name):
                    use_route(name); mark_ok(); outbox_event.set(); break
            last_full = now
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Health worker recovered")

async def maybe_email_alert():
    """If messages to the owner are stuck > 10 min, e-mail ALERT_EMAIL (needs SMTP_* in env)."""
    with db() as conn:
        row = conn.execute("SELECT count(*) n, min(created_at) oldest FROM outbox WHERE direction='admin' AND sent_at IS NULL AND failed=0").fetchone()
    if not row["n"] or time.time() - row["oldest"] < 600 or time.time() - STATE["last_alert"] < 3600:
        return
    STATE["last_alert"] = time.time()
    if not (SMTP["SMTP_HOST"] and SMTP["SMTP_USER"] and SMTP["SMTP_PASSWORD"]):
        STATE["alert_note"] = "SMTP не настроен"
        log.warning("Telegram to owner stuck: %s messages, oldest %s min; e-mail fallback not configured (set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD)", row["n"], int((time.time() - row["oldest"]) // 60))
        return
    with db() as conn:
        tickets = conn.execute("SELECT DISTINCT t.* FROM outbox o JOIN tickets t ON t.id=o.ticket_id WHERE o.direction='admin' AND o.sent_at IS NULL AND o.failed=0 ORDER BY t.id").fetchall()
    body = [f"Telegram недоступен, в очереди {row['n']} сообщений для вас.", ""]
    for t in tickets:
        body.append(f"#{t['id']} · {t['username'] and '@' + t['username'] or ''} {t['contact'] or ''} · {SERVICE_LABELS.get(t['service'] or '', '')} · {msk(t['created_at'])} МСК")
        if t["description"]:
            body.append("   " + t["description"][:500].replace("\n", " "))
    msg = EmailMessage()
    msg["Subject"] = f"CodWay: {row['n']} сообщений ждут доставки в Telegram"
    msg["From"] = SMTP["SMTP_FROM"] or SMTP["SMTP_USER"]; msg["To"] = ALERT_EMAIL
    msg.set_content("\n".join(body))
    def send():
        port = int(SMTP["SMTP_PORT"] or 465)
        cls = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
        with cls(SMTP["SMTP_HOST"], port, timeout=20) as s:
            if port != 465:
                s.starttls()
            s.login(SMTP["SMTP_USER"], SMTP["SMTP_PASSWORD"]); s.send_message(msg)
    try:
        await asyncio.to_thread(send); STATE["alert_note"] = f"email отправлен {msk(time.time())}"
        log.info("E-mail alert sent")
    except Exception as exc:
        STATE["alert_note"] = f"email ошибка {type(exc).__name__}"
        log.warning("E-mail alert failed (%s)", type(exc).__name__)

# ---------------------------------------------------------------- bot: helpers
class Req(StatesGroup):
    service = State()
    description = State()
    files = State()

MENU = ReplyKeyboardMarkup(resize_keyboard=True, is_persistent=True, keyboard=[
    [KeyboardButton(text="📝 Оставить заявку"), KeyboardButton(text="💬 Написать менеджеру")],
    [KeyboardButton(text="💰 Цены"), KeyboardButton(text="📂 Мои заявки"), KeyboardButton(text="📞 Контакты")]])
FILES_KB = ReplyKeyboardMarkup(resize_keyboard=True, keyboard=[
    [KeyboardButton(text="✅ Готово")], [KeyboardButton(text="📱 Поделиться телефоном", request_contact=True)]])

def is_admin(uid):
    return uid == owner_id()

def touch_user(u):
    with db() as conn:
        conn.execute("INSERT INTO bot_users (user_id,username,name,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET username=excluded.username, name=excluded.name",
                     (u.id, u.username, u.full_name, time.time()))
        row = conn.execute("SELECT * FROM bot_users WHERE user_id=?", (u.id,)).fetchone()
        linked = []
        if u.username:  # site leads that left this @username get linked to the chat
            for t in conn.execute("SELECT * FROM tickets WHERE user_id IS NULL AND lower(username)=lower(?) AND status!='closed'", (u.username,)).fetchall():
                conn.execute("UPDATE tickets SET user_id=?, name=? WHERE id=?", (u.id, u.full_name, t["id"]))
                enqueue(conn, "admin", "text", None, {"html": f"🔗 Клиент из тикета #{t['id']} (@{escape(u.username)}) написал в бот — теперь можно отвечать реплаем на его сообщения."}, time.time(), t["id"])
                linked.append(t["id"])
    return row

def open_ticket(conn, uid):
    return conn.execute("SELECT * FROM tickets WHERE user_id=? AND status!='closed' ORDER BY id DESC LIMIT 1", (uid,)).fetchone()

def new_ticket(conn, u, service, solution_id, description, orig):
    cur = conn.execute("INSERT INTO tickets (user_id,username,name,contact,source,service,solution_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                       (u.id, u.username, u.full_name, "@" + u.username if u.username else None, "bot", service, solution_id, description, orig, time.time()))
    enqueue(conn, "admin", "card", None, {}, orig, cur.lastrowid)
    return cur.lastrowid

def msg_payload(m: Message):
    if m.text:
        html = m.html_text
        return {"type": "text", "html": html if len(html) < 3600 else escape(m.text[:3400]) + "…"}
    if m.contact:
        return {"type": "text", "html": f"📱 Контакт: <b>{escape(m.contact.phone_number)}</b> {escape(m.contact.first_name or '')}"}
    captionable = bool(m.photo or m.video or m.document or m.audio or m.voice or m.animation)
    return {"type": "media", "chat_id": m.chat.id, "message_id": m.message_id, "captionable": captionable,
            "html": m.html_text if m.caption else ""}

def relay_to_admin(m: Message, ticket_id):
    with db() as conn:
        enqueue(conn, "admin", "client_msg", None, msg_payload(m), m.date.timestamp(), ticket_id)
        conn.execute("UPDATE tickets SET updated_at=? WHERE id=?", (time.time(), ticket_id))

def ack(m: Message, text, force=False):
    with db() as conn:
        u = conn.execute("SELECT last_ack FROM bot_users WHERE user_id=?", (m.from_user.id,)).fetchone()
        if force or not u or time.time() - u["last_ack"] > 1800:
            conn.execute("UPDATE bot_users SET last_ack=? WHERE user_id=?", (time.time(), m.from_user.id))
            enqueue(conn, "client", "text", m.chat.id, {"html": text}, time.time())

def prices_text():
    lines = ["💰 <b>Цены CodWay</b> — в 2–5 раз ниже студий (у студий от 50 000 ₽)\n"]
    for p in PRICING["projects"]:
        days = "3–5 недель" if p["id"] == "system" else f"{p['daysMin']}–{p['daysMax']} дн."
        lines.append(f"• {escape(p['label'])} — от <b>{money(p['min'])} ₽</b>, {days}")
    lines.append("\n<b>Доп. модули</b>")
    lines += [f"• {escape(f['label'])} — от {money(f['min'])} ₽" for f in PRICING["features"]]
    lines.append("\n<b>Готовые решения</b> (запуск 1–3 дня)")
    lines += [f"• {escape(s['title'])} — {money(s['price'])} ₽" for s in SOLUTIONS.values()]
    lines.append("\nОплата 50/50, 30 дней бесплатных правок, код передаём вам.\nПодробно: https://codway.su/ceny")
    return "\n".join(lines)

def services_kb():
    rows = [[InlineKeyboardButton(text=p["label"], callback_data=f"svc:{p['id']}")] for p in PRICING["projects"]]
    rows.append([InlineKeyboardButton(text="Другое / не знаю", callback_data="svc:other")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

# ---------------------------------------------------------------- bot: owner side
admin_only = lambda m: m.chat.type == "private" and m.from_user and is_admin(m.from_user.id)

@dispatcher.message(CommandStart())
async def start(message: Message, state: FSMContext):
    if message.chat.type != "private":
        return
    parts = (message.text or "").split(maxsplit=1)
    arg = parts[1] if len(parts) == 2 else ""
    if not owner_id() and BOOTSTRAP_TOKEN and secrets.compare_digest(arg, BOOTSTRAP_TOKEN):
        with db() as conn:
            conn.execute("INSERT OR IGNORE INTO settings VALUES ('admin_id',?)", (str(message.from_user.id),))
    if is_admin(message.from_user.id):
        await message.answer(ADMIN_HELP)
        return
    user = touch_user(message.from_user)
    if user["blocked"]:
        return
    await state.clear()
    await message.answer("Здравствуйте! Это <b>CodWay</b> — делаем Telegram-ботов, Mini Apps, сайты и парсеры. "
                         "Бот от 9 900 ₽, сайт от 14 900 ₽, оплата 50/50.\n\n"
                         "Нажмите «📝 Оставить заявку» или просто напишите вопрос — ответит живой разработчик.", reply_markup=MENU)
    if arg.startswith("sol_") and arg[4:] in SOLUTIONS:
        s = SOLUTIONS[arg[4:]]
        await state.update_data(service=s["project"], solution_id=s["id"])
        await state.set_state(Req.description)
        await message.answer(f"Вы выбрали готовое решение «<b>{escape(s['title'])}</b>» — {money(s['price'])} ₽.\n\nОпишите ваш бизнес и что нужно настроить (можно голосовым).")
    elif arg.startswith("svc_") and arg[4:] in PROJECTS:
        await state.update_data(service=arg[4:], solution_id=None)
        await state.set_state(Req.description)
        await message.answer(f"Услуга: <b>{escape(PROJECTS[arg[4:]]['label'])}</b>.\n\nОпишите задачу в паре предложений (можно голосовым).")

ADMIN_HELP = ("<b>CodWay · панель</b>\n\n"
              "Новые заявки и сообщения клиентов приходят сюда карточками и копиями.\n"
              "• <b>Ответить клиенту</b> — сделайте Reply (ответ) на любое его сообщение или на карточку тикета; текст, фото, файлы и голосовые уйдут клиенту.\n"
              "• Кнопки: ✋ Взять · ✅ Закрыть · ⛔ Заблокировать.\n"
              "• /tickets — открытые тикеты, /stats — статистика и связь, /orders — заявки с сайта.\n\n"
              "🕒 у каждого сообщения — время отправки клиентом (МСК); ⏳ — если Telegram доставил с задержкой.")

@dispatcher.message(Command("help"), admin_only)
async def help_command(message: Message):
    await message.answer(ADMIN_HELP)

@dispatcher.message(Command("stats"), admin_only)
async def stats(message: Message):
    with db() as conn:
        t = dict(conn.execute("SELECT status, count(*) FROM tickets GROUP BY status").fetchall())
        o = conn.execute("SELECT count(*) FROM orders").fetchone()[0]
        week = conn.execute("SELECT count(*) FROM tickets WHERE created_at>?", (time.time() - 7 * 86400,)).fetchone()[0]
        users = conn.execute("SELECT count(*), sum(blocked) FROM bot_users").fetchone()
        q = conn.execute("SELECT direction, count(*) FROM outbox WHERE sent_at IS NULL AND failed=0 GROUP BY direction").fetchall()
    mem = psutil.virtual_memory()
    queue = ", ".join(f"{'вам' if d == 'admin' else 'клиентам'} {n}" for d, n in q) or "пусто"
    await message.answer(f"📊 <b>CodWay</b>\n\nТикеты: новые {t.get('new', 0)}, в работе {t.get('active', 0)}, закрыты {t.get('closed', 0)}\n"
                         f"За 7 дней: {week}\nЗаявок с сайта всего: {o}\nКлиентов в боте: {users[0]} (заблок. {users[1] or 0})\n"
                         f"Очередь доставки: {queue}\nМаршрут Telegram: {STATE['route']} (доступно: {', '.join(ROUTES)})\n\n"
                         f"RAM: {mem.used // 1048576}/{mem.total // 1048576} MB · Диск: {psutil.disk_usage('/').percent}%")

@dispatcher.message(Command("tickets"), admin_only)
async def tickets_cmd(message: Message):
    with db() as conn:
        rows = conn.execute("SELECT * FROM tickets WHERE status!='closed' ORDER BY id DESC LIMIT 20").fetchall()
    if not rows:
        await message.answer("Открытых тикетов нет 🎉")
        return
    kb = [[InlineKeyboardButton(text=f"#{r['id']} {STATUS[r['status']][:1]} {(r['name'] or r['contact'] or '')[:20]} · {SERVICE_LABELS.get(r['service'] or '', '')[:18]}",
                                callback_data=f"t:show:{r['id']}")] for r in rows]
    await message.answer(f"Открытые тикеты ({len(rows)}). Нажмите, чтобы открыть карточку:", reply_markup=InlineKeyboardMarkup(inline_keyboard=kb))

@dispatcher.message(Command("orders"), admin_only)
async def orders_cmd(message: Message):
    with db() as conn:
        rows = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 5").fetchall()
    if not rows:
        await message.answer("Заявок с сайта пока нет.")
    for o in rows:
        await message.answer(f"Заявка №{o['id']} · {escape(o['contact'])} · {escape(SERVICE_LABELS.get(o['project'], o['project']))} · {o['status']}\n"
                             f"{msk(o['created_at'])} МСК\n{escape(o['description'][:500])}")

@dispatcher.callback_query(F.data.startswith("t:"))
async def ticket_action(q: CallbackQuery):
    if not is_admin(q.from_user.id):
        await q.answer("Доступ закрыт", show_alert=True); return
    try:
        _, action, tid = q.data.split(":"); tid = int(tid)
    except ValueError:
        await q.answer(); return
    with db() as conn:
        t = get_ticket(conn, tid)
        if not t:
            await q.answer("Тикет не найден"); return
        if action == "take":
            conn.execute("UPDATE tickets SET status='active', updated_at=? WHERE id=?", (time.time(), tid))
            if t["order_id"]: conn.execute("UPDATE orders SET status='active' WHERE id=?", (t["order_id"],))
        elif action == "close":
            conn.execute("UPDATE tickets SET status='closed', updated_at=? WHERE id=?", (time.time(), tid))
            if t["order_id"]: conn.execute("UPDATE orders SET status='archived' WHERE id=?", (t["order_id"],))
        elif action == "block" and t["user_id"]:
            conn.execute("UPDATE bot_users SET blocked=1 WHERE user_id=?", (t["user_id"],))
            conn.execute("UPDATE tickets SET status='closed', updated_at=? WHERE user_id=?", (time.time(), t["user_id"]))
        t = get_ticket(conn, tid); order = get_order(conn, t)
    if action == "show":
        await q.answer()
        m = await q.message.answer(ticket_card(t, order), reply_markup=ticket_kb(t))
        with db() as conn:
            conn.execute("INSERT OR REPLACE INTO msg_map VALUES (?,?)", (m.message_id, tid))
        return
    await q.answer({"take": "В работе", "close": "Закрыт", "block": "Клиент заблокирован"}.get(action, "Ок"))
    with suppress(Exception):
        await q.message.edit_text(ticket_card(t, order), reply_markup=ticket_kb(t))

@dispatcher.callback_query(F.data.startswith("order:"))
async def legacy_order_action(q: CallbackQuery):  # buttons on cards sent before the upgrade
    if not is_admin(q.from_user.id):
        await q.answer("Доступ закрыт", show_alert=True); return
    with suppress(ValueError):
        _, status, oid = q.data.split(":")
        if status in ("active", "archived"):
            with db() as conn:
                conn.execute("UPDATE orders SET status=? WHERE id=?", (status, int(oid)))
                conn.execute("UPDATE tickets SET status=? WHERE order_id=?", ("active" if status == "active" else "closed", int(oid)))
    await q.answer("Готово")

@dispatcher.message(admin_only)
async def admin_message(message: Message):
    r = message.reply_to_message
    if not r:
        await message.answer("Чтобы ответить клиенту, сделайте <b>Reply</b> на его сообщение или карточку тикета. /tickets — список.")
        return
    with db() as conn:
        mp = conn.execute("SELECT ticket_id FROM msg_map WHERE admin_msg_id=?", (r.message_id,)).fetchone()
        t = get_ticket(conn, mp["ticket_id"]) if mp else None
        if t and t["user_id"]:
            enqueue(conn, "client", "admin_msg", t["user_id"], {**msg_payload(message), "chat_id": message.chat.id, "message_id": message.message_id},
                    message.date.timestamp(), t["id"])
            conn.execute("UPDATE tickets SET status=CASE WHEN status='new' OR status='closed' THEN 'active' ELSE status END, updated_at=? WHERE id=?", (time.time(), t["id"]))
            return
    if not t:
        await message.answer("Не нашёл тикет для этого сообщения. Ответьте на карточку тикета или сообщение клиента.")
    else:
        await message.answer(f"Клиент тикета #{t['id']} ещё не писал в бот, ответить через бот нельзя. Контакт: {escape(t['contact'] or '—')}")

# ---------------------------------------------------------------- bot: client side
async def blocked(m: Message):
    return touch_user(m.from_user)["blocked"]

@dispatcher.message(F.chat.type == "private", F.text == "📝 Оставить заявку")
async def req_start(m: Message, state: FSMContext):
    if await blocked(m): return
    await state.clear(); await state.set_state(Req.service)
    await m.answer("Что нужно сделать?", reply_markup=services_kb())

@dispatcher.callback_query(F.data.startswith("svc:"))
async def req_service(q: CallbackQuery, state: FSMContext):
    svc = q.data[4:]
    await state.update_data(service=svc if svc in SERVICE_LABELS else "other", solution_id=None)
    await state.set_state(Req.description)
    await q.answer()
    with suppress(Exception):
        await q.message.edit_text(f"Услуга: <b>{escape(SERVICE_LABELS.get(svc, 'Другое'))}</b>")
    await q.message.answer("Опишите задачу: что должен уметь продукт, для кого, есть ли примеры. Можно текстом или голосовым.")

@dispatcher.message(F.chat.type == "private", F.text == "💰 Цены")
async def prices(m: Message):
    if await blocked(m): return
    await m.answer(prices_text(), disable_web_page_preview=True)

@dispatcher.message(F.chat.type == "private", F.text == "📞 Контакты")
async def contacts(m: Message):
    if await blocked(m): return
    await m.answer(CONTACTS, disable_web_page_preview=True)

@dispatcher.message(F.chat.type == "private", F.text == "📂 Мои заявки")
async def my_tickets(m: Message):
    if await blocked(m): return
    with db() as conn:
        rows = conn.execute("SELECT * FROM tickets WHERE user_id=? ORDER BY id DESC LIMIT 10", (m.from_user.id,)).fetchall()
    if not rows:
        await m.answer("У вас пока нет заявок. Нажмите «📝 Оставить заявку».", reply_markup=MENU); return
    await m.answer("📂 <b>Ваши заявки</b>\n\n" + "\n".join(
        f"#{r['id']} · {escape(SERVICE_LABELS.get(r['service'] or '', '—'))} · {STATUS[r['status']]} · {msk(r['created_at'])}" for r in rows), reply_markup=MENU)

@dispatcher.message(F.chat.type == "private", F.text == "💬 Написать менеджеру")
async def write_manager(m: Message, state: FSMContext):
    if await blocked(m): return
    await state.clear()
    await m.answer("Напишите сообщение — текст, фото, файл или голосовое. Передам менеджеру, ответ придёт сюда.", reply_markup=MENU)

@dispatcher.message(F.chat.type == "private", StateFilter(Req.service))
async def req_service_text(m: Message, state: FSMContext):
    await state.update_data(service="other", solution_id=None); await state.set_state(Req.description)
    await req_description(m, state)

@dispatcher.message(F.chat.type == "private", StateFilter(Req.description))
async def req_description(m: Message, state: FSMContext):
    if await blocked(m): return
    data = await state.get_data()
    with db() as conn:
        tid = new_ticket(conn, m.from_user, data.get("service") or "other", data.get("solution_id"), m.text or m.caption or "", m.date.timestamp())
    if not m.text:
        relay_to_admin(m, tid)
    await state.update_data(ticket_id=tid); await state.set_state(Req.files)
    await m.answer(f"Принято, заявка <b>#{tid}</b>. Пришлите файлы, скриншоты или примеры (если есть) и нажмите «✅ Готово». "
                   "Можно поделиться телефоном — так быстрее созвониться.", reply_markup=FILES_KB)

@dispatcher.message(F.chat.type == "private", StateFilter(Req.files))
async def req_files(m: Message, state: FSMContext):
    data = await state.get_data()
    if m.text == "✅ Готово":
        await state.clear()
        await m.answer(f"✅ Заявка #{data['ticket_id']} у менеджера. Ответим здесь в течение часа (9:00–22:00 МСК). "
                       "Если захотите что-то добавить — просто напишите.", reply_markup=MENU)
        return
    relay_to_admin(m, data["ticket_id"])
    if m.contact:
        with db() as conn:
            conn.execute("UPDATE tickets SET contact=? WHERE id=?", (m.contact.phone_number, data["ticket_id"]))

@dispatcher.message(F.chat.type == "private")
async def client_message(m: Message):
    user = touch_user(m.from_user)
    if user["blocked"]:
        return
    with db() as conn:
        t = open_ticket(conn, m.from_user.id)
        tid = t["id"] if t else new_ticket(conn, m.from_user, "question", None, "", m.date.timestamp())
    relay_to_admin(m, tid)
    ack(m, "✉️ Передал менеджеру, ответ придёт сюда. Обычно отвечаем в течение часа (9:00–22:00 МСК).", force=not t)

# ---------------------------------------------------------------- polling
async def polling_worker():
    while True:
        try:
            await bot.delete_webhook(drop_pending_updates=False, request_timeout=15)
            await dispatcher.start_polling(bot, handle_signals=False, close_bot_session=False, polling_timeout=20,
                                           allowed_updates=["message", "callback_query"])
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.warning("Bot polling retry (%s)", type(exc).__name__)
            mark_fail()
            await asyncio.sleep(10)

@asynccontextmanager
async def lifespan(app):
    global bot
    init_db()
    tasks = []
    if BOT_TOKEN:
        build_routes()
        bot = Bot(BOT_TOKEN, session=ROUTES["direct"], default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        STATE["last_ok"] = time.time()
        tasks = [asyncio.create_task(c()) for c in (polling_worker, outbox_worker, health_worker)]
    yield
    for task in tasks:
        task.cancel()
    for task in tasks:
        with suppress(asyncio.CancelledError):
            await task
    for s in ROUTES.values():
        with suppress(Exception):
            await s.close()

# ---------------------------------------------------------------- HTTP API
app = FastAPI(title="Codwey API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
origins = os.getenv("ALLOWED_ORIGINS", "https://codway.su,https://www.codway.su").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["POST", "GET"], allow_headers=["Content-Type"], allow_credentials=False)

class OrderIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    submission_id: UUID
    contact: str = Field(min_length=5, max_length=40)
    project: Literal["bot", "miniapp", "site", "script", "system"]
    features: list[str] = Field(default_factory=list, max_length=5)
    description: str = Field(min_length=10, max_length=3000)
    consent: Literal[True]
    website: str = Field(default="", max_length=200)
    solution_id: str | None = Field(default=None, max_length=40)

    @field_validator("solution_id")
    @classmethod
    def solution_valid(cls, value):
        if value is not None and value not in SOLUTIONS:
            raise ValueError("Неизвестное готовое решение")
        return value

    @field_validator("contact")
    @classmethod
    def contact_valid(cls, value):
        if re.fullmatch(r"@?[A-Za-z][A-Za-z0-9_]{4,31}", value):
            return "@" + value.lstrip("@")
        compact = re.sub(r"[\s()\-]", "", value)
        if re.fullmatch(r"8\d{10}", compact):
            compact = "+7" + compact[1:]
        if re.fullmatch(r"\+[1-9]\d{9,14}", compact):
            return compact
        raise ValueError("Укажите Telegram @username (от 5 символов) или телефон с кодом страны")

    @field_validator("features")
    @classmethod
    def features_valid(cls, value):
        if any(f not in FEATURES for f in value) or len(set(value)) != len(value):
            raise ValueError("Неизвестная или повторяющаяся опция")
        return sorted(value)

def estimate(project, features):
    parts = [PROJECTS[project], *(FEATURES[f] for f in features)]
    return {"price_min": sum(p["min"] for p in parts), "price_max": sum(p["max"] for p in parts),
            "days_min": sum(p["daysMin"] for p in parts), "days_max": sum(p["daysMax"] for p in parts)}

@app.get("/api/health")
def health():
    try:
        with db() as conn:
            pending = dict(conn.execute("SELECT direction, count(*) FROM outbox WHERE sent_at IS NULL AND failed=0 GROUP BY direction").fetchall())
            oldest = conn.execute("SELECT min(created_at) FROM outbox WHERE sent_at IS NULL AND failed=0").fetchone()[0]
            open_t = conn.execute("SELECT count(*) FROM tickets WHERE status!='closed'").fetchone()[0]
    except sqlite3.Error:
        raise HTTPException(503, "Database unavailable")
    mem = psutil.virtual_memory()
    return {"status": "ok", "database": "ok", "memory": {"used_mb": mem.used // 1048576, "total_mb": mem.total // 1048576, "percent": mem.percent},
            "telegram": {"configured": bool(BOT_TOKEN), "route": STATE["route"], "routes": list(ROUTES),
                         "last_ok_sec_ago": int(time.time() - STATE["last_ok"]) if STATE["last_ok"] else None, "email_fallback": STATE["alert_note"] or ("configured" if SMTP["SMTP_HOST"] else "not configured")},
            "admin_configured": bool(owner_id()), "open_tickets": open_t,
            "outbox_pending": {"to_admin": pending.get("admin", 0), "to_clients": pending.get("client", 0)},
            "outbox_oldest_sec": int(time.time() - oldest) if oldest else 0}

@app.post("/api/order", status_code=201)
def create_order(payload: OrderIn, request: Request):
    if payload.website:
        raise HTTPException(400, "Не удалось принять заявку")
    solution = SOLUTIONS.get(payload.solution_id)
    if solution and (payload.project != solution["project"] or payload.features):
        raise HTTPException(422, "Для готового решения выберите его тип без опций заказной разработки")
    body = payload.model_dump(mode="json", exclude={"submission_id", "website"}, exclude_none=True)
    digest = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    now = time.time()
    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
    ip_hash = hashlib.sha256(RATE_SALT + ip.encode()).hexdigest()
    cost = ({"price_min": solution["price"], "price_max": solution["price"], "days_min": 1, "days_max": 3}
            if solution else estimate(payload.project, payload.features))
    with db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute("SELECT id,payload_hash FROM orders WHERE submission_id=?", (str(payload.submission_id),)).fetchone()
        if existing:
            if existing["payload_hash"] != digest:
                raise HTTPException(409, "Для изменённой заявки нужен новый идентификатор")
            return {"id": existing["id"], "status": "accepted", "duplicate": True, "estimate": cost}
        count = conn.execute("SELECT count(*) FROM rate_events WHERE ip_hash=? AND created_at>?", (ip_hash, now - 600)).fetchone()[0]
        if count >= 5:
            raise HTTPException(429, "Слишком много заявок. Попробуйте через 10 минут.", headers={"Retry-After": "600"})
        cur = conn.execute("INSERT INTO orders (submission_id,payload_hash,contact,project,features,description,price_min,price_max,days_min,days_max,created_at,solution_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                           (str(payload.submission_id), digest, payload.contact, payload.project, json.dumps(payload.features), payload.description,
                            cost["price_min"], cost["price_max"], cost["days_min"], cost["days_max"], now, payload.solution_id))
        conn.execute("INSERT INTO rate_events VALUES (?,?)", (ip_hash, now))
        order_id = cur.lastrowid
        order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        tid = ticket_from_order(conn, order)
    log.info("Order %s accepted -> ticket %s", order_id, tid)
    return {"id": order_id, "ticket": tid, "status": "accepted", "estimate": cost}
