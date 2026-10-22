import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Check,
  Code2,
  Bot,
  Boxes,
  Braces,
  Layers3,
  Sparkles,
  Send,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Menu,
  Terminal,
  CalendarDays,
  Phone,
  Mail,
  LockKeyhole,
  Clock3,
  CircleDot,
  LoaderCircle,
  ExternalLink,
  Zap,
  CheckCircle2,
} from "lucide-react";
import pricing from "../shared/pricing.json";
import { BackgroundPaths } from "@/components/ui/background-paths";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (["codway.su", "www.codway.su"].includes(window.location.hostname)
    ? "https://api.codway.su"
    : "");

const money = (v) => new Intl.NumberFormat("ru-RU").format(v);
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const projectIcons = {
  bot: Bot,
  miniapp: Layers3,
  script: Braces,
  system: Boxes,
};
const faqs = [
  [
    "Что входит в стоимость?",
    "Разработка согласованного функционала, тестирование, запуск и передача исходного кода. Калькулятор показывает предварительную вилку: точную смету и сроки фиксируем после обсуждения задачи. Хостинг, платные API и комиссии платёжных сервисов считаются отдельно.",
  ],
  [
    "Кому принадлежат код и доступы?",
    "После полной оплаты передаём вам исходный код, документацию и доступы к проекту. Условия передачи прав фиксируем в договоре. Вы сможете развивать продукт самостоятельно или с другой командой.",
  ],
  [
    "Как вы защищаете данные?",
    "Используем HTTPS, проверяем входящие данные и ограничиваем доступ к админке. Токены хранятся на сервере, а не в браузере. Состав мер защиты и правила работы с персональными данными согласуем под конкретный проект.",
  ],
  [
    "Поможете с хостингом и запуском?",
    "Да. Подберём сервер под нагрузку, настроим домен, HTTPS и автоматический перезапуск. Регулярные расходы на инфраструктуру обсудим до начала работы.",
  ],
  [
    "Что происходит после релиза?",
    "Передаём инструкцию и проверяем работу на вашем сервере. Период исправления ошибок по согласованному ТЗ и условия дальнейшей поддержки фиксируем в договоре. Новые функции оцениваем отдельно.",
  ],
];

function Logo() {
  return (
    <a href="#" className="logo" aria-label="CodWay — на главную">
      <span className="logo-mark">
        <Code2 size={23} strokeWidth={2.4} />
      </span>
      CodWay<span className="logo-dot">®</span>
    </a>
  );
}
function SectionIntro({ n, label, children, text }) {
  return (
    <div className="section-intro">
      <div className="eyebrow">
        <span>{n} /</span> {label}
      </div>
      <h2>{children}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

/**
 * Progressive-enhancement reveal.
 *
 * The hidden state is only applied once `reveal-ready` is set on <html>, so a
 * JavaScript failure can never leave the page unreadable. Only transform and
 * opacity are animated and the text itself stays opaque.
 */
function useReveal() {
  // Layout effect: the hidden state is applied before the first paint, so the
  // page never flashes visible content and then hides it again.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!targets.length) return;
    const revealAll = () =>
      targets.forEach((el) => el.classList.add("is-in"));
    if (
      typeof IntersectionObserver === "undefined" ||
      prefersReducedMotion()
    ) {
      revealAll();
      return;
    }
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));
    const fallback = () =>
      targets.forEach((el) => {
        if (el.classList.contains("is-in")) return;
        if (el.getBoundingClientRect().top < window.innerHeight * 0.94)
          el.classList.add("is-in");
      });
    window.addEventListener("scroll", fallback, { passive: true });
    window.addEventListener("resize", fallback);
    fallback();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", fallback);
      window.removeEventListener("resize", fallback);
      root.classList.remove("reveal-ready");
    };
  }, []);
}

