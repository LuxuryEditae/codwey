// CodWay static site generator: zero dependencies, outputs ../dist
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../dist");
const P = JSON.parse(fs.readFileSync(path.join(here, "data/pricing.json"), "utf8"));
const S = JSON.parse(fs.readFileSync(path.join(here, "data/solutions.json"), "utf8"));
const SITE = "https://codway.su";
const C = { tg: "mexciti", email: "coddweyy@gmail.com", bot: "codwey_bot" };
const BUILD = new Date().toISOString().slice(0, 10);
// Brand: the ONLY logo source. site/brand/logo.svg (currentColor strokes) → header, footer, demos, chat avatar;
// site/brand/favicon.svg → /favicon.svg; PNG icons live in site/static; og.png is rendered by site/tools/make-og.sh from logo.svg.
const LOGO_SVG = fs.readFileSync(path.join(here, "brand/logo.svg"), "utf8").trim();
const logo = (cls = "logo") => `<a class="${cls}" href="/" aria-label="CodWay — на главную"><span class="logo-mark" aria-hidden="true">${LOGO_SVG.replace(/ role="img" aria-label="[^"]*"/, "")}</span>CodWay</a>`;
const rub = (v) => new Intl.NumberFormat("ru-RU").format(v).replace(/\u00a0/g, " ") + " ₽";
const proj = Object.fromEntries(P.projects.map((p) => [p.id, p]));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const NAV = [
  ["/telegram-bot-na-zakaz", "Боты"], ["/telegram-mini-app-na-zakaz", "Mini Apps"],
  ["/sajt-na-zakaz", "Сайты"], ["/parser-na-zakaz", "Парсеры"], ["/ceny", "Цены"], ["/kontakty", "Контакты"],
];
const botLink = (start = "") => `https://t.me/${C.bot}${start ? "?start=" + start : ""}`;
const tgIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.8 13 2.2 11.6c-1-.3-1-1 .2-1.5L20.5 3c.8-.3 1.6.2 1.4 1.3z"/></svg>`;

