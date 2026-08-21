import { createFileRoute, Link } from "@tanstack/react-router";

const FAQ = [
  {
    q: "Почему так дёшево?",
    a: "Готовое уже собрано. Кастом считаем модулями, не «ставкой студии». Нет офиса и нет наценки за бренд.",
  },
  {
    q: "Как купить готовое?",
    a: "В корзину, затем «Оплатить». Нужна галочка согласия на обработку персональных данных. После оплаты — исходники и инструкция. Хостинг лежит на вас.",
  },
  {
    q: "Как устроен заказ?",
    a: "Пишете задачу и ставите галочку 152-ФЗ. Если не хватает деталей, менеджер доспрашивает. Потом смета в рамке. Хостинг, домен и сервер — на вас.",
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
    a: "Мы делаем только сайт, бота, приложение или игру. Хостинг, домен, сервер, SSL, токены — лежит на вас. Отдаём исходники и инструкцию, как залить.",
  },
  {
    q: "Зачем галочка про персональные данные?",
    a: "По закону РФ 152-ФЗ без вашего согласия мы не можем принять Telegram, почту и текст заказа. Страница с правилами — в подвале сайта.",
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