function PhonePreview({ small = false }) {
  return (
    <div
      className={`phone-preview ${small ? "compact" : ""}`}
      aria-label="Демонстрационный интерфейс магазина"
    >
      <div className="phone-top">
        <span>9:41</span>
        <span className="phone-island" />
        <span>••• ▰</span>
      </div>
      <div className="tg-top">
        <span>‹ Назад</span>
        <strong>
          FORM / STORE <small>mini app</small>
        </strong>
        <span>•••</span>
      </div>
      <div className="store-head">
        <span>
          FORM<span className="tiny-green">®</span>
        </span>
        <ShoppingBag size={17} />
      </div>
      <div className="store-title">
        Less noise.
        <br />
        More <i>you.</i>
      </div>
      <div className="store-tabs">
        <span className="active">Всё</span>
        <span>Одежда</span>
        <span>Аксессуары</span>
      </div>
      <div className="product-preview">
        <div className="product-label">NEW DROP / 026</div>
        <div className="shirt">
          <div className="shirt-print">
            FORM
            <br />
            <small>EVERYDAY ESSENTIALS</small>
          </div>
        </div>
        <span className="product-plus">+</span>
      </div>
      <div className="product-caption">
        <div>
          Oversize Tee<small>Graphite / unisex</small>
        </div>
        <b>3 900 ₽</b>
      </div>
      <div className="store-bottom">
        <span>
          ⌂<small>Главная</small>
        </span>
        <span>
          ⊞<small>Каталог</small>
        </span>
        <span>
          ♡<small>Избранное</small>
        </span>
        <span>
          ◯<small>Профиль</small>
        </span>
      </div>
    </div>
  );
}