// ---------- mockups (hero visuals): faithful Telegram iOS UI ----------
const I = {
  chev: `<svg viewBox="0 0 12 20" width="11" height="19"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clip: `<svg viewBox="0 0 24 24" width="25" height="25"><path d="M20.5 11.2 12.3 19.4a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 4.9 4.9l-8.5 8.5a1.7 1.7 0 0 1-2.5-2.5l7.9-7.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" width="25" height="25"><rect x="8.6" y="2.8" width="6.8" height="11.6" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.3 11a6.7 6.7 0 0 0 13.4 0M12 17.8v3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  kbd: `<svg viewBox="0 0 24 24" width="22" height="22"><rect x="2.5" y="6" width="19" height="12" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 9.6h1M9.5 9.6h1M13 9.6h1M16.5 9.6h1.4M6 12.4h1M9.5 12.4h1M13 12.4h1M16.5 12.4h1.4M8 15h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  checks: `<svg class="ck" viewBox="0 0 19 11" width="17" height="10"><path d="M1.2 5.8 4.6 9.2 11.6 1.6M7.4 9.2 14.4 1.6" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  link: `<svg class="ar" viewBox="0 0 10 10" width="8" height="8"><path d="M2.5 1.5h6v6M8.5 1.5 1.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  sb: `<span class="sb-ic"><svg viewBox="0 0 18 12" width="17" height="11"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg><svg viewBox="0 0 16 12" width="15" height="11"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.6 7a6.2 6.2 0 0 1 8.8 0l-1.3 1.3a4.4 4.4 0 0 0-6.2 0zM1.4 4.8a9.3 9.3 0 0 1 13.2 0l-1.3 1.3a7.5 7.5 0 0 0-10.6 0z" fill="currentColor"/></svg><svg viewBox="0 0 27 13" width="25" height="12"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2.4" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45"/></svg></span>`,
};
const device = (screen, cls = "", theme = "dark") => `<div class="device ${cls}" aria-hidden="true"><div class="device-screen ${theme}"><div class="sb"><span>9:41</span><i class="island"></i>${I.sb}</div>${screen}<i class="home-ind"></i></div></div>`;
// lines: ["in"|"out", html, time, inlineKeyboardRows?] or ["date", text]
function chat({ name = "CodWay", ava = `<span class="ava-mark">${LOGO_SVG}</span>`, lines, reply }) {
  let d = 0;
  const body = lines.map(([who, t, time, kb]) => {
    d += 1;
    if (who === "date") return `<div class="tg-svc" style="--d:${d}">${t}</div>`;
    const meta = `<span class="tg-meta">${time}${who === "out" ? I.checks : ""}</span>`;
    const keys = kb ? `<div class="tg-ikb">${kb.map((row) => `<div>${row.map((b) => `<span>${b.replace(/\^$/, "")}${b.endsWith("^") ? I.link : ""}</span>`).join("")}</div>`).join("")}</div>` : "";
    const tail = kb ? "" : `<svg class="tail" viewBox="0 0 11 17" width="11" height="17"><path d="M11 0v17H0c5.5-1 9.6-5.4 11-11z" fill="currentColor"/></svg>`;
    return `<div class="tg-m ${who}" style="--d:${d}"><div class="tg-b">${t}${meta}${tail}</div>${keys}</div>`;
  }).join("");
  const rk = reply ? `<div class="tg-rk">${reply.map((row) => `<div>${row.map((b) => `<span>${b}</span>`).join("")}</div>`).join("")}</div>` : "";
  return device(`<div class="tg"><div class="tg-head"><span class="tg-back">${I.chev}Чаты</span><div class="tg-title"><b>${name}</b><small>бот</small></div><span class="tg-ava">${ava}</span></div><div class="tg-wall"><div class="tg-list">${body}</div></div><div class="tg-bottom"><div class="tg-input"><span class="ic">${I.clip}</span><div class="tg-field"><span>Сообщение</span><span class="ic sm">${I.kbd}</span></div><span class="ic">${I.mic}</span></div>${rk}</div></div>`, "phone-chat");
}
function miniApp({ title, items, cats, main }) {
  return device(`<div class="ma"><div class="ma-head"><span class="ma-close">Закрыть</span><div class="ma-title"><b>${title}</b><small>мини-приложение</small></div><span class="ma-more"><i></i><i></i><i></i></span></div><div class="ma-body"><div class="ma-search"><svg viewBox="0 0 16 16" width="13" height="13"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3.6 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Поиск</div><div class="ma-cats">${cats.map((c, i) => `<span${i ? "" : ' class="on"'}>${c}</span>`).join("")}</div><div class="ma-grid">${items.map(([e, n, p, q]) => `<div class="ma-item"><div class="ma-pic"><img src="/img/${e}.webp" alt="" width="180" height="124" decoding="async">${q ? `<b class="ma-q">${q}</b>` : ""}</div><span>${n}</span><small>${p}</small><em${q ? ' class="in"' : ""}>${q ? "−&nbsp;&nbsp;" + q + "&nbsp;&nbsp;+" : "Добавить"}</em></div>`).join("")}</div></div><div class="ma-main">${main}</div></div>`, "phone-app", "dark");
}
// Demo sites shown in the /sajt-na-zakaz hero: real clickable cards (no fake browser UI)
const DEMO_SITES = [
  { id: "cafe", name: "«Очаг»", kind: "Ресторан и кафе", line: "Меню с вкладками, бронь стола и банкеты", img: "hero" },
  { id: "beauty", name: "Lumière", kind: "Салон красоты", line: "Прайс, мастера и онлайн-запись в 4 шага", img: "hero" },
  { id: "remont", name: "«Квадрат»", kind: "Ремонт квартир", line: "Калькулятор сметы и портфолио с фильтром", img: "hero" },
];
const MOCK = {
  home: () => `<div class="stage stage-duo"><div class="glow" aria-hidden="true"></div>${miniApp({
    title: "Зерно", cats: ["Кофе", "Выпечка", "Десерты"],
    items: [["cappuccino", "Капучино 0,3", "220 ₽", 1], ["croissant", "Круассан", "180 ₽", 0], ["raf", "Раф лавандовый", "290 ₽", 1], ["cheesecake", "Чизкейк", "260 ₽", 0]],
    main: "Заказать к 9:30 · 510 ₽" })}${chat({
    lines: [
      ["date", "Сегодня"],
      ["out", "/start", "14:20"],
      ["in", "Привет! 👋 Я бот <b>CodWay</b>.<br>Что будем делать?", "14:20", [["🤖 Бот", "📱 Mini App"], ["🌐 Сайт", "📊 Парсер"]]],
      ["out", "Бот для записи в барбершоп: 3 мастера, предоплата через СБП", "14:21"],
      ["in", "Заявка <b>#128</b> принята ✅<br>Ориентир: <b>от 12 800 ₽</b>, 3–7 дней. Менеджер ответит здесь в течение часа.", "14:21"],
    ],
    reply: [["📝 Оставить заявку", "💬 Написать менеджеру"], ["💰 Цены", "📂 Мои заявки"]],
  })}</div>`,
  bot: () => `<div class="stage">${chat({ name: "Barber Club", ava: "BC",
    lines: [
      ["in", "Выберите услугу 👇", "11:02", [["Стрижка · 1 200 ₽"], ["Борода · 700 ₽", "Комплекс · 1 700 ₽"]]],
      ["out", "Комплекс", "11:02"],
      ["in", "Свободно завтра: <b>11:00 · 14:30 · 18:00</b>", "11:02"],
      ["out", "18:00", "11:03"],
      ["in", "Записал вас на завтра, 18:00 ✅<br>Напомню за 2 часа.", "11:03", [["Оплатить предоплату^"]]],
    ],
    reply: [["📅 Записаться", "💈 Услуги"], ["📍 Как добраться", "👤 Мои записи"]],
  })}</div>`,
  miniapp: () => `<div class="stage">${miniApp({
    title: "Shop", cats: ["Все", "Одежда", "Аксессуары"],
    items: [["tee", "Футболка", "1 990 ₽", 1], ["cap", "Кепка", "1 290 ₽", 0], ["hoodie", "Худи", "3 490 ₽", 1], ["tote", "Шоппер", "890 ₽", 0]],
    main: "Корзина · 2 товара · 5 480 ₽" })}</div>`,
  site: () => `<div class="stage"><div class="dsl"><p class="dsl-k">Демо-сайты — откройте и полистайте</p>${DEMO_SITES.map((d) => `<a class="dcard" href="/demo/${d.id}/" target="_blank" rel="noopener"><span class="dcard-pic"><img src="/demo/${d.id}/img/${d.img}.webp" alt="" width="240" height="180" decoding="async"></span><span class="dcard-tx"><small>${d.kind}</small><b>${d.name}</b><span>${d.line}</span></span><span class="dcard-go">Открыть демо<i aria-hidden="true">→</i></span></a>`).join("")}</div></div>`,
  script: () => `<div class="stage"><div class="term" aria-hidden="true"><div class="b-bar"><i></i><i></i><i></i><span>parser.py</span></div><pre>$ python parser.py --source wb --query "кроссовки"
<span class="ok">✓</span> страниц обработано: 42
<span class="ok">✓</span> товаров собрано: 1 286
<span class="ok">✓</span> цены изменились: 37
→ выгрузка в Google Таблицу… готово
→ отчёт отправлен в Telegram 📬</pre></div></div>`,
};

