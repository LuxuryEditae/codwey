"""Логин админа и список заявок. Пароль только в env."""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.ticket_model import Ticket

router = APIRouter()


def _secret() -> bytes:
    return (os.environ.get("ADMIN_SECRET") or "codwey-admin").encode()


def _check_user(username: str, password: str) -> bool:
    expect_user = os.environ.get("ADMIN_USER") or ""
    expect_pass = os.environ.get("ADMIN_PASSWORD") or ""
    return hmac.compare_digest(username.encode(), expect_user.encode()) and hmac.compare_digest(
        password.encode(), expect_pass.encode()
    )


def make_token(username: str) -> str:
    exp = int(time.time()) + 60 * 60 * 24 * 7
    payload = f"{username}:{exp}"
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def read_token(token: str) -> str:
    try:
        payload, sig = token.rsplit(".", 1)
        expect = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expect):
            raise ValueError("sig")
        username, exp_s = payload.split(":", 1)
        if int(exp_s) < time.time():
            raise ValueError("exp")
        return username
    except Exception as exc:
        raise HTTPException(401, "Нужен вход") from exc


def admin_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Нужен вход")
    return read_token(authorization.split(" ", 1)[1].strip())


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(data: LoginIn):
    if not _check_user(data.username, data.password):
        raise HTTPException(401, "Неверный логин или пароль")
    return {"ok": True, "token": make_token(data.username)}


@router.get("/tickets")
async def list_tickets(_: str = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ticket).order_by(Ticket.created_at.desc()))
    rows = result.scalars().all()
    out = []
    for t in rows:
        created = t.created_at.isoformat() if isinstance(t.created_at, datetime) else str(t.created_at)
        out.append(
            {
                "id": t.id,
                "category": t.category,
                "contact": t.contact,
                "description": t.description,
                "amount": t.amount,
                "timeline": t.timeline,
                "quote_json": t.quote_json,
                "conversation": t.conversation,
                "status": t.status,
                "source": t.source,
                "created_at": created,
            }
        )
    return out
