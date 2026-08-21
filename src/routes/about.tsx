import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="font-mono text-xs text-muted">студия</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Codwey</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
        <p>
          Codwey продаёт готовые цифровые продукты и делает небольшие заказы: сайты, Telegram-боты,
          веб-приложения, Roblox-плейсы и автоматизацию.
        </p>
        <p>
          Идея простая: рынок завышен. На Авито лендинг часто стоит как месяц аренды, а бот
          «магазина» продают за сумму, в которую у нас входит готовая сборка и ещё пара модулей.
        </p>
        <p>
          Менеджер Вей — ИИ в чате. Он отвечает на вопросы, доспрашивает, если бриф дырявый, и
          собирает смету по блокам. Живой контакт — Telegram @codwey.
        </p>
        <p>
          Домен codwey.su. Готовое отдаём исходниками. На заказ работаем по смете из чата, без
          скрытых часов.
        </p>
      </div>
      <Button asChild className="mt-8">
        <Link to="/chat">Написать Вей</Link>
      </Button>
    </main>
  );
}