// ---------- blocks ----------
const head = (pg) => {
  const url = SITE + (pg.path === "/" ? "/" : pg.path);
  const org = { "@context": "https://schema.org", "@type": "Organization", "@id": SITE + "/#org", name: "CodWay", url: SITE + "/", logo: SITE + "/icon-512.png", email: C.email,
    sameAs: [`https://t.me/${C.tg}`, botLink()], contactPoint: [{ "@type": "ContactPoint", email: C.email, url: botLink(), contactType: "sales", areaServed: "RU", availableLanguage: ["ru", "en"] }] };
  const ld = [org];
  if (pg.service) ld.push({ "@context": "https://schema.org", "@type": "Service", name: pg.service.name, serviceType: pg.service.name, provider: { "@id": SITE + "/#org" }, areaServed: "RU", url,
    offers: { "@type": "Offer", priceCurrency: "RUB", price: pg.service.price, url } });
  if (pg.faq?.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: pg.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
  if (pg.path !== "/") ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Главная", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: pg.crumb, item: url }] });
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(pg.title)}</title><meta name="description" content="${esc(pg.desc)}"><link rel="canonical" href="${url}"><meta name="theme-color" content="#0a0a0a"><meta property="og:type" content="website"><meta property="og:site_name" content="CodWay"><meta property="og:locale" content="ru_RU"><meta property="og:title" content="${esc(pg.title)}"><meta property="og:description" content="${esc(pg.desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="/assets/style.css?v=${BUILD}">${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("")}</head><body>`;
};
const header = (active) => `<header class="top"><div class="wrap top-in">${logo()}<nav class="nav" id="nav">${NAV.map(([h, t]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="nav-tg" href="${botLink("site")}" target="_blank" rel="noopener">Написать в бот</a></nav><a class="btn btn-tg sm hide-m" href="${botLink("site")}" target="_blank" rel="noopener">${tgIcon}Написать в бот</a><button class="burger" aria-label="Меню" aria-controls="nav" aria-expanded="false"><span></span><span></span></button></div></header><main>`;
const footer = () => `</main><footer class="foot"><div class="wrap foot-in"><div>${logo()}<p>Небольшая студия разработки. Telegram-боты, Mini Apps, сайты и парсеры для малого бизнеса и экспертов.</p></div><div><h3>Услуги</h3>${NAV.slice(0, 4).map(([h, t]) => `<a href="${h}">${t} на заказ</a>`).join("")}<a href="/ceny">Цены</a></div><div><h3>Связь</h3><a href="https://t.me/${C.tg}" target="_blank" rel="noopener">Telegram @${C.tg}</a><a href="mailto:${C.email}">${C.email}</a><a href="${botLink("site")}" target="_blank" rel="noopener">Бот @${C.bot}</a></div></div><div class="wrap foot-bottom">© ${new Date().getFullYear()} CodWay · codway.su · Отвечаем ежедневно с 9:00 до 22:00 (МСК)</div></footer><div class="mbar"><a class="btn btn-tg" href="${botLink("site")}" target="_blank" rel="noopener">${tgIcon}В бот</a><a class="btn btn-ghost" href="#zayavka">Заявка</a></div><script src="/assets/app.js?v=${BUILD}" defer></script></body></html>`;

const hero = (pg) => `<section class="hero"><div class="wrap hero-in"><div class="hero-txt">${pg.path !== "/" ? `<nav class="crumbs" aria-label="Хлебные крошки"><a href="/">Главная</a> / <span>${pg.crumb}</span></nav>` : ""}<p class="kicker">${pg.kicker}</p><h1>${pg.h1.replace(/(\d) (\d)/g, "$1&nbsp;$2").replace(/ ₽/g, "&nbsp;₽")}</h1><p class="lead">${pg.lead}</p><div class="cta"><a class="btn btn-acc" href="#zayavka">Рассчитать и оставить заявку</a><a class="btn btn-tg" href="${botLink(pg.start || "site")}" target="_blank" rel="noopener">${tgIcon}Написать в бот</a></div><ul class="facts"><li><b>50/50</b>оплата: половина до старта</li><li><b>30 дней</b>бесплатных правок</li><li><b>Код ваш</b>передаём исходники</li></ul></div><div class="hero-vis">${MOCK[pg.mock]()}</div></div></section>`;

