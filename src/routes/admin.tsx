import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_API } from "@/lib/ai/client";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Ticket = {
  id: string;
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

function AdminPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

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
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setError("Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

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
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-0 lg:grid-cols-[1.1fr_1fr]">
      <section className="border-b border-border p-4 lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted">заявки</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Входящие</h1>
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
            <li className="py-8 text-sm text-muted">Пока пусто — заявки появятся после «всё ок» в чате.</li>
          ) : null}
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActive(t)}
                className={`w-full px-0 py-4 text-left ${active?.id === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-sm bg-elevated px-2 py-0.5 text-xs text-fg">{t.category || "без категории"}</span>
                  <span className="font-medium text-fg">{t.contact || "контакт не указан"}</span>
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{t.description || "без описания"}</p>
                <p className="mt-1 font-mono text-xs">
                  {t.amount ? `${t.amount} ₽` : "сумма —"} · {t.status} · {t.created_at?.slice(0, 16).replace("T", " ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="p-4 lg:p-6">
        {active ? (
          <article>
            <p className="font-mono text-xs text-muted">{active.source}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{active.category || "Заявка"}</h2>
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
                <dt className="text-muted">Сумма / срок</dt>
                <dd className="mt-1">
                  {active.amount ? `${active.amount} ₽` : "не сошлись"} · {active.timeline || "срок —"}
                </dd>
              </div>
              {active.quote_json ? (
                <div>
                  <dt className="text-muted">Смета</dt>
                  <dd className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed">{active.quote_json}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">Переписка</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">
                  {active.conversation || "—"}
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
