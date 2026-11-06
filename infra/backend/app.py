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

import ai_manager

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
AI_MODE = ai_manager.parse_mode(os.getenv("AI_MANAGER_MODE"))
NVIDIA_KEYS = ai_manager.parse_keys(os.getenv("NVIDIA_KEYS", ""))
MISTRAL_KEYS = ai_manager.parse_keys(os.getenv("MISTRAL_KEYS", ""))

def _positive_int(name, default):
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default

AI_DAILY_CAP = _positive_int("AI_DAILY_CAP", 800)
AI_USER_DAILY = _positive_int("AI_USER_DAILY", ai_manager.USER_DAILY)
try:
    AI_USER_INTERVAL = float(os.getenv("AI_USER_INTERVAL", str(ai_manager.USER_INTERVAL)))
except ValueError:
    AI_USER_INTERVAL = ai_manager.USER_INTERVAL
RATE_SALT = hashlib.sha256((BOT_TOKEN or "local-development").encode()).digest()
MSK = ZoneInfo("Europe/Moscow")
DELAY_NOTE_AFTER = 300
CONTACTS = ("📬 <b>Контакты CodWay</b>\n"
            "🤖 @codway_bot · 💬 @mexciti\n"
            "✉️ coddweyy@gmail.com\n"
            "🌐 https://codway.su")

SERVICE_LABELS = {**{k: v["label"] for k, v in PROJECTS.items()}, "other": "Другое / консультация", "question": "Вопрос"}
bot: Bot | None = None
dispatcher = Dispatcher()
outbox_event = asyncio.Event()
STATE = {"route": "direct", "last_ok": 0.0, "fail_streak": 0, "last_alert": 0.0, "alert_note": ""}
AI_LOCKS: dict[int, asyncio.Lock] = {}

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
        ai_manager.ensure_schema(conn)
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
money = lambda v: f"{v:,}".replace(",", "\u202f")

def krat(ts):
    return datetime.fromtimestamp(ts, timezone.utc).astimezone(ZoneInfo("Asia/Krasnoyarsk")).strftime("%d.%m.%Y %H:%M")

