import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/data/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">Codwey</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Готовые сайты, Telegram-боты, приложения и Roblox-игры. И то же самое на заказ — со
            сметой в чате.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs tracking-wide text-subtle">Каталог</p>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link to="/catalog" search={{ cat: c.id }} className="text-muted hover:text-fg">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs tracking-wide text-subtle">Студия</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link to="/about" className="hover:text-fg">
                О Codwey
              </Link>
            </li>
            <li>
              <Link to="/order" className="hover:text-fg">
                На заказ
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-fg">
                Вопросы
              </Link>
            </li>
            <li>
              <a href="https://t.me/codwey" className="hover:text-fg">
                Telegram @codwey
              </a>
            </li>
            <li>codwey.su</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-subtle">
          Цифровые товары и услуги. Смета в чате не является публичной офертой до подтверждения.
        </p>
      </div>
    </footer>
  );
}
