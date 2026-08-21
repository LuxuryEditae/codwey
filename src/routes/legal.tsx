import { createFileRoute, Link } from "@tanstack/react-router";
import { HOSTING_NOTE } from "@/lib/legal";

export const Route = createFileRoute("/legal")({ component: LegalPage });

function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="font-mono text-xs text-muted">документы</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        Персональные данные и условия
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Документ составлен по Федеральному закону Российской Федерации от 27.07.2006 № 152-ФЗ «О
        персональных данных».
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Кто обрабатывает</h2>
        <p className="text-sm leading-relaxed text-muted">
          Оператор — владелец сайта Codwey (домен codway.su). Связь: Telegram{" "}
          <a href="https://t.me/codwey" className="underline underline-offset-2">
            @codwey
          </a>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Какие данные</h2>
        <p className="text-sm leading-relaxed text-muted">
          Telegram, почта, текст заказа, состав корзины, сведения об оплате, которые вы сами
          оставляете на сайте или в чате с менеджером.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Зачем</h2>
        <p className="text-sm leading-relaxed text-muted">
          Чтобы принять заявку, посчитать смету, провести оплату и передать готовый продукт. Без
          вашего согласия через галочку заказ и покупка не оформляются.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Ваши права</h2>
        <p className="text-sm leading-relaxed text-muted">
          По 152-ФЗ вы можете запросить сведения об обработке, уточнить данные, отозвать согласие
          или потребовать удаление. Пишите в Telegram @codwey. Согласие можно отозвать в любой
          момент; уже начатый заказ при этом может быть остановлен.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Что мы делаем, а что нет</h2>
        <p className="text-sm leading-relaxed text-muted">{HOSTING_NOTE}</p>
        <p className="text-sm leading-relaxed text-muted">
          Мы отдаём исходники, инструкцию и помогаем запустить. Регистрация домена, оплата хостинга,
          VPS, SSL, аккаунты Telegram / Roblox / платёжных систем — ваша зона. Это условие покупки и
          заказа.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Оферта</h2>
        <p className="text-sm leading-relaxed text-muted">
          Смета в чате не является публичной офертой до вашего подтверждения. Оплата готового
          продукта — согласие с этими условиями.
        </p>
      </section>

      <p className="mt-10 text-sm text-muted">
        <Link to="/" className="underline underline-offset-2 hover:text-fg">
          На главную
        </Link>
      </p>
    </main>
  );
}