const services = () => `<section class="sec"><div class="wrap"><h2 class="h2">Что делаем</h2><div class="svc">${[
  ["/telegram-bot-na-zakaz", "bot", "Telegram-боты", "Запись, приём заявок, оплата, магазины, рассылки, поддержка с AI."],
  ["/telegram-mini-app-na-zakaz", "miniapp", "Telegram Mini Apps", "Полноценное приложение внутри Telegram: каталог, корзина, личный кабинет."],
  ["/sajt-na-zakaz", "site", "Сайты и лендинги", "Быстрые сайты на коде, которые видят Яндекс и Google, с заявками в Telegram."],
  ["/parser-na-zakaz", "script", "Парсеры и скрипты", "Сбор цен и товаров, выгрузка в таблицы, автоматизация рутины."],
].map(([h, id, t, d], i) => `<a class="svc-card" href="${h}"><span class="num">0${i + 1}</span><h3>${t}</h3><p>${d}</p><span class="price">от ${rub(proj[id].min)} · ${proj[id].daysMin}–${proj[id].daysMax} дн.</span><span class="arrow">→</span></a>`).join("")}</div></div></section>`;

const compare = () => `<section class="sec"><div class="wrap cmp"><div><h2 class="h2">Почему у нас дешевле</h2><p class="muted">У студий похожий бот стоит <b>от 50 000 ₽</b>: в цену заложены офис, отдел продаж и менеджер-посредник. У нас этого нет — вы общаетесь напрямую с разработчиком, а платите только за работу.</p></div><div class="cmp-tbl"><div class="row h"><span></span><span>Обычная студия</span><span>CodWay</span></div><div class="row"><span>Бот записи</span><span>от 50 000 ₽</span><b>от 7 900 ₽</b></div><div class="row"><span>Mini App магазин</span><span>от 120 000 ₽</span><b>от 24 900 ₽</b></div><div class="row"><span>Лендинг</span><span>от 40 000 ₽</span><b>от 9 900 ₽</b></div><div class="row"><span>Многостраничный сайт</span><span>от 80 000 ₽</span><b>от 19 900 ₽</b></div><div class="row"><span>Парсер</span><span>от 15 000 ₽</span><b>от 2 900 ₽</b></div><div class="row"><span>Связь</span><span>через менеджера</span><b>напрямую</b></div></div></div></section>`;

const steps = () => `<section class="sec"><div class="wrap"><h2 class="h2">Как работаем</h2><ol class="steps"><li><b>Заявка</b>Пишете в бот или через форму — можно голосом, скриншотами, файлами.</li><li><b>Смета за час</b>Уточняем детали, фиксируем цену и срок. Без «а ещё вот это за отдельные деньги».</li><li><b>Разработка</b>Предоплата 50%. Показываем промежуточный результат каждые 1–2 дня.</li><li><b>Запуск</b>Оплата остатка после приёмки. Передаём код и доступы, 30 дней правок бесплатно.</li></ol></div></section>`;

const solutions = (only) => `<section class="sec" id="${only ? "demo-sajty" : "gotovye"}"><div class="wrap"><h2 class="h2">${only ? "Демо-сайты: посмотрите, каким будет ваш" : "Готовые решения"}</h2><p class="muted">${only ? "Три полностью рабочих сайта для разных ниш — со своим дизайном, меню, калькулятором и онлайн-записью. Возьмём любой за основу и адаптируем под ваш бизнес." : "Уже собранная основа — подстраиваем под ваш бизнес за 1–3 дня."}</p><div class="sol">${S.filter((s) => !only || s.project === only).map((s) => `<article class="sol-card"><span class="tag">${s.tag}</span><h3>${s.title}</h3><p>${s.description}</p><ul>${s.features.map((f) => `<li>${f}</li>`).join("")}</ul><a class="sol-demo" href="/demo/${s.id}/"${s.project === "site" ? ' target="_blank" rel="noopener"' : ""}><span class="sol-play" aria-hidden="true">${s.project === "site" ? '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1.5" y="2.5" width="13" height="11" rx="2"/><path d="M1.5 6h13"/></svg>' : '<svg viewBox="0 0 16 16" width="10" height="10"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>'}</span>${s.project === "site" ? "Открыть демо-сайт" : "Попробовать демо"}<i aria-hidden="true">→</i></a><div class="sol-f"><b>${rub(s.price)}</b><div><button class="btn btn-acc sm" data-solution="${s.id}">Хочу такой</button><a class="btn btn-ghost sm" href="${botLink("demo_" + s.id)}" target="_blank" rel="noopener">В бот</a></div></div></article>`).join("")}</div></div></section>`;

const priceTable = () => `<section class="sec"><div class="wrap"><h2 class="h2">Цены</h2><div class="ptbl">${(P.tiers || P.projects).map((p) => `<div class="prow"><span>${p.label}${p.note ? ` <small>${p.note}</small>` : ""}</span><b>от ${rub(p.min)}</b><small>${p.days || (p.id === "system" ? "3–5 недель" : `${p.daysMin}–${p.daysMax} дней`)}</small></div>`).join("")}</div><h3 class="h3">Дополнительно</h3><div class="ptbl">${P.features.map((f) => `<div class="prow"><span>${f.label} <small>${f.detail}</small></span><b>${f.id === "ai" ? "от " : ""}${rub(f.min)}</b><small>+${f.daysMin}–${f.daysMax} дн.</small></div>`).join("")}</div><p class="muted note">Цена фиксируется в смете до начала работы. Оплата 50/50, 30 дней бесплатных правок, исходный код и доступы — ваши.</p></div></section>`;