def delay_text(seconds):
    m = int(seconds // 60)
    return f"{m // 60} ч {m % 60} мин" if m >= 60 else f"{m} мин"

def time_lines(orig, sent=None):
    sent = sent or time.time()
    line = f"🕒 <b>Время:</b> {krat(orig)} · Красноярск (UTC+7)"
    if sent - orig > DELAY_NOTE_AFTER:
        line += f"\n⏳ доставлено с задержкой {delay_text(sent - orig)}"
    return line

def who(t):
    """One escaped field per line; IDs are numeric, usernames validated before linking."""
    lines = [f"<b>Имя:</b> {escape(t['name'] or 'Не указано')}"]
    username = t["username"] or ""
    if re.fullmatch(r"[A-Za-z0-9_]{1,32}", username):
        lines.append(f'<b>Юз:</b> <a href="https://t.me/{username}">@{username}</a>')
    else:
        lines.append(f"<b>Юз:</b> {escape('@' + username) if username else 'Не указан'}")
    uid = t["user_id"]
    if uid and str(uid).isdigit():
        lines.append(f'<b>ID:</b> <a href="tg://user?id={int(uid)}">{int(uid)} · открыть профиль</a>')
    else:
        lines.append("<b>ID:</b> Клиент ещё не писал в бот")
    contact = t["contact"] or ""
    if contact and contact != "@" + username:
        lines.append(f"<b>Контакт:</b> {escape(contact)}")
    return "\n".join(lines)

STATUS = {"new": "🆕 Новая", "active": "🛠 В работе", "closed": "✅ Закрыта"}

def source_text(t):
    src = t["source"] or "bot"
    if src == "site":
        return "Форма сайта" + (f" · заявка №{t['order_id']}" if t["order_id"] else "")
    if src.startswith("demo_"):
        return "Демо → бот · " + escape(src)
    if src == "ai":
        return "AI-менеджер"
    return "Бот"

def ticket_card(t, order=None):
    sol = SOLUTIONS.get(t["solution_id"] or "")
    if sol:
        budget, days = money(sol["price"]) + " ₽", "Сроки подберём под вас"
    elif order:
        budget = f"{money(order['price_min'])}–{money(order['price_max'])} ₽ · ориентир"
        days = f"{order['days_min']}–{order['days_max']} дней · ориентир"
    else:
        budget, days = "Не указан — обсудим с клиентом", "Уточним по задаче"
    blocks = [f"📩 <b>Заявка / тикет №{t['id']}</b>\n<b>Статус:</b> {escape(STATUS.get(t['status'], t['status']))}",
              "👤 <b>Клиент</b>\n" + who(t),
              f"📍 <b>Источник:</b> {source_text(t)}\n"
              f"🛠 <b>Услуга:</b> {escape(SERVICE_LABELS.get(t['service'] or '', t['service'] or 'Не указана'))}\n"
              + (f"🧩 <b>Решение:</b> {escape(sol['title'])}\n" if sol else "")
              + f"💰 <b>Бюджет:</b> {budget}\n⏳ <b>Сроки:</b> {days}"]
    if order:
        feats = [FEATURES[f]["label"] for f in json.loads(order["features"]) if f in FEATURES]
        if feats:
            blocks.append("➕ <b>Дополнения</b>\n" + "\n".join("• " + escape(f) for f in feats))
    blocks.append("📝 <b>Описание</b>\n" + escape((t["description"] or "Не добавлено")[:3000]))
    blocks.append(time_lines(t["created_at"], t["card_sent_at"]))
    if not t["user_id"]:
        blocks.append("💡 <i>Клиент ещё не писал в бот. Свяжитесь по указанному контакту.</i>")
    else:
        blocks.append("↩️ <i>Ответьте на эту карточку или сообщение тикета — ответ уйдёт клиенту.</i>")
    return "\n\n".join(blocks)


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
        head = f"💬 <b>Сообщение · тикет №{t['id']}</b>\n\n{who(t)}\n\n📍 <b>Источник:</b> {source_text(t)}\n\n{time_lines(job['orig_time'], now)}"
        reply = ReplyParameters(message_id=t["card_msg_id"], allow_sending_without_reply=True) if t["card_msg_id"] else None
        if p["type"] == "text":
            m = await bot.send_message(admin, f"{head}\n\n{p['html']}", reply_parameters=reply, request_timeout=15)
            return [m.message_id]
        h = await bot.send_message(admin, head, reply_parameters=reply, request_timeout=15)
        m = await bot.copy_message(admin, p["chat_id"], p["message_id"], reply_parameters=ReplyParameters(message_id=h.message_id, allow_sending_without_reply=True), request_timeout=30)
        return [h.message_id, m.message_id]
    if job["kind"] == "admin_msg":  # admin -> client
        late = now - job["orig_time"] > DELAY_NOTE_AFTER
        note = f"\n\n<i>{time_lines(job['orig_time'], now)}</i>" if late else ""
        if p["type"] == "text":
            await bot.send_message(job["chat_id"], f"💬 <b>Менеджер CodWay</b>\n\n{p['html']}{note}", request_timeout=15)
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
        body.append(f"#{t['id']} · {t['username'] and '@' + t['username'] or ''} {t['contact'] or ''} · {SERVICE_LABELS.get(t['service'] or '', '')} · {krat(t['created_at'])} Красноярск (UTC+7)")
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
        await asyncio.to_thread(send); STATE["alert_note"] = f"email отправлен {krat(time.time())}"
        log.info("E-mail alert sent")
    except Exception as exc:
        STATE["alert_note"] = f"email ошибка {type(exc).__name__}"
        log.warning("E-mail alert failed (%s)", type(exc).__name__)

# ---------------------------------------------------------------- bot: helpers
class Req(StatesGroup):
    service = State()
    description = State()
    files = State()

class Ai(StatesGroup):
    chat = State()

CATALOG_BTN = "🧩 Готовые решения"

def menu_rows(include_ai):
    rows = [
        [KeyboardButton(text="📝 Оставить заявку"), KeyboardButton(text=CATALOG_BTN)],
        [KeyboardButton(text="💬 Написать менеджеру"), KeyboardButton(text="💰 Цены")],
        [KeyboardButton(text="📂 Мои заявки"), KeyboardButton(text="📞 Контакты")],
    ]
    if include_ai:
        rows.append([KeyboardButton(text=ai_manager.AI_BTN)])
    return rows

def menu_kb(user_id):
    return ReplyKeyboardMarkup(resize_keyboard=True, is_persistent=True,
                               keyboard=menu_rows(ai_manager.enabled_for(AI_MODE, is_admin(user_id))))

def ai_session_kb(user_id):
    return ReplyKeyboardMarkup(resize_keyboard=True, is_persistent=True,
                               keyboard=[[KeyboardButton(text=ai_manager.AI_EXIT)], *menu_rows(False)])

def ai_reply_kb(user_id, in_session=False):
    """Admins only get the AI button, so the client menu is not forced onto the owner chat."""
    if is_admin(user_id):
        if not ai_manager.enabled_for(AI_MODE, True):
            return None
        label = ai_manager.AI_EXIT if in_session else ai_manager.AI_BTN
        return ReplyKeyboardMarkup(resize_keyboard=True, is_persistent=True, keyboard=[[KeyboardButton(text=label)]])
    return ai_session_kb(user_id) if in_session else menu_kb(user_id)

def ai_catalog():
    return {"projects": PROJECTS, "features": FEATURES, "tiers": PRICING.get("tiers") or [], "solutions": SOLUTIONS}
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

def new_ticket(conn, u, service, solution_id, description, orig, source="bot"):
    if source != "ai" and not (source.startswith("demo_") and source[5:] in SOLUTIONS):
        source = "bot"
    cur = conn.execute("INSERT INTO tickets (user_id,username,name,contact,source,service,solution_id,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                       (u.id, u.username, u.full_name, "@" + u.username if u.username else None, source, service, solution_id, description, orig, time.time()))
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
    blocks = ["💰 <b>Цены CodWay</b>\nРазработка под вашу задачу"]
    tiers = PRICING.get("tiers") or PRICING["projects"]
    for ids, title in [(("bot",), "🤖 Боты"), (("miniapp",), "📱 Mini Apps"),
                       (("site",), "🌐 Сайты"), (("script", "system"), "⚙️ Автоматизация")]:
        items = [p for p in tiers if (p.get("project") or p.get("id")) in ids]
        if items:
            blocks.append(f"<b>{title}</b>\n" + "\n".join(
                f"• {escape(p['label'])} — от {money(p['min'])} ₽" for p in items))
    blocks.append("➕ <b>Дополнения</b>\n" + "\n".join(
        f"• {escape(f['label'])} — от {money(f['min'])} ₽" for f in PRICING["features"]))
    blocks.append("🧩 <b>Готовые решения</b>\nСроки подберём под вас\n\n" + "\n".join(
        f"• {escape(x['title'])} — {money(x['price'])} ₽" for x in SOLUTIONS.values()))
    blocks.append("🤝 <b>Условия</b>\nОплата 50/50\n30 дней бесплатных правок\nИсходный код — ваш")
    blocks.append('🔗 <a href="https://codway.su/ceny">Цены и сроки на сайте</a>')
    return "\n\n".join(blocks)

# ---------------------------------------------------------------- bot: ready-made catalog (same items as codway.su)
SITE_URL = "https://codway.su"
CATALOG_GROUPS = (("bot", "🤖", "Telegram-боты"), ("miniapp", "📱", "Mini Apps"), ("site", "🌐", "Сайты"))
GROUP_ICON = {g: i for g, i, _ in CATALOG_GROUPS}
SOL_RE = re.compile(r"[a-z0-9_]{1,40}")

def demo_url(s):
    return f"{SITE_URL}/demo/{s['id']}/"

def catalog_text():
    return ("🧩 <b>Готовые решения</b>\n"
            "Сроки подберём под вас\n"
            "👇 Выберите решение — внутри демо и цена.")

def catalog_kb():
    rows = [[InlineKeyboardButton(text=f"{GROUP_ICON.get(x['project'], '•')} {x['title']} · {money(x['price'])} ₽", callback_data=f"cat:item:{x['id']}")]
            for g, _, _ in CATALOG_GROUPS for x in SOLUTIONS.values() if x["project"] == g]
    rows.append([InlineKeyboardButton(text="📝 Своя задача", callback_data="cat:custom")])
    return InlineKeyboardMarkup(inline_keyboard=rows)

def item_text(x):
    summary = "; ".join(x.get("features", [])[:2])
    return (f"{GROUP_ICON.get(x['project'], '🧩')} <b>{escape(x['title'])}</b>\n"
            f"💰 <b>{money(x['price'])} ₽</b>\n"
            f"{escape(summary)}\n"
            "⏳ Сроки подберём под вас")

def item_kb(x):
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔗 Открыть демо", url=demo_url(x))],
        [InlineKeyboardButton(text="✅ Хочу такой", callback_data=f"cat:want:{x['id']}")],
        [InlineKeyboardButton(text="« Назад", callback_data="cat:list")]])

