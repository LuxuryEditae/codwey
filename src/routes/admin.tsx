import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QuoteFrame } from "@/components/quote-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_API } from "@/lib/ai/client";
import type { Quote } from "@/lib/ai/types";
import { formatRub } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Ticket = {
  id: string;
  number: number;
  category: string;
  contact: string;
  description: string;
  amount: number;
  timeline: string;
  quote_json: string;
  conversation: string;
  status: string;
  source: string;
  created_at: string;
};

const TOKEN_KEY = "codwey-admin-token";

function parseQuote(raw: string): Quote | null {
  if (!raw) return null;
  try {
    const q = JSON.parse(raw) as Quote;
    if (!q || !Array.isArray(q.items) || typeof q.total !== "number") return null;
    return q;
  } catch {
    return null;
  }
}

function AdminPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY) || "";
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string; detail?: string };
      if (!res.ok || !data.token) {
        setError(data.error || data.detail || "Неверный логин или пароль");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      await load(data.token);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  async function load(tok: string) {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/tickets`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
        return;
      }
      const data = (await res.json()) as Ticket[];
      const list = Array.isArray(data) ? data : [];
      setTickets(list);
      setOpenIds((prev) => {
        const next = { ...prev };
        for (const t of list) {
          if (next[t.id] === undefined) next[t.id] = t.status !== "closed";
        }
        return next;
      });
    } catch {
      setError("Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await fetch(`${ADMIN_API}/tickets/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      await load(token);
    } catch {
      setError("Не удалось обновить заявку");
    }
  }

  const active = useMemo(
    () => tickets.find((t) => t.id === activeId) ?? null,
    [tickets, activeId],
  );
  const quote = active ? parseQuote(active.quote_json) : null;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
        <p className="font-mono text-xs text-muted">Codwey</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Админ-панель</h1>
        <form className="mt-8 space-y-4" onSubmit={(e) => void login(e)}>
          <label className="block">
            <span className="mb-2 block text-sm text-muted">Логин</span>
            <Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-muted">Пароль</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            Войти
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-0 lg:grid-cols-[1.05fr_1fr]">
      <section className="border-b border-border p-4 lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted">история</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Заявки</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load(token)}>
              Обновить
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.removeItem(TOKEN_KEY);
                setToken("");
              }}
            >
              Выйти
            </Button>
          </div>
        </div>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {tickets.length === 0 && !loading ? (
            <li className="py-8 text-sm text-muted">Пока пусто.</li>
          ) : null}
          {tickets.map((t) => {
            const open = openIds[t.id] !== false;
            return (
              <li key={t.id} className={t.status === "closed" ? "opacity-50" : ""}>
                <div className="flex items-start gap-2 py-3">
                  <button
                    type="button"
                    className="mt-1 w-8 shrink-0 text-left font-mono text-xs text-muted"
                    onClick={() => setOpenIds((s) => ({ ...s, [t.id]: !open }))}
                  >
                    {open ? "−" : "+"} #{t.number || "—"}
                  </button>
                  {open ? (
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`min-w-0 flex-1 text-left ${activeId === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
                    >
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-sm bg-elevated px-2 py-0.5 text-xs text-fg">
                          {t.category || "без категории"}
                        </span>
                        <span className="font-medium text-fg">{t.contact || "контакт не указан"}</span>
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm">{t.description || "без описания"}</p>
                      <p className="mt-1 font-mono text-xs">
                        {t.amount ? formatRub(t.amount) : "сумма —"} · {t.status} ·{" "}
                        {t.created_at?.slice(0, 16).replace("T", " ")}
                      </p>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenIds((s) => ({ ...s, [t.id]: true }))}
                      className="flex-1 py-1 text-left text-sm text-muted"
                    >
                      #{t.number} · {t.contact || "без контакта"} · {t.status}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="p-4 lg:p-6">
        {active ? (
          <article>
            <p className="font-mono text-xs text-muted">
              Заказ №{active.number} · {active.source} · {active.status}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {active.category || "Заявка"}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {active.status !== "closed" ? (
                <Button variant="secondary" onClick={() => void setStatus(active.id, "closed")}>
                  Закрыть заявку
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => void setStatus(active.id, "new")}>
                  Вернуть в работу
                </Button>
              )}
              <Button variant="ghost" onClick={() => setActiveId(null)}>
                Свернуть
              </Button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-muted">Контакт</dt>
                <dd className="mt-1 text-base">{active.contact || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Категория</dt>
                <dd className="mt-1">{active.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Описание</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-relaxed">{active.description || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Срок</dt>
                <dd className="mt-1">{active.timeline || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Смета</dt>
                <dd>
                  {quote ? (
                    <QuoteFrame quote={quote} />
                  ) : active.amount ? (
                    <p className="mt-1">{formatRub(active.amount)}</p>
                  ) : (
                    <p className="mt-1 text-muted">ещё нет</p>
                  )}
                </dd>
              </div>
            </dl>
          </article>
        ) : (
          <p className="pt-10 text-sm text-muted">Выберите заявку слева.</p>
        )}
      </section>
    </main>
  );
}