function Calculator({ prefill, onPrivacy }) {
  const [project, setProject] = useState("bot");
  const [features, setFeatures] = useState([]);
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const requestId = useRef(null);
  useEffect(() => {
    if (prefill) {
      setProject(prefill.project);
      setDescription(prefill.text);
      setState("idle");
      setReceipt(null);
      requestId.current = null;
    }
  }, [prefill]);
  const selected = [
    pricing.projects.find((p) => p.id === project),
    ...pricing.features.filter((f) => features.includes(f.id)),
  ];
  const sum = (key) => selected.reduce((n, item) => n + item[key], 0);
  const change = (fn) => {
    fn();
    setError("");
    requestId.current = null;
  };
  const toggle = (id) =>
    change(() =>
      setFeatures((prev) =>
        prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
      ),
    );
  async function submit(e) {
    e.preventDefault();
    if (state === "sending") return;
    setError("");
    const contactValue = contact.trim();
    if (
      !/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(contactValue) &&
      !/^\+[1-9]\d{9,14}$/.test(contactValue.replace(/[\s()\-]/g, ""))
    ) {
      setError(
        "Введите Telegram @username от 5 символов или телефон с кодом страны.",
      );
      return;
    }
    if (description.trim().length < 10) {
      setError("Расскажите чуть подробнее об идее — хотя бы 10 символов.");
      return;
    }
    if (!consent) {
      setError("Нужно согласие на обработку данных, чтобы мы могли ответить.");
      return;
    }
    setState("sending");
    if (!requestId.current)
      requestId.current =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
              (
                Number(c) ^
                (crypto.getRandomValues(new Uint8Array(1))[0] &
                  (15 >> (Number(c) / 4)))
              ).toString(16),
            );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_BASE}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: requestId.current,
          contact: contactValue,
          project,
          features,
          description: description.trim(),
          consent,
          website,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "Слишком много заявок. Попробуйте через 10 минут."
            : typeof data.detail === "string"
              ? data.detail
              : "Проверьте контакт и описание. Если ошибка повторится, попробуйте позже.",
        );
      setReceipt(data);
      setState("success");
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Сервер отвечает дольше обычного. Повторите отправку: дубликат заявки не появится."
          : err instanceof TypeError
            ? "Не удалось связаться с сервером. Проверьте интернет и повторите."
            : err.message,
      );
      setState("idle");
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <section id="calculator" className="section calculator-section">
      <div className="container">
        <div className="calculator-intro">
          <SectionIntro
            n="02"
            label="КАЛЬКУЛЯТОР ПРОЕКТА"
            text="Выберите формат и нужные возможности. Стоимость и сроки изменятся сразу — без регистрации и ожидания ответа."
          >
            Сколько стоит ваша идея?
            <br />
            <span className="subtle">Давайте посчитаем.</span>
          </SectionIntro>
          <div className="small-note">
            <CircleDot size={16} />
            <span>
              Прозрачная оценка
              <br />
              <b>до первого сообщения</b>
            </span>
          </div>
        </div>
        <form className="calculator-grid" onSubmit={submit}>
          <div className="configurator">
            <div className="form-step">
              <span>01</span>
              <h3>Что будем создавать?</h3>
            </div>
            <div className="project-options">
              {pricing.projects.map((p) => {
                const Icon = projectIcons[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={project === p.id}
                    className={`project-option ${project === p.id ? "selected" : ""}`}
                    onClick={() => change(() => setProject(p.id))}
                  >
                    <Icon size={22} />
                    <span>{p.label}</span>
                    <span className="radio-mark">
                      {project === p.id && <span />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="form-step step-two">
              <span>02</span>
              <h3>Добавим возможности</h3>
              <small>необязательно</small>
            </div>
            <div className="feature-options">
              {pricing.features.map((f) => (
                <label
                  key={f.id}
                  className={`feature-option ${features.includes(f.id) ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={features.includes(f.id)}
                    onChange={() => toggle(f.id)}
                  />
                  <span className="custom-check">
                    {features.includes(f.id) && <Check size={13} />}
                  </span>
                  <span>
                    {f.label}
                    <small>{f.detail}</small>
                  </span>
                  <span className="feature-price">+ {money(f.min)} ₽</span>
                </label>
              ))}
            </div>
            <div className="config-note">
              <LockKeyhole size={14} /> Исходный код и доступы передаём вам
            </div>
          </div>
          <div className="estimate-panel">
            <div className="estimate-top">
              <span className="mono">ВАШ ПРОЕКТ / СМЕТА</span>
              <Terminal size={17} />
            </div>
            <div className="estimate-title">Предварительная стоимость</div>
            <div className="estimate-price" aria-live="polite">
              {money(sum("min"))}
              <span> — </span>
              {money(sum("max"))}
              <small>₽</small>
            </div>
            <div className="estimate-days">
              <Clock3 size={15} />
              <span>
                {sum("daysMin")}–{sum("daysMax")} рабочих дней
              </span>
              <span className="estimate-label">под ключ</span>
            </div>
            <div className="estimate-divider" />
            {state === "success" ? (
              <div className="success-panel" role="status">
                <CheckCircle2 size={38} />
                <h3>Идея уже у нас!</h3>
                <p>
                  Заявка №{receipt.id} сохранена. Свяжемся с вами по указанному
                  контакту, чтобы обсудить детали и точную смету.
                </p>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setState("idle");
                    setDescription("");
                    setContact("");
                    setConsent(false);
                    requestId.current = null;
                  }}
                >
                  Отправить ещё одну <ArrowUpRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="form-step contact-step">
                  <span>03</span>
                  <h3>Обсудим вашу идею</h3>
                </div>
                <label className="field-label" htmlFor="contact">
                  Telegram или телефон
                </label>
                <input
                  id="contact"
                  name="contact"
                  className="text-field"
                  placeholder="@username или +7 999 123-45-67"
                  autoComplete="tel"
                  value={contact}
                  maxLength={40}
                  onChange={(e) => change(() => setContact(e.target.value))}
                  required
                  disabled={state === "sending"}
                />
                <label className="field-label" htmlFor="description">
                  Пара слов о проекте
                </label>
                <textarea
                  id="description"
                  className="text-field"
                  placeholder="Что хотите создать? Какую задачу нужно решить?"
                  rows={3}
                  value={description}
                  minLength={10}
                  maxLength={3000}
                  onChange={(e) => change(() => setDescription(e.target.value))}
                  required
                  disabled={state === "sending"}
                />
                <div className="honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    disabled={state === "sending"}
                  />
                  <span>
                    Соглашаюсь с{" "}
                    <button type="button" onClick={onPrivacy}>
                      обработкой персональных данных
                    </button>
                  </span>
                </label>
                {error && (
                  <div role="alert" className="form-error">
                    {error}
                  </div>
                )}
                <button
                  className="button primary submit-button"
                  type="submit"
                  disabled={state === "sending"}
                >
                  {state === "sending" ? (
                    <>
                      <LoaderCircle size={18} className="spin" /> Отправляем…
                    </>
                  ) : (
                    <>
                      Обсудить проект <ArrowUpRight size={19} />
                    </>
                  )}
                </button>
                <p className="estimate-disclaimer">
                  Это ориентир, не публичная оферта. Финальную смету зафиксируем
                  после обсуждения. Внешние сервисы и хостинг оплачиваются
                  отдельно.
                </p>
              </>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            'button,input,a[href],textarea,select,[tabindex="0"]',
          ),
        ].filter((el) => !el.disabled);
        const first = els[0],
          last = els.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [faq, setFaq] = useState(0);
  const [prefill, setPrefill] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState(false);
  const [payState, setPayState] = useState("idle");
  const [payError, setPayError] = useState("");
  const [payReceipt, setPayReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const addToCart = (item) => {
    setCart((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [...prev, item];
    });
    setToast(item.title + " добавлен в корзину");
    setTimeout(() => setToast(null), 2500);
  };
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((p) => p.id !== id));
  const cartTotal = cart.reduce((n, p) => n + p.price, 0);
  async function pay() {
    if (payState === "sending" || !cart.length) return;
    setPayError("");
    setPayState("sending");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const submissionId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-100000000000";
    try {
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          items: cart.map((p) => ({ id: p.id, title: p.title, price: p.price })),
          amount: cartTotal,
          description: cart.map((p) => p.title).join(", "),
          contact: "@codway_client",
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Не удалось создать платёж. Попробуйте позже.",
        );
      setPayReceipt(data);
      setPayState("success");
      if (data.payment_url) window.location.href = data.payment_url;
    } catch (err) {
      setPayError(
        err.name === "AbortError"
          ? "Сервер отвечает дольше обычного. Повторите."
          : err instanceof TypeError
            ? "Не удалось связаться с сервером."
            : err.message,
      );
      setPayState("idle");
    } finally {
      clearTimeout(timeout);
    }
  }
  const chooseProject = (type) => {
    const details = {
      shop: {
        project: "miniapp",
        text: "Хочу Mini App магазин с каталогом товаров и корзиной.",
      },
      booking: {
        project: "bot",
        text: "Нужен бот для записи клиентов с выбором времени и уведомлениями.",
      },
      ai: {
        project: "bot",
        text: "Хочу AI-ассистента для ответов клиентам по базе знаний.",
      },
      video: {
        project: "bot",
        text: "Нужен Telegram-бот для скачивания видео с YouTube, VK, TikTok и Rutube с выбором качества и формата.",
      },
      coffee: {
        project: "miniapp",
        text: "Хочу Mini App для заказа кофе с меню, выбором размера и корзиной.",
      },
    };
    setPrefill({ ...details[type], time: Date.now() });
    setTimeout(
      () =>
        document
          .getElementById("calculator")
          .scrollIntoView({
            behavior: prefersReducedMotion() ? "instant" : "smooth",
          }),
      40,
    );
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="header">
        <div className="container nav">
          <Logo />
          <nav
            className={menu ? "nav-links open" : "nav-links"}
            aria-label="Основная навигация"
          >
            {[
              ["#services", "Что создаём"],
              ["#work", "Демо-проекты"],
              ["#process", "Процесс"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a href={href} key={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <a className="nav-cta" href="#calculator">
            Обсудить проект <ArrowUpRight size={16} />
          </a>
          <button
            className="menu-button icon-button"
            aria-label={menu ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <BackgroundPaths title={"Идеи становятся\nпродуктами."} />
        <div className="stack-strip">
          <div className="container">
            <span className="mono">
              ХОРОШИЕ ИДЕИ.
              <br />
              <b>ПРОВЕРЕННЫЕ ТЕХНОЛОГИИ.</b>
            </span>
            <div>
              <Send /> Telegram
            </div>
            <div>
              <Code2 /> React
            </div>
            <div>
              <Braces /> Python
            </div>
            <div>
              <Zap /> FastAPI
            </div>
            <div>
              <Layers3 /> Mini Apps
            </div>
          </div>
        </div>
        <section className="section services-section" id="services">
          <div className="container">
            <div className="section-heading">
              <SectionIntro n="01" label="ЧТО СОЗДАЁМ">
                Меньше рутины.
                <br />
                <span className="subtle">Больше вашего бизнеса.</span>
              </SectionIntro>
              <p className="section-aside">
                Не просто пишем код. Убираем лишние действия между вашим
                бизнесом и результатом.
              </p>
            </div>
            <div className="services-grid">
              {[
                {
                  icon: Bot,
                  num: "01",
                  title: "Telegram-боты",
                  text: "Принимайте заявки, записывайте клиентов и продавайте там, где им удобно.",
                  tags: ["Продажи", "Запись", "Уведомления"],
                  price: "от 15 000 ₽",
                },
                {
                  icon: Layers3,
                  num: "02",
                  title: "Mini Apps",
                  text: "Полноценное приложение внутри Telegram. Каталог, корзина и личный кабинет.",
                  tags: ["E-commerce", "WebApp", "Сервисы"],
                  price: "от 40 000 ₽",
                },
                {
                  icon: Braces,
                  num: "03",
                  title: "Автоматизация",
                  text: "Пусть рутина выполняет себя сама. Скрипты, парсеры и интеграции ваших систем.",
                  tags: ["Парсинг", "API", "AI-интеграции"],
                  price: "от 10 000 ₽",
                },
              ].map(({ icon: Icon, ...s }) => (
                <a
                  href="#calculator"
                  className="service-card"
                  key={s.num}
                 
                >
                  <div className="service-top">
                    <Icon size={25} />
                    <span className="mono">/{s.num}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <div className="tags">
                    {s.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <div className="service-bottom">
                    <span>{s.price}</span>
                    <ArrowUpRight size={21} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
        <Calculator prefill={prefill} onPrivacy={() => setPrivacy(true)} />
        <section className="section work-section" id="work">
          <div className="container">
            <div className="section-heading">
              <SectionIntro n="03" label="ПОПРОБУЙТЕ В ДЕЛЕ">
                Можно посмотреть.
                <br />
                <span className="subtle">А можно попробовать.</span>
              </SectionIntro>
              <p className="section-aside">
                Три демо-концепта, которые можно потрогать. Посмотрите, как
                может работать ваш продукт.
              </p>
            </div>
            <div className="work-grid">
              <article className="work-card">
                <button
                  className="work-visual shop-visual"
                                    aria-label="Открыть демо Mini App магазина"
                >
                  <span className="visual-badge">MINI APP</span>
                  <div className="portfolio-phone">
                    <PhonePreview small />
                  </div>
                  <span className="work-visual-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </button>
                <div className="work-meta">
                  <span className="mono">01 / E-COMMERCE</span>
                  <h3>Магазин в вашем кармане</h3>
                  <p>Каталог, размеры, корзина. Всё внутри Telegram.</p>
                  <div className="tags">
                    <span className="tag-ready">Готово</span>
                    <span>React</span>
                    <span>Telegram WebApp</span>
                    <span>FastAPI</span>
                  </div>
                  <button
                    className="buy-button"
                    onClick={() => { addToCart({ id: "shop", title: "Mini App магазин", price: 40000 }); setTimeout(() => { const el = document.querySelector(".contact-cart") || document.getElementById("contacts"); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset; window.scrollTo({ top: Math.max(0, top - 60), behavior: "instant" }); } }, 300); }}
                  >
                    Купить <ShoppingBag size={17} />
                  </button>
                </div>
              </article>
              <article className="work-card">
                <button
                  className="work-visual booking-visual"
                  bookingaria-label="Открыть демо бота записи"
                >
                  <span className="visual-badge">TELEGRAM BOT</span>
                  <div className="booking-preview">
                    <div className="booking-preview-header">
                      <span className="booking-avatar">S.</span>
                      <div>
                        STUDIO / booking<small>бот</small>
                      </div>
                      <span>•••</span>
                    </div>
                    <div className="preview-msg">
                      Привет! Время для себя?
                      <br />
                      Выберите удобный день ✂
                    </div>
                    <div className="preview-calendar">
                      <b>
                        Выберите дату <CalendarDays size={14} />
                      </b>
                      <div>
                        {["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((d, i) => (
                          <span className={i === 2 ? "picked" : ""} key={d}>
                            <small>{d}</small>
                            {22 + i}
                          </span>
                        ))}
                      </div>
                      <div className="preview-slots">
                        <span>10:00</span>
                        <span className="picked">12:00</span>
                        <span>14:30</span>
                      </div>
                    </div>
                    <div className="preview-confirm">
                      <Check size={13} /> Вы записаны. До встречи!
                    </div>
                  </div>
                  <span className="work-visual-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </button>
                <div className="work-meta">
                  <span className="mono">02 / SERVICES</span>
                  <h3>Запись без переписок</h3>
                  <p>Свободные слоты, запись и напоминания клиентам.</p>
                  <div className="tags">
                    <span className="tag-ready">Готово</span>
                    <span>Python</span>
                    <span>Aiogram</span>
                    <span>SQLite</span>
                  </div>
                  <button
                    className="buy-button"
                    onClick={() => { addToCart({ id: "booking", title: "Бот записи клиентов", price: 15000 }); setTimeout(() => { const el = document.querySelector(".contact-cart") || document.getElementById("contacts"); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset; window.scrollTo({ top: Math.max(0, top - 60), behavior: "instant" }); } }, 300); }}
                  >
                    Купить <CalendarDays size={17} />
                  </button>
                </div>
              </article>
              <article className="work-card">
                <button
                  className="work-visual ai-visual"
                  aiaria-label="Открыть демо AI-поддержки"
                >
                  <span className="visual-badge">AI ASSISTANT</span>
                  <div className="ai-preview">
                    <div className="ai-spark">
                      <Sparkles size={30} />
                    </div>
                    <div className="ai-preview-title">
                      На связи.
                      <br />
                      <span>В любое время.</span>
                    </div>
                    <div className="ai-question">
                      Как подключить ваш сервис?
                    </div>
                    <div className="ai-answer">
                      <Sparkles size={15} />
                      <span>
                        Помогу разобраться.
                        <br />
                        Начнём с простого…
                      </span>
                    </div>
                    <div className="ai-sources">
                      <span />
                      <span />
                      <span /> На основе вашей базы знаний
                    </div>
                  </div>
                  <span className="work-visual-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </button>
                <div className="work-meta">
                  <span className="mono">03 / AI & AUTOMATION</span>
                  <h3>Поддержка с интеллектом</h3>
                  <p>Ответы по базе знаний и помощь вашим клиентам.</p>
                  <div className="tags">
                    <span className="tag-ready">Готово</span>
                    <span>Python</span>
                    <span>LLM API</span>
                    <span>RAG</span>
                  </div>
                  <button className="buy-button" onClick={() => { addToCart({ id: "ai", title: "AI-ассистент поддержки", price: 25000 }); setTimeout(() => { const el = document.querySelector(".contact-cart") || document.getElementById("contacts"); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset; window.scrollTo({ top: Math.max(0, top - 60), behavior: "instant" }); } }, 300); }}>
                    Купить <ArrowUpRight size={17} />
                  </button>
                </div>
              </article>
              <article className="work-card">
                <button
                  className="work-visual video-visual"
                  videoaria-label="Открыть демо бота скачивания видео"
                >
                  <span className="visual-badge">TELEGRAM BOT</span>
                  <div className="video-preview">
                    <div className="video-preview-head">
                      <span className="video-avatar">DL</span>
                      <div>
                        VideoDL · downloader<small>бот</small>
                      </div>
                      <span>•••</span>
                    </div>
                    <div className="video-preview-msg user">
                      https://youtu.be/dQw4w9WgXcQ
                    </div>
                    <div className="video-preview-msg bot">
                      <span className="video-platform yt">YouTube</span>
                      Определил видео · 1080p / 720p / MP3
                    </div>
                    <div className="video-preview-options">
                      <span>MP4 1080p</span>
                      <span className="picked">MP4 720p</span>
                      <span>MP3</span>
                    </div>
                    <div className="video-preview-confirm">
                      <Check size={13} /> Файл готов · 48.2 МБ
                    </div>
                  </div>
                  <span className="work-visual-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </button>
                <div className="work-meta">
                  <span className="mono">04 / MEDIA</span>
                  <h3>Скачивание видео в один клик</h3>
                  <p>
                    Ссылка из любого мессенджера — файл в чате. YouTube, VK,
                    TikTok, Rutube, выбор качества.
                  </p>
                  <div className="tags">
                    <span className="tag-ready">Готово</span>
                    <span>Python</span>
                    <span>Aiogram</span>
                    <span>yt-dlp</span>
                  </div>
                  <button className="buy-button" onClick={() => { addToCart({ id: "video", title: "Бот скачивания видео", price: 20000 }); setTimeout(() => { const el = document.querySelector(".contact-cart") || document.getElementById("contacts"); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset; window.scrollTo({ top: Math.max(0, top - 60), behavior: "instant" }); } }, 300); }}>
                    Купить <ArrowUpRight size={17} />
                  </button>
                </div>
              </article>
              <article className="work-card">
                <button
                  className="work-visual coffee-visual"
                  coffeearia-label="Открыть демо Mini App доставки кофе"
                >
                  <span className="visual-badge">MINI APP</span>
                  <div className="coffee-preview">
                    <div className="coffee-preview-head">
                      <b>BEAN / coffee</b>
                      <span>
                        <ShoppingBag size={15} /> 2
                      </span>
                    </div>
                    <div className="coffee-preview-items">
                      <div>
                        <span>☕</span>
                        <div>
                          Латте<small>M · овсяное молоко</small>
                        </div>
                        <b>320 ₽</b>
                      </div>
                      <div>
                        <span>☕</span>
                        <div>
                          Раф<small>L · ваниль</small>
                        </div>
                        <b>380 ₽</b>
                      </div>
                    </div>
                    <div className="coffee-preview-total">
                      <span>Итого</span>
                      <b>700 ₽</b>
                    </div>
                    <div className="coffee-preview-cta">Оформить заказ</div>
                  </div>
                  <span className="work-visual-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </button>
                <div className="work-meta">
                  <span className="mono">05 / E-COMMERCE</span>
                  <h3>Кофе в два тапа</h3>
                  <p>
                    Меню, размер, молоко и корзина — внутри Telegram. Заказ
                    уходит бариста мгновенно.
                  </p>
                  <div className="tags">
                    <span className="tag-ready">Готово</span>
                    <span>React</span>
                    <span>Telegram WebApp</span>
                    <span>FastAPI</span>
                  </div>
                  <button className="buy-button" onClick={() => { addToCart({ id: "coffee", title: "Mini App доставки кофе", price: 35000 }); setTimeout(() => { const el = document.querySelector(".contact-cart") || document.getElementById("contacts"); if (el) { const top = el.getBoundingClientRect().top + window.pageYOffset; window.scrollTo({ top: Math.max(0, top - 60), behavior: "instant" }); } }, 300); }}>
                    Купить <ArrowUpRight size={17} />
                  </button>
                </div>
              </article>
            </div>
            <div className="portfolio-note">
              <CircleDot size={13} /> Интерактивные демо-концепты: интерфейс и
              сценарии работы. Это не клиентские кейсы; AI-демо отвечает
              готовыми текстами.
              <CircleDot size={13} /> Концепты демонстрируют интерфейс и
              сценарии. Это не клиентские кейсы; AI-демо использует готовые
              ответы.
            </div>
          </div>
        </section>
        <section className="section process-section" id="process">
          <div className="container">
            <div className="section-heading">
              <SectionIntro n="04" label="КАК РАБОТАЕМ">
                От первого «привет»
                <br />
                <span className="subtle">до первого пользователя.</span>
              </SectionIntro>
              <div className="process-note">
                <span className="status-dot" /> Вы в курсе на каждом этапе
              </div>
            </div>
            <div className="process-grid">
              {[
                [
                  "01",
                  "Разбираемся в задаче",
                  "Обсуждаем идею, собираем требования. Фиксируем ТЗ, смету и сроки.",
                  "БРИФ → ТЗ",
                ],
                [
                  "02",
                  "Собираем прототип",
                  "Продумываем сценарии и интерфейс. Показываем, как всё будет работать.",
                  "ИДЕЯ → ИНТЕРФЕЙС",
                ],
                [
                  "03",
                  "Пишем и проверяем",
                  "Разрабатываем, подключаем интеграции. Тестируем реальные сценарии.",
                  "КОД → ТЕСТЫ",
                ],
                [
                  "04",
                  "Запускаем и передаём",
                  "Разворачиваем продукт, передаём код и инструкцию. Вы готовы к старту.",
                  "РЕЛИЗ → РЕЗУЛЬТАТ",
                ],
              ].map(([n, title, text, tag]) => (
                <div className="process-step" key={n}>
                  <div className="process-number">
                    {n}
                    <ArrowRight size={18} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="mono">{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section faq-section" id="faq">
          <div className="container faq-grid">
            <SectionIntro n="05" label="ЕСТЬ ВОПРОСЫ?">
              Давайте
              <br />
              <span className="subtle">разберёмся.</span>
            </SectionIntro>
            <div className="faq-items">
              {faqs.map(([q, a], i) => (
                <div
                  className={`faq-item ${faq === i ? "expanded" : ""}`}
                  key={q}
                 
                >
                  <h3>
                    <button
                      aria-expanded={faq === i}
                      aria-controls={`faq-${i}`}
                      id={`faq-button-${i}`}
                      onClick={() => setFaq(faq === i ? null : i)}
                    >
                      <span>{q}</span>
                      <span className="faq-icon" aria-hidden="true">
                        <Minus size={18} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    className="faq-answer"
                    data-open={faq === i ? "true" : "false"}
                  >
                    <p>{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="closing-section">
          <div className="container closing">
            <div className="closing-decoration" aria-hidden="true">
              <Code2 />
            </div>
            <span className="eyebrow">СЛЕДУЮЩИЙ ШАГ — ЗА ВАМИ</span>
            <h2>
              Давайте создадим
              <br />
              что-то <span>работающее.</span>
            </h2>
            <p>Вы знаете свой бизнес. Мы знаем, как превратить идею в код.</p>
            <a href="#calculator" className="button primary">
              Начать с идеи <ArrowUpRight size={20} />
            </a>
            <div className="closing-coordinate mono">
              MADE TO WORK. DESIGNED TO FEEL. <span>CODWAY.SU</span>
            </div>
          </div>
        </section>
      </main>
      <section className="section contact-section" id="contacts">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-intro">
              <SectionIntro n="06" label="КОНТАКТЫ">
                Свяжитесь
                <br />
                <span className="subtle">с нами.</span>
              </SectionIntro>
              <p className="section-aside">
                Ответим в течение рабочего дня. Обсудим задачу, сроки и стоимость.
              </p>
            </div>
            <div className="contact-cards">
              <a
                className="contact-card"
                href="https://t.me/codwey_bot"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Send size={20} />
                <div>
                  <b>Telegram</b>
                  <span>@codwey_bot</span>
                </div>
              </a>
              <a className="contact-card" href="tel:+79991234567">
                <Phone size={20} />
                <div>
                  <b>Телефон</b>
                  <span>+7 999 123-45-67</span>
                </div>
              </a>
              <a className="contact-card" href="mailto:hello@codway.su">
                <Mail size={20} />
                <div>
                  <b>Email</b>
                  <span>hello@codway.su</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <div className="container footer-main">
          <div>
            <Logo />
            <p>Код, который работает на вас.</p>
            <div className="footer-contacts">
              <a
                className="footer-telegram"
                href="https://t.me/codwey_bot"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Send size={14} /> Telegram: @codwey_bot
              </a>
              <a className="footer-contact" href="tel:+79991234567">
                <Phone size={14} /> +7 999 123-45-67
              </a>
              <a className="footer-contact" href="mailto:hello@codway.su">
                <Mail size={14} /> hello@codway.su
              </a>
            </div>
          </div>
          <div className="footer-links">
            <a href="#services">Услуги</a>
            <a href="#work">Демо-проекты</a>
            <a href="#calculator">
              Обсудить проект <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} CodWay Studio</span>
          <button onClick={() => setPrivacy(true)}>
            Политика обработки данных
          </button>
          <span className="mono">
            CRAFTED WITH LOGIC & CARE <span className="status-dot" />
          </span>
        </div>
      </footer>

      {cart.length > 0 && (
        <div className="sticky-cart">
          <div className="sticky-cart-inner">
            <div className="sticky-cart-info">
              <ShoppingBag size={18} />
              <span>
                Корзина: {cart.length}{" "}
                {cart.length === 1 ? "товар" : cart.length < 5 ? "товара" : "товаров"} ·{" "}
                {money(cartTotal)} ₽
              </span>
            </div>
            <div className="sticky-cart-actions">
              {payError && (
                <span className="sticky-cart-error">{payError}</span>
              )}
              {payState === "success" && payReceipt && (
                <span className="sticky-cart-success">
                  №{payReceipt.payment_id} создана
                </span>
              )}
              <button
                className="button primary"
                type="button"
                onClick={pay}
                disabled={payState === "sending"}
              >
                {payState === "sending" ? (
                  <>
                    <LoaderCircle size={16} className="spin" /> Создаём…
                  </>
                ) : (
                  <>
                    Оплатить {money(cartTotal)} ₽ <ArrowUpRight size={16} />
                  </>
                )}
              </button>
              <a
                className="sticky-cart-tg"
                href="https://t.me/codwey_bot"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Send size={14} /> Telegram
              </a>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}

      <>
        {privacy && (
          <Modal
            title="Обработка персональных данных"
            onClose={() => setPrivacy(false)}
          >
            <div className="privacy-content">
              <p>
                Отправляя заявку в студию CodWay на codway.su, вы соглашаетесь
                на обработку указанного вами контакта, описания задачи и
                выбранных параметров проекта для ответа на обращение, подготовки
                сметы и обсуждения сотрудничества.
              </p>
              <p>
                Заявки сохраняются на сервере студии и передаются владельцу
                через Telegram. Не указывайте пароли, платёжные данные и
                конфиденциальные сведения в описании. Мы не используем контакт
                для рекламных рассылок.
              </p>
              <p>
                Заявки хранятся до 180 дней; резервные копии — ещё до 7 дней.
                Для удаления или исправления данных сообщите об этом в ответной
                переписке с представителем студии либо отправьте обращение через
                эту форму, указав исходный контакт и номер заявки.
              </p>
              <p>
                Сайт не использует рекламные cookies и аналитику. Технические
                журналы сервера могут содержать IP-адрес и сведения о запросах;
                срок их хранения — до 14 дней. Для защиты от спама API хранит
                хеш IP до 24 часов.
              </p>
              <p className="privacy-note">
                Перед началом платных работ реквизиты исполнителя и условия
                договора согласуются отдельно.
              </p>
            </div>
          </Modal>
        )}
      </>
    </>
  );
}