async def show_screen(q: CallbackQuery, text, kb):
    """Edit the catalog message in place; fall back to a new message if it can't be edited."""
    try:
        await q.message.edit_text(text, reply_markup=kb, disable_web_page_preview=True)
    except TelegramBadRequest as exc:
        if "not modified" not in str(exc):
            await bot.send_message(q.from_user.id, text, reply_markup=kb, disable_web_page_preview=True)
    except AttributeError:  # InaccessibleMessage (older than 48 h) can't be edited
        await bot.send_message(q.from_user.id, text, reply_markup=kb, disable_web_page_preview=True)

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
        await message.answer(ADMIN_HELP, reply_markup=ai_reply_kb(message.from_user.id, in_session=False))
        return
    user = touch_user(message.from_user)
    if user["blocked"]:
        return
    await state.clear()
    await message.answer("👋 <b>CodWay</b> — боты, Mini Apps, сайты и парсеры\n"
                         "Боты от 4 900 ₽ · Mini Apps от 14 900 ₽\n"
                         "Сайты от 9 900 ₽\n"
                         "👇 Выберите пункт или напишите вопрос.", reply_markup=menu_kb(message.from_user.id))
    if arg.startswith("demo_") and arg[5:] in SOLUTIONS:  # visitor came from a demo on codway.su
        s = SOLUTIONS[arg[5:]]
        await state.update_data(entry_source=arg)
        await message.answer(item_text(s), reply_markup=item_kb(s), disable_web_page_preview=True)
    elif arg == "catalog":
        await message.answer(catalog_text(), reply_markup=catalog_kb(), disable_web_page_preview=True)
    elif arg.startswith("sol_") and arg[4:] in SOLUTIONS:
        s = SOLUTIONS[arg[4:]]
        await state.update_data(service=s["project"], solution_id=s["id"])
        await state.set_state(Req.description)
        await message.answer(f"🧩 <b>{escape(s['title'])}</b> — {money(s['price'])} ₽\n"
                             "⏳ Сроки подберём под вас\n📝 Что настроить? Можно голосом.")
    elif arg.startswith("svc_") and arg[4:] in PROJECTS:
        await state.update_data(service=arg[4:], solution_id=None)
        await state.set_state(Req.description)
        await message.answer(f"🛠 <b>{escape(PROJECTS[arg[4:]]['label'])}</b>\n📝 Что нужно сделать? Можно голосом.")