const form = (pg) => `<section class="sec form-sec" id="zayavka"><div class="wrap form-grid"><div><h2 class="h2">Рассчитать стоимость</h2><p class="muted">Отметьте, что нужно — цена посчитается сразу. Заявка придёт разработчику в Telegram, ответим в течение часа (9:00–22:00 МСК).</p><div class="alt"><a class="btn btn-tg" href="${botLink(pg.start || "site")}" target="_blank" rel="noopener">${tgIcon}Удобнее в боте — с фото и голосовыми</a><p class="contacts-line"><a href="${botLink(pg.start || "site")}" target="_blank" rel="noopener">@${C.bot}</a> · <a href="https://t.me/${C.tg}" target="_blank" rel="noopener">@${C.tg}</a> · <a href="mailto:${C.email}">${C.email}</a></p></div></div><form class="calc" id="order-form" data-project="${pg.project || "bot"}" novalidate><fieldset><legend>Что делаем</legend><div class="chips">${P.projects.map((p) => `<label class="chip"><input type="radio" name="project" value="${p.id}"${p.id === (pg.project || "bot") ? " checked" : ""}><span>${p.label}</span></label>`).join("")}</div></fieldset><div class="sol-picked" hidden><span></span><button type="button" class="x" aria-label="Убрать готовое решение">×</button></div><fieldset class="feat"><legend>Дополнительно</legend><div class="chips">${P.features.map((f) => `<label class="chip"><input type="checkbox" name="features" value="${f.id}"><span>${f.label} <small>+${rub(f.min)}</small></span></label>`).join("")}</div></fieldset><div class="total" aria-live="polite"><small>Ориентир</small><b id="total-price">—</b><span id="total-days"></span></div><label class="fld">Опишите задачу<textarea name="description" rows="4" minlength="10" maxlength="3000" required placeholder="Например: бот для записи в салон, 3 мастера, нужна предоплата"></textarea></label><label class="fld">Telegram или телефон<input name="contact" required maxlength="40" autocomplete="tel" placeholder="@ваш_ник или +7 …"></label><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="consent"><input type="checkbox" name="consent" required> Согласен на обработку контактных данных для ответа на заявку</label><button class="btn btn-acc wide" type="submit">Отправить заявку</button><p class="form-msg" role="status"></p></form></div></section>`;

