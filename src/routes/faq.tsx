import { createFileRoute, Link } from "@tanstack/react-router";

const FAQ = [
  {
    q: "Почему так дёшево?",
    a: "Готовое уже собрано. Кастом считаем модулями, не «ставкой студии». Нет офиса и нет наценки за бренд.",
  },
  {
    q: "Как купить готовое?",
    a: "В корзину, затем «оформить через Вей». В чате уточним Telegram и способ оплаты. После оплаты — исходники и инструкция.",
  },
  {
    q: "Как устроен заказ?",
    a: "Пишете задачу. Если не хватает деталей, Вей доспрашивает. Потом смета в рамке: блоки, сумма, срок. Согласовали — делаем.",
  },
  {
    q: "Можно ли править готовое?",
    a: "В цене — оговорённые правки (бренд, товары, тексты). Крупные новые модули — отдельной строкой сметы.",
  },
  {
    q: "Вы делаете приложения в сторы?",
    a: "Нет. Веб и PWA. Нативные iOS/Android не обещаем.",
  },
  {
    q: "Roblox — это готовый плейс?",
    a: "Да, файл плейса плюс инструкция публикации. Кастом — механики под вашу группу.",
  },
  {
    q: "Где хостинг?",
    a: "Сайты выкладываем на статический хостинг. Боты — инструкция на ваш сервер. Можем подсказать дешёвый VPS.",
  },
];

export const Route = createFileRoute("/faq")({ component: FaqPage });

function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Вопросы</h1>
      <dl className="mt-8 divide-y divide-border border-y border-border">
        {FAQ.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="font-display text-lg font-medium">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-sm text-muted">
        Остальное лучше спросить в{" "}
        <Link to="/chat" className="text-accent hover:underline">
          чате с Вей
        </Link>
        .
      </p>
    </main>
  );
}