ADMIN_HELP = ("<b>CodWay · панель</b>\n\n"
              "Новые заявки и сообщения клиентов приходят сюда карточками и копиями.\n"
              "• <b>Ответить клиенту</b> — сделайте Reply (ответ) на любое его сообщение или на карточку тикета; текст, фото, файлы и голосовые уйдут клиенту.\n"
              "• Кнопки: ✋ Взять · ✅ Закрыть · ⛔ Заблокировать.\n"
              "• /tickets — открытые тикеты, /stats — статистика и связь, /orders — заявки с сайта.\n\n"
              "🕒 у каждого сообщения — время отправки клиентом (Красноярск, UTC+7); ⏳ — если Telegram доставил с задержкой.")

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
    await message.answer(
        f"📊 <b>CodWay · статистика</b>\n\n"
        f"<b>Новые тикеты:</b> {t.get('new', 0)}\n<b>В работе:</b> {t.get('active', 0)}\n<b>Закрыты:</b> {t.get('closed', 0)}\n"
        f"<b>Тикетов за 7 дней:</b> {week}\n\n"
        f"<b>Заявок с сайта:</b> {o}\n<b>Клиентов в боте:</b> {users[0]}\n<b>Заблокировано:</b> {users[1] or 0}\n\n"
        f"<b>Очередь доставки:</b> {escape(queue)}\n<b>Маршрут Telegram:</b> {escape(STATE['route'])}\n"
        f"<b>Доступные маршруты:</b> {escape(', '.join(ROUTES))}\n\n"
        f"<b>RAM:</b> {mem.used // 1048576}/{mem.total // 1048576} МБ\n<b>Диск:</b> {psutil.disk_usage('/').percent}%")

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
        with db() as conn:
            t = conn.execute("SELECT * FROM tickets WHERE order_id=? ORDER BY id DESC LIMIT 1", (o["id"],)).fetchone()
        if t:
            await message.answer(ticket_card(t, o))
        else:
            await message.answer(f"📩 <b>Заявка с сайта №{o['id']}</b>\n\n<b>Контакт:</b> {escape(o['contact'])}\n"
                                 f"<b>Услуга:</b> {escape(SERVICE_LABELS.get(o['project'], o['project']))}\n"
                                 f"<b>Статус:</b> {escape(o['status'])}\n\n📝 <b>Описание</b>\n{escape(o['description'][:3000])}\n\n{time_lines(o['created_at'])}")

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
async def admin_message(message: Message, state: FSMContext):
    in_ai = await state.get_state() == Ai.chat.state
    # A reply to a ticket still reaches the client, even if the admin is inside the AI dialog.
    if message.text in (ai_manager.AI_BTN, ai_manager.AI_EXIT) or (in_ai and not message.reply_to_message):
        await handle_ai_message(message, state)
        return
    r = message.reply_to_message
    if not r and message.text in (CATALOG_BTN, "/catalog"):  # owner can preview the client catalog
        await message.answer(catalog_text(), reply_markup=catalog_kb(), disable_web_page_preview=True)
        return
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
    await m.answer("🛠 <b>Что нужно сделать?</b>\n👇 Выберите услугу.", reply_markup=services_kb())