const faqBlock = (faq) => `<section class="sec"><div class="wrap narrow"><h2 class="h2">Вопросы и ответы</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></div></section>`;
const textBlock = (title, items) => `<section class="sec"><div class="wrap"><h2 class="h2">${title}</h2><div class="feat-grid">${items.map(([t, d]) => `<div class="fcard"><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></div></section>`;

const commonFaq = [
  ["Как проходит оплата?", "50% предоплата перед стартом и 50% после того, как вы приняли работу. Цена фиксируется в смете заранее."],
  ["Что будет, если после сдачи найдётся ошибка?", "30 дней после запуска исправляем ошибки и вносим небольшие правки бесплатно."],
  ["Передаёте ли исходный код?", "Да. Исходный код, доступы к серверу и боту остаются у вас — вы не привязаны к нам."],
];

// ---------- pages ----------
const pages = [
  { path: "/", file: "index.html", mock: "home", crumb: "Главная",
    title: "CodWay — Telegram-боты, Mini Apps, сайты и парсеры на заказ",
    desc: "Небольшая студия разработки: Telegram-боты от 4 900 ₽, Mini Apps от 14 900 ₽, сайты от 9 900 ₽, парсеры от 2 900 ₽. Оплата 50/50, 30 дней правок, код ваш.",
    kicker: "Студия разработки CodWay", h1: "Боты, Mini Apps и сайты, <em>которые приносят заявки</em>",
    lead: "Пишете напрямую разработчику, получаете понятную смету за час и работающий продукт через несколько дней. Без менеджеров, шаблонов и цен «как у агентства».",
    blocks: () => [services(), compare(), solutions(), steps()],
    faq: [["Сколько стоит Telegram-бот?", "Простой бот с меню и заявками — от 4 900 ₽ за 1–2 дня, бот под ключ — от 8 900 ₽. С оплатой и админкой обычно выходит 12–20 тысяч. Точную цену назовём после короткого разговора."], ...commonFaq, ["Как быстро вы отвечаете?", "Ежедневно с 9:00 до 22:00 по Москве, обычно в течение часа. Быстрее всего — через бота @codwey_bot."]] },
  { path: "/telegram-bot-na-zakaz", mock: "bot", project: "bot", start: "svc_bot", crumb: "Telegram-бот на заказ",
    service: { name: "Разработка Telegram-бота на заказ", price: 4900 },
    title: "Telegram-бот на заказ от 4 900 ₽ — разработка за 1–7 дней | CodWay",
    desc: "Разработка Telegram-ботов под ключ: запись клиентов, приём заявок и оплаты, магазины, рассылки, AI-ассистенты. Простой бот от 4 900 ₽ за 1–2 дня, бот под ключ от 8 900 ₽ за 3–7 дней. 30 дней бесплатных правок.",
    kicker: "Telegram-боты", h1: "Telegram-бот на заказ — <em>от 4 900 ₽ за 1–7 дней</em>",
    lead: "Бот, который сам записывает клиентов, принимает заявки и оплату, отвечает на частые вопросы и присылает вам уведомления. Пишем на Python (aiogram), запускаем на сервере и передаём код.",
    blocks: () => [textBlock("Что может ваш бот", [["Запись и бронирование", "Свободные слоты, напоминания, перенос и отмена без звонков."], ["Приём заявок", "Анкета по шагам, фото и файлы, всё приходит вам в Telegram или в таблицу."], ["Оплата", "ЮKassa, СБП, Telegram Stars — чек и статус заказа автоматически."], ["Магазин и каталог", "Товары с фото, корзина, доставка или самовывоз."], ["Рассылки", "Акции и новости по всей базе или по сегментам."], ["AI-ассистент", "Отвечает по вашим материалам и передаёт сложные вопросы человеку."]]), solutions(), steps()],
    faq: [["Сколько стоит бот?", "Простой бот с меню и приёмом заявок — от 4 900 ₽ за 1–2 дня. Бот под ключ (запись, каталог, рассылки) — от 8 900 ₽. С оплатой, админ-панелью и рассылками обычно 12–20 тысяч. Калькулятор ниже покажет ориентир."], ["Где будет работать бот?", "На вашем сервере или на нашем. Хостинг стоит от 300 ₽ в месяц, поможем всё настроить."], ["Смогу сам менять тексты и цены?", "Да, если добавить админ-панель: меняете тексты, услуги и цены прямо в Telegram."], ...commonFaq] },
  { path: "/telegram-mini-app-na-zakaz", mock: "miniapp", project: "miniapp", start: "svc_miniapp", crumb: "Telegram Mini App на заказ",
    service: { name: "Разработка Telegram Mini App на заказ", price: 14900 },
    title: "Telegram Mini App на заказ от 14 900 ₽ — приложение в Telegram | CodWay",
    desc: "Разработка Telegram Mini Apps (WebApp): магазины, доставка, запись, каталоги и личные кабинеты внутри Telegram. Витрина от 14 900 ₽, магазин от 24 900 ₽, срок 5–14 дней, оплата 50/50.",
    kicker: "Telegram Mini Apps", h1: "Telegram Mini App на заказ — <em>приложение без App Store</em>",
    lead: "Каталог, корзина, оплата и личный кабинет открываются прямо в Telegram за секунду. Клиенту не нужно ничего скачивать, а вам — платить за разработку двух мобильных приложений.",
    blocks: () => [textBlock("Что делаем на Mini Apps", [["Интернет-магазин", "Каталог с фильтрами, варианты товара, корзина и оплата."], ["Доставка и кофейни", "Меню с модификаторами, заказ ко времени, уведомления кухне."], ["Запись и услуги", "Выбор мастера и времени в удобном интерфейсе."], ["Личный кабинет", "История заказов, бонусы, программа лояльности."], ["Оплата внутри", "ЮKassa, СБП, Telegram Stars — без перехода на сайт."], ["Админка", "Заказы и товары управляются из бота или веб-панели."]]), solutions(), steps()],
    faq: [["Чем Mini App отличается от бота?", "Бот общается кнопками и сообщениями, а Mini App — это полноценный интерфейс как у приложения: карточки, фильтры, корзина. Часто их делают вместе."], ["Нужен ли отдельный сервер?", "Да, для Mini App нужен хостинг и домен. Поможем выбрать и настроим, обычно это 300–600 ₽ в месяц."], ["Сколько занимает разработка?", "Витрина или меню — 5–7 дней, типовой магазин или кофейня — 7–14 дней. Сложные системы — от 3 недель."], ...commonFaq] },
  { path: "/sajt-na-zakaz", mock: "site", project: "site", start: "svc_site", crumb: "Сайт на заказ",
    service: { name: "Разработка сайта на заказ", price: 9900 },
    title: "Сайт на заказ от 9 900 ₽ — лендинг за 3–5 дней, многостраничный от 19 900 ₽ | CodWay",
    desc: "Разработка лендингов и сайтов услуг на коде: быстрые, адаптивные, с SEO-базой и заявками прямо в Telegram. Лендинг от 9 900 ₽ за 3–5 дней, многостраничный сайт от 19 900 ₽ за 7–10 дней.",
    kicker: "Сайты и лендинги", h1: "Сайт на заказ — <em>от 9 900 ₽ за 3–10 дней</em>",
    lead: "Лендинг или сайт услуг на чистом коде: открывается мгновенно, хорошо выглядит на телефоне и с первого дня готов к продвижению в Яндексе и Google. Заявки — сразу вам в Telegram.",
    blocks: () => [textBlock("Что входит", [["Уникальный дизайн", "Под ваш бренд, а не шаблон из конструктора."], ["SEO-база", "Отдельные страницы под услуги, мета-теги, разметка, sitemap, подключение Вебмастера."], ["Скорость", "Статические страницы — 90+ баллов в PageSpeed."], ["Заявки в Telegram", "Форма отправляет заявку в бот — ни одна не потеряется."], ["Адаптив", "Сначала делаем мобильную версию — оттуда большая часть трафика."], ["Хостинг и домен", "Поможем купить домен и опубликовать сайт."]]), solutions("site"), steps()],
    faq: [["Лендинг или многостраничный сайт?", "Лендинг (от 9 900 ₽, 3–5 дней) — одна страница под одну услугу или рекламу. Многостраничный сайт (от 19 900 ₽, 7–10 дней) — до 10 страниц: отдельная страница под каждую услугу, цены, портфолио и контакты. Так сайт собирает поисковый трафик по многим запросам, а не по одному."], ["Почему не конструктор?", "Сайт на коде быстрее, лучше индексируется и не требует ежемесячной подписки на конструктор."], ["Поможете с продвижением?", "Закладываем SEO-основу: структура, тексты, разметка, sitemap, подключение Яндекс Вебмастера и Google Search Console."], ["Можно потом добавить страницы?", "Да, структура позволяет добавлять страницы услуг и статьи."], ...commonFaq] },
  { path: "/parser-na-zakaz", mock: "script", project: "script", start: "svc_script", crumb: "Парсер на заказ",
    service: { name: "Разработка парсера на заказ", price: 2900 },
    title: "Парсер на заказ от 2 900 ₽ — сбор данных за 1–4 дня | CodWay",
    desc: "Парсеры и скрипты на Python: цены конкурентов, товары с Wildberries, Ozon, Avito, выгрузка в Excel и Google Таблицы, уведомления в Telegram. От 2 900 ₽.",
    kicker: "Парсеры и автоматизация", h1: "Парсер на заказ — <em>от 2 900 ₽ за 1–4 дня</em>",
    lead: "Соберём данные с сайтов и маркетплейсов, сложим в таблицу и настроим запуск по расписанию. Отчёт или уведомление об изменениях будут приходить вам в Telegram.",
    blocks: () => [textBlock("Типовые задачи", [["Цены конкурентов", "Мониторинг цен и наличия, отчёт об изменениях."], ["Маркетплейсы", "Wildberries, Ozon, Avito, Яндекс Маркет — товары, отзывы, позиции."], ["Выгрузка", "Excel, CSV, Google Таблицы или ваша база данных."], ["По расписанию", "Каждый час, день или неделю — без вашего участия."], ["Уведомления", "Новые объявления или упавшая цена — сразу в Telegram."], ["Скрипты", "Автоматизация рутины: обработка файлов, отчёты, интеграции по API."]]), steps()],
    faq: [["Это законно?", "Мы собираем только общедоступные данные и соблюдаем ограничения сайтов по нагрузке."], ["Что если сайт поменяет вёрстку?", "В течение 30 дней поправим бесплатно, дальше — по небольшой фиксированной цене."], ["В каком виде я получу данные?", "Как удобно: Excel, CSV, Google Таблица, база данных или сообщения в Telegram."], ...commonFaq] },
  { path: "/ceny", mock: "home", crumb: "Цены",
    title: "Цены на разработку ботов, Mini Apps, сайтов и парсеров | CodWay",
    desc: "Прайс CodWay: Telegram-бот от 4 900 ₽, Mini App от 14 900 ₽, лендинг от 9 900 ₽, многостраничный сайт от 19 900 ₽, парсер от 2 900 ₽, система от 59 900 ₽. Онлайн-калькулятор и готовые решения.",
    kicker: "Прайс", h1: "Цены без накруток <em>агентства</em>",
    lead: "У студий похожие проекты стоят от 50 000 ₽. Мы небольшая команда без офиса и отдела продаж, поэтому называем честную цену сразу и фиксируем её в смете.",
    blocks: () => [priceTable(), solutions(), compare()],
    faq: [["Почему так дешевле, чем в студиях?", "Нет офиса, менеджеров и отдела продаж — вы платите только за разработку."], ["Цена может вырасти в процессе?", "Нет, если задача не меняется. Новые пожелания оцениваем отдельно и только с вашего согласия."], ...commonFaq] },
  { path: "/kontakty", mock: "home", crumb: "Контакты",
    title: "Контакты CodWay — Telegram-бот, Telegram, почта",
    desc: "Связаться с CodWay: бот для заявок @codwey_bot, Telegram @mexciti, почта coddweyy@gmail.com. Отвечаем ежедневно 9:00–22:00 МСК.",
    kicker: "Контакты", h1: "Связаться с <em>CodWay</em>",
    lead: "Быстрее всего — через бота: можно приложить фото, файлы и голосовые, ответ придёт туда же. Или пишите напрямую в Telegram или на почту.",
    blocks: () => [`<section class="sec"><div class="wrap"><div class="contacts">${[
      [botLink("site"), "Бот для заявок", "@" + C.bot, "Заявка с фото и голосовыми, ответ в этом же чате"],
      [`https://t.me/${C.tg}`, "Telegram", "@" + C.tg, "Написать разработчику лично"],
      [`mailto:${C.email}`, "Почта", C.email, "Для ТЗ, документов и договоров"],
    ].map(([h, t, v, d]) => `<a class="ccard" href="${h}"${h.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}><small>${t}</small><b>${v}</b><span>${d}</span></a>`).join("")}</div></div></section>`],
    faq: commonFaq },
];

// ---------- build ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.cpSync(path.join(here, "static"), out, { recursive: true });
fs.copyFileSync(path.join(here, "brand/favicon.svg"), path.join(out, "favicon.svg"));
for (const f of fs.readdirSync(path.join(here, "assets"))) fs.copyFileSync(path.join(here, "assets", f), path.join(out, "assets", f));
const dataScript = `<script>window.CW=${JSON.stringify({ projects: P.projects, features: P.features, solutions: S.map(({ id, title, project, price }) => ({ id, title, project, price })), api: "https://api.codway.su/api/order", bot: botLink() })}</script>`;
for (const pg of pages) {
  const html = head(pg) + header(pg.path) + hero(pg) + pg.blocks().join("") + form(pg) + faqBlock(pg.faq) + dataScript + footer();
  const file = pg.file || pg.path.slice(1) + ".html";
  fs.writeFileSync(path.join(out, file), html);
  if (!pg.file) { fs.mkdirSync(path.join(out, pg.path.slice(1)), { recursive: true }); fs.writeFileSync(path.join(out, pg.path.slice(1), "index.html"), html); }
}
const nf = { path: "/404", crumb: "Страница не найдена", title: "Страница не найдена — CodWay", desc: "Такой страницы нет. Перейдите на главную CodWay.", faq: [] };
fs.writeFileSync(path.join(out, "404.html"), head(nf).replace(/<link rel="canonical"[^>]+>/, '<meta name="robots" content="noindex">') + header("") + `<section class="hero"><div class="wrap narrow"><h1>404 — <em>такой страницы нет</em></h1><p class="lead">Возможно, она переехала. Начните с главной или напишите нам в бот.</p><div class="cta"><a class="btn btn-acc" href="/">На главную</a><a class="btn btn-tg" href="${botLink("site")}">${tgIcon}Написать в бот</a></div></div></section>` + footer());
// ---------- demos: /demo/<id>/ (static, work standalone and as Telegram WebApp) ----------
const DEMO_KIND = { booking: "chat", ai: "chat", video: "chat", coffee: "app", shop: "app" };
for (const s of S) {
  if (s.project === "site") { // full demo websites: hand-made templates in site/demosites/<id>.html, images in static/demo/<id>/img
    const tpl = fs.readFileSync(path.join(here, "demosites", s.id + ".html"), "utf8");
    const cw = `<script>window.DEMO_SITE=${JSON.stringify({ id: s.id, price: rub(s.price), days: "5–7 дней", link: botLink("demo_" + s.id) })}</script><link rel="stylesheet" href="/demo/sites.css?v=${BUILD}"><script src="/demo/sites.js?v=${BUILD}" defer></script>`;
    fs.mkdirSync(path.join(out, "demo", s.id), { recursive: true });
    fs.writeFileSync(path.join(out, "demo", s.id, "index.html"), tpl.replace("<!--CW-->", cw));
    continue;
  }
  const kind = DEMO_KIND[s.id] || "chat";
  const pg = { path: `/demo/${s.id}/`, crumb: "Демо", title: `Демо: ${s.title} — попробовать онлайн | CodWay`, desc: `Интерактивное демо «${s.title}»: нажимайте кнопки и пройдите сценарий целиком. ${s.description} Готовое решение от ${rub(s.price)}.`, faq: [] };
  const h = head(pg).replace(/<script type="application\/ld\+json">.*?<\/script>/g, "").replace("</head>", `<link rel="stylesheet" href="/demo/demo.css?v=${BUILD}"><script src="https://telegram.org/js/telegram-web-app.js"></script></head>`).replace("<body>", `<body class="demo-body kind-${kind}">`);
  const html = h + `<div class="demo"><aside class="demo-info"><div class="demo-top">${logo()}<a class="demo-back" href="/#gotovye">← Все решения</a></div><span class="tag">Демо · ${s.tag}</span><h1>${s.title}</h1><p class="lead">${s.description}</p><ul class="demo-feats">${s.features.map((f) => `<li>${f}</li>`).join("")}</ul><p class="demo-hint">Это рабочий прототип — нажимайте кнопки и пишите сообщения. Оплата и заказы здесь не настоящие.</p><div class="demo-buy"><div><small>Готовое решение</small><b>${rub(s.price)}</b></div><a class="btn btn-acc" href="${botLink("demo_" + s.id)}" target="_blank" rel="noopener">${tgIcon}Хочу такой</a><a class="btn btn-ghost" href="/#zayavka">Оставить заявку</a></div></aside><div class="demo-stage"><div class="glow" aria-hidden="true"></div>${device(`<div id="app" class="app"></div>`, "demo-device", kind === "app" && s.id === "shop" ? "light" : "dark").replace(' aria-hidden="true"', "")}</div></div><script>window.DEMO=${JSON.stringify({ id: s.id, title: s.title, price: rub(s.price), link: botLink("demo_" + s.id) })}</script><script src="/demo/core.js?v=${BUILD}"></script><script src="/demo/${kind === "app" ? "miniapp" : "chat"}.js?v=${BUILD}"></script></body></html>`;
  fs.mkdirSync(path.join(out, "demo", s.id), { recursive: true });
  fs.writeFileSync(path.join(out, "demo", s.id, "index.html"), html);
}
fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${BUILD}</lastmod><priority>${p.path === "/" ? "1.0" : "0.8"}</priority></url>`).concat(S.map((x) => `  <url><loc>${SITE}/demo/${x.id}/</loc><lastmod>${BUILD}</lastmod><priority>0.5</priority></url>`)).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /404.html\n\nHost: codway.su\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, "release.json"), JSON.stringify({ version: "static-v8", build: BUILD, pages: pages.map((p) => p.path) }, null, 2));
console.log("built", pages.length, "pages →", out);