@dispatcher.callback_query(F.data.startswith("svc:"))
async def req_service(q: CallbackQuery, state: FSMContext):
    svc = q.data[4:]
    await state.update_data(service=svc if svc in SERVICE_LABELS else "other", solution_id=None)
    await state.set_state(Req.description)
    await q.answer()
    text = f"🛠 <b>{escape(SERVICE_LABELS.get(svc, 'Другое'))}</b>\n📝 Что нужно сделать? Можно голосом."
    try:
        await q.message.edit_text(text)
    except TelegramBadRequest as exc:
        if "not modified" not in str(exc):
            await q.message.answer(text)

@dispatcher.message(F.chat.type == "private", F.text == CATALOG_BTN)
@dispatcher.message(F.chat.type == "private", Command("catalog"))
async def catalog(m: Message, state: FSMContext):
    if await blocked(m): return
    await state.clear()
    await m.answer(catalog_text(), reply_markup=catalog_kb(), disable_web_page_preview=True)

@dispatcher.callback_query(F.data.startswith("cat:"))
async def catalog_action(q: CallbackQuery, state: FSMContext):
    if not q.message or q.message.chat.type != "private":
        await q.answer(); return
    if touch_user(q.from_user)["blocked"]:
        await q.answer(); return
    action, _, sid = q.data[4:].partition(":")
    if action == "list":
        await q.answer()
        await show_screen(q, catalog_text(), catalog_kb())
        return
    if action == "custom":
        await q.answer()
        await state.clear(); await state.set_state(Req.service)
        await bot.send_message(q.from_user.id, "🛠 <b>Что нужно сделать?</b>\n👇 Выберите услугу.", reply_markup=services_kb())
        return
    x = SOLUTIONS.get(sid) if SOL_RE.fullmatch(sid or "") else None
    if not x:
        await q.answer("Это решение больше недоступно", show_alert=True)
        await show_screen(q, catalog_text(), catalog_kb())
        return
    if action == "item":
        await q.answer()
        await show_screen(q, item_text(x), item_kb(x))
        return
    if action != "want":
        await q.answer(); return
    if is_admin(q.from_user.id):
        await q.answer("Это ваш бот — заявки от владельца не создаются", show_alert=True); return
    origin = (await state.get_data()).get("entry_source", "bot")
    if not (origin.startswith("demo_") and origin[5:] in SOLUTIONS): origin = "bot"
    with db() as conn:
        dup = conn.execute("SELECT id FROM tickets WHERE user_id=? AND solution_id=? AND status!='closed' AND created_at>? ORDER BY id DESC LIMIT 1",
                           (q.from_user.id, x["id"], time.time() - 86400)).fetchone()
        tid = dup["id"] if dup else new_ticket(conn, q.from_user, x["project"], x["id"],
                                                f"Хочу готовое решение «{x['title']}» — {money(x['price'])} ₽ (из каталога бота, демо: {demo_url(x)})", time.time(), source=origin)
    await q.answer("Заявка уже у менеджера" if dup else "Заявка отправлена ✅")
    await state.clear()
    await state.update_data(ticket_id=tid, service=x["project"], solution_id=x["id"]); await state.set_state(Req.files)
    head = f"✅ <b>Заявка №{tid}</b> " + ("уже у менеджера" if dup else "передана менеджеру")
    await bot.send_message(q.from_user.id, head + f"\n{escape(x['title'])} · {money(x['price'])} ₽\n"
                           "📎 Добавьте детали или файлы → «✅ Готово».\n"
                           "Ответим в течение часа, 9:00–22:00 МСК.", reply_markup=FILES_KB)

@dispatcher.message(F.chat.type == "private", F.text == "💰 Цены")
async def prices(m: Message):
    if await blocked(m): return
    await m.answer(prices_text(), disable_web_page_preview=True)

@dispatcher.message(F.chat.type == "private", F.text == "📞 Контакты")
async def contacts(m: Message):
    if await blocked(m): return
    await m.answer(CONTACTS, disable_web_page_preview=True)

def client_tickets(uid, offset=0):
    with db() as conn:
        total = conn.execute("SELECT count(*) FROM tickets WHERE user_id=?", (uid,)).fetchone()[0]
        offset = min(max(0, offset), max(0, ((total - 1) // 3) * 3))
        rows = conn.execute("SELECT * FROM tickets WHERE user_id=? ORDER BY id DESC LIMIT 3 OFFSET ?", (uid, offset)).fetchall()
    if not rows:
        return "📂 <b>Заявок пока нет</b>\nНажмите «📝 Оставить заявку».", None
    text = f"📂 <b>Ваши заявки</b> · {offset + 1}–{offset + len(rows)} из {total}\n" + "\n".join(
        f"• №{r['id']} · {escape(SERVICE_LABELS.get(r['service'] or '', 'Другое'))} · {STATUS[r['status']]}" for r in rows)
    buttons = []
    if offset: buttons.append(InlineKeyboardButton(text="← Назад", callback_data=f"mine:{offset - 3}"))
    if offset + 3 < total: buttons.append(InlineKeyboardButton(text="Далее →", callback_data=f"mine:{offset + 3}"))
    return text, InlineKeyboardMarkup(inline_keyboard=[buttons]) if buttons else None

@dispatcher.message(F.chat.type == "private", F.text == "📂 Мои заявки")
async def my_tickets(m: Message):
    if await blocked(m): return
    text, kb = client_tickets(m.from_user.id)
    await m.answer(text, reply_markup=kb or menu_kb(m.from_user.id))

@dispatcher.callback_query(F.data.startswith("mine:"))
async def my_tickets_page(q: CallbackQuery):
    if not q.message or q.message.chat.type != "private" or touch_user(q.from_user)["blocked"]:
        await q.answer(); return
    try: offset = int(q.data[5:])
    except ValueError:
        await q.answer(); return
    await q.answer()
    text, kb = client_tickets(q.from_user.id, offset)
    await show_screen(q, text, kb)

@dispatcher.message(F.chat.type == "private", F.text == "💬 Написать менеджеру")
async def write_manager(m: Message, state: FSMContext):
    if await blocked(m): return
    await state.clear()
    await m.answer("💬 <b>Напишите вопрос</b>\nМожно текстом, голосом или файлом. Ответим здесь.", reply_markup=menu_kb(m.from_user.id))

@dispatcher.message(F.chat.type == "private", StateFilter(Req.service))
async def req_service_text(m: Message, state: FSMContext):
    await state.update_data(service="other", solution_id=None); await state.set_state(Req.description)
    await req_description(m, state)

@dispatcher.message(F.chat.type == "private", StateFilter(Req.description))
async def req_description(m: Message, state: FSMContext):
    if await blocked(m): return
    data = await state.get_data()
    with db() as conn:
        tid = new_ticket(conn, m.from_user, data.get("service") or "other", data.get("solution_id"), m.text or m.caption or "", m.date.timestamp(), source=data.get("entry_source", "bot"))
    if not m.text:
        relay_to_admin(m, tid)
    await state.update_data(ticket_id=tid); await state.set_state(Req.files)
    await m.answer(f"✅ <b>Заявка №{tid} принята</b>\n📎 Добавьте файлы или примеры, если есть.\nЗатем нажмите «✅ Готово».", reply_markup=FILES_KB)

@dispatcher.message(F.chat.type == "private", StateFilter(Req.files))
async def req_files(m: Message, state: FSMContext):
    data = await state.get_data()
    if m.text == "✅ Готово":
        await state.clear()
        await m.answer(f"✅ <b>Заявка №{data['ticket_id']} у менеджера</b>\nОтветим здесь в течение часа, 9:00–22:00 МСК.\nДополнения можно прислать сообщением.", reply_markup=menu_kb(m.from_user.id))
        return
    relay_to_admin(m, data["ticket_id"])
    if m.contact:
        with db() as conn:
            conn.execute("UPDATE tickets SET contact=? WHERE id=?", (m.contact.phone_number, data["ticket_id"]))

def _ai_lock(user_id):
    lock = AI_LOCKS.get(user_id)
    if lock is None:
        lock = asyncio.Lock()
        AI_LOCKS[user_id] = lock
    return lock

async def _ai_commit(m: Message, state: FSMContext, session, result):
    """Create one ticket per AI session after the decision is already made. Confirmation follows the commit."""
    contact = ai_manager.local_contact(m.from_user.username, m.from_user.id)
    reason = result.get("reason") or "ready"
    description = ai_manager.brief_text(result["fields"], result["history"], contact) + f"\nПричина: {reason}"
    with db() as conn:
        current = ai_manager.load_session(conn, m.from_user.id) or session
        tid = current.get("ticket_id")
        if not tid:
            tid = new_ticket(conn, m.from_user, result.get("service_id") or "other", result.get("solution_id"),
                             description, m.date.timestamp(), source="ai")
            if result.get("plan_html"):
                enqueue(conn, "admin", "text", None, {"html": result["plan_html"]}, time.time(), tid)
        saved = ai_manager.load_session(conn, m.from_user.id) or {}
        current.update(fields=result["fields"], history=result["history"], turns=result["turns"], ticket_id=tid,
                       updated_at=time.time(), day=saved.get("day") or current.get("day") or "",
                       day_count=saved.get("day_count") if saved else current.get("day_count") or 0,
                       last_at=saved.get("last_at") if saved else current.get("last_at") or 0)
        ai_manager.save_session(conn, m.from_user.id, current)
    await state.clear()
    await m.answer(f"✅ <b>Заявка №{tid} у Марка</b>\n{escape(result['reply'])}", reply_markup=ai_reply_kb(m.from_user.id, in_session=False))
    return tid

async def handle_ai_message(m: Message, state: FSMContext):
    if m.chat.type != "private" or not m.from_user:
        return
    if await blocked(m):
        return
    uid = m.from_user.id
    if m.text == ai_manager.AI_EXIT:
        await state.clear()
        await m.answer("Вышли из AI. Заявку этим шагом не отправлял.", reply_markup=ai_reply_kb(uid, in_session=False))
        return
    allowed = ai_manager.enabled_for(AI_MODE, is_admin(uid))
    if not allowed:
        await state.clear()
        await m.answer("Обсуждение с AI сейчас выключено.", reply_markup=ai_reply_kb(uid, in_session=False))
        return
    if m.text == ai_manager.AI_BTN or await state.get_state() != Ai.chat.state:
        if m.text != ai_manager.AI_BTN:
            return
        with db() as conn:
            session = ai_manager.begin_session(conn, uid)
        await state.set_state(Ai.chat)
        field = ai_manager.next_missing(session["fields"]) or "business"
        prefix = "Продолжаем предыдущий разговор.\n\n" if session["turns"] else "Задам один короткий вопрос за раз. Цену и сроки подтверждает Марк.\n\n"
        await m.answer(prefix + ai_manager.template_question(field), reply_markup=ai_reply_kb(uid, in_session=True))
        return
    if not m.text:
        await m.answer("Напишите текстом. Голос и файлы можно приложить в обычной заявке.", reply_markup=ai_reply_kb(uid, in_session=True))
        return
    async with _ai_lock(uid):
        now = time.time()
        with db() as conn:
            slot = ai_manager.consume_slot(conn, uid, now, AI_DAILY_CAP, AI_USER_INTERVAL, AI_USER_DAILY)
            session = ai_manager.load_session(conn, uid)
        if session is None:
            with db() as conn:
                session = ai_manager.begin_session(conn, uid)
        if slot == "slow":
            await m.answer("Напишите через пару секунд.", reply_markup=ai_reply_kb(uid, in_session=True))
            return
        if slot in {"user_cap", "global_cap"}:
            result = ai_manager.close_turn(fields=session["fields"], history=session["history"] + [{"role": "user", "content": m.text[:ai_manager.MAX_INPUT]}],
                                            turns=session["turns"], catalog=ai_catalog(), reason=slot, client_text=m.text)
            await _ai_commit(m, state, session, result)
            return
        if session.get("ticket_id"):
            await state.clear()
            await m.answer(f"Заявка №{session['ticket_id']} уже у Марка. Дополнения можно прислать обычным сообщением.", reply_markup=ai_reply_kb(uid, in_session=False))
            return

        async def complete(messages):
            return await ai_manager.chat_complete(messages, nvidia_keys=NVIDIA_KEYS, mistral_keys=MISTRAL_KEYS)

        result = await ai_manager.run_turn(client_text=m.text, fields=session["fields"], history=session["history"],
                                            turns=session["turns"], catalog=ai_catalog(), complete=complete)
        if result["handoff"]:
            await _ai_commit(m, state, session, result)
            return
        with db() as conn:
            saved = ai_manager.load_session(conn, uid) or session
            saved.update(fields=result["fields"], history=result["history"], turns=result["turns"], updated_at=time.time())
            ai_manager.save_session(conn, uid, saved)
        await m.answer(escape(result["reply"]), reply_markup=ai_reply_kb(uid, in_session=True))

@dispatcher.message(F.chat.type == "private", F.text.in_({ai_manager.AI_BTN, ai_manager.AI_EXIT}))
@dispatcher.message(F.chat.type == "private", StateFilter(Ai.chat))
async def ai_client_message(m: Message, state: FSMContext):
    if is_admin(m.from_user.id):
        return
    await handle_ai_message(m, state)

@dispatcher.message(F.chat.type == "private")
async def client_message(m: Message, state: FSMContext):
    user = touch_user(m.from_user)
    if user["blocked"]:
        return
    origin = (await state.get_data()).get("entry_source", "bot")
    with db() as conn:
        t = open_ticket(conn, m.from_user.id)
        tid = t["id"] if t else new_ticket(conn, m.from_user, "question", None, "", m.date.timestamp(), source=origin)
    relay_to_admin(m, tid)
    ack(m, "✉️ <b>Передал менеджеру</b>\nОтветим здесь в течение часа, 9:00–22:00 МСК.", force=not t)

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
        log.info("AI manager mode=%s nvidia_keys=%s mistral_keys=%s daily_cap=%s", AI_MODE, bool(NVIDIA_KEYS), bool(MISTRAL_KEYS), AI_DAILY_CAP)
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
