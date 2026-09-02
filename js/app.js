/* CodWay — codway.su
   Прелоадер · курсор · прогресс · частицы · процедурная графика ·
   каталог · магнитные кнопки · модалка заказа · часы MSK */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pageT0 = Date.now(); // для анти-бот проверки времени заполнения формы

  /* ---------- Отправка заявки напрямую в админку (без чата) ---------- */
  var ORDER_API = 'https://api.codway.su/api/order';

  function showFormError(form) {
    var el = form.querySelector('.om-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'om-error';
      el.setAttribute('role', 'alert');
      form.appendChild(el);
    }
    el.textContent = 'Не удалось отправить заявку. Напишите нам в Telegram @codwey — примем вручную.';
  }

  function clearFormError(form) {
    var el = form.querySelector('.om-error');
    if (el) el.remove();
  }

  /* opts: { successEl, form, close, onError }.  Пытается 2 раза, затем onError. */
  function submitOrder(payload, opts) {
    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      if (ok) {
        if (opts.successEl) {
          opts.successEl.setAttribute('aria-hidden', 'false');
          opts.successEl.classList.add('show');
        }
        setTimeout(function () {
          if (opts.form) { opts.form.reset(); clearFormError(opts.form); }
          if (opts.close) opts.close();
          if (opts.successEl) {
            opts.successEl.classList.remove('show');
            opts.successEl.setAttribute('aria-hidden', 'true');
          }
        }, 1600);
      } else if (opts.onError) {
        opts.onError();
      }
    }
    function attempt(n) {
      fetch(ORDER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (r.ok) { finish(true); return; }
          if (n < 2) { setTimeout(function () { attempt(n + 1); }, 1500); }
          else finish(false);
        })
        .catch(function () {
          if (n < 2) setTimeout(function () { attempt(n + 1); }, 1500);
          else finish(false);
        });
    }
    attempt(1);
  }

  /* ---------- Skip link для доступности ---------- */
  var skipLink = document.createElement('a');
  skipLink.href = '#top';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Перейти к основному контенту';
  document.body.insertBefore(skipLink, document.body.firstChild);

  /* ---------- Плёночное зерно поверх сайта ---------- */
  var grain = document.createElement('div');
  grain.className = 'grain';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);

  /* ============================================================
     PRELOADER · GUNFIRE — пистолет прорисовывается, выстрел
     (вспышка + отдача + пулевое отверстие), экран расходится
     ============================================================ */
  var preloader = document.getElementById('preloader');
  var plCount = document.getElementById('plCount');

  function prepStrokes() {
    var strokes = preloader ? preloader.querySelectorAll('.k-draw') : [];
    strokes.forEach(function (p) {
      var len = 0;
      try { len = p.getTotalLength(); } catch (e) { len = 300; }
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    return strokes;
  }

  function drawStrokes(strokes) {
    strokes.forEach(function (p, i) {
      setTimeout(function () {
        p.style.transition = 'stroke-dashoffset 0.42s cubic-bezier(0.19,1,0.22,1)';
        p.style.strokeDashoffset = '0';
      }, 120 + i * 80);
    });
  }

  function finishPreload() {
    document.body.classList.remove('locked');
    document.body.classList.add('ready');
    if (preloader) {
      preloader.classList.add('slashed');
      setTimeout(function () { if (preloader.parentNode) preloader.parentNode.removeChild(preloader); }, 1400);
    }
  }

  if (reduced || !preloader || !document.querySelector('.k-draw')) {
    document.body.classList.remove('locked');
    document.body.classList.add('ready');
    if (preloader) preloader.remove();
  } else {
    document.body.classList.add('locked');
    drawStrokes(prepStrokes());

    var t0 = performance.now();
    var DURATION = 1150;
    (function tickCount(now) {
      var p = Math.min((now - t0) / DURATION, 1);
      var val = Math.round(100 * (1 - Math.pow(1 - p, 2.2)));
      plCount.textContent = (val < 10 ? '0' : '') + val;
      if (p < 1) requestAnimationFrame(tickCount);
    })(t0);

    var gun = preloader.querySelector('.pl-gun');

    setTimeout(function fire() {
      preloader.classList.add('fired');
      if (gun) gun.classList.add('kick');
      document.body.classList.add('shake');
    }, DURATION + 350);

    setTimeout(function () { if (gun) gun.classList.remove('kick'); }, DURATION + 530);
    setTimeout(function () { document.body.classList.remove('shake'); }, DURATION + 850);
    setTimeout(finishPreload, DURATION + 780);
  }

  /* ---------- Год и время в футере ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var timeEl = document.getElementById('localTime');
  function tickClock() {
    if (!timeEl) return;
    try {
      timeEl.textContent = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
      }).format(new Date());
    } catch (e) { timeEl.textContent = ''; }
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* ---------- Scroll progress ---------- */
  var progressEl = document.getElementById('progress');
  var nav = document.getElementById('nav');
  function onScroll() {
    if (progressEl) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressEl.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      progressEl.setAttribute('aria-valuenow', Math.round((max > 0 ? window.scrollY / max : 0) * 100));
    }
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобильное меню с focus trap ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  var lastFocusedElement = null;
  function closeMenu() {
    burger.classList.remove('active');
    menu.classList.remove('open');
    menu.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    menu.hidden = !open;
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocusedElement = document.activeElement;
      menu.querySelector('a, button').focus();
    } else {
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    }
  });
  menu.querySelectorAll('a, button').forEach(function (el) {
    el.addEventListener('click', closeMenu);
  });
  // Focus trap для мобильного меню
  menu.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      var focusable = menu.querySelectorAll('a, button');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Reveal при скролле ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- Счётчики статистики ---------- */
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target;
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduced) { el.textContent = target; return; }
      var start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1400, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat b[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- Spotlight за курсором ---------- */
  document.querySelectorAll('.spot').forEach(function (card) {
    card.addEventListener('pointermove', function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });

  /* ============================================================
     ПРОЦЕДУРНАЯ ГРАФИКА КАРТОЧЕК + ЖИВЫЕ МИНИ-ПРЕВЬЮ САЙТОВ
     ============================================================ */
  var DEMOS = {
    coffee: {
      title: "Кофейня «AROMA» · Лендинг Premium",
      desc: "Одностраничный сайт кофейни с собственным обжарочным цехом: меню с ценами, философия бренда, часы работы и контакты. Тёплая палитра и типографика создают ощущение чашки свежего кофе.",
      feats: ["Адаптив под все экраны", "Меню с ценами за 30 минут правок", "Формы и кнопки мессенджеров", "SEO-разметка для картинок и блюд"],
      price: "8 900 ₽", file: "demos/coffee.html", url: "codway.su/demo/aroma-coffee"
    },
    stroi: {
      title: "СтройМонтажГрупп · Корпоративный сайт",
      desc: "Сайт строительной компании в швейцарском стиле: чертёж-панель в герое, пронумерованные услуги с ценами, тёмный блок процесса и живой отзыв клиента с объекта.",
      feats: ["Форма сметы с мгновенным откликом", "Чертёж-визуал вместо стоковой картинки", "Моноширинные цифры и метки", "Конверсионные кнопки в каждом экране"],
      price: "15 900 ₽", file: "demos/stroi.html", url: "codway.su/demo/stroymontazh"
    },
    ai: {
      title: "NeuroRouter · Веб-сервис (API-платформа)",
      desc: "Тёмная developer-платформа доступа к нейросетям через единый API в стиле OpenRouter: терминальный hero с curl-примером, таблица моделей с ценами за токены, тарифы Free/Pro/Enterprise на IBM Plex Sans + JetBrains Mono.",
      feats: ["OpenAI-совместимая документация", "Терминальный блок запроса", "Таблица моделей со статусами live", "Личный кабинет и биллинг (в полной версии)"],
      price: "27 900 ₽", file: "demos/ai.html", url: "codway.su/demo/neurorouter"
    },
    itschool: {
      title: "PRO//КОД · Промо-сайт IT-школы",
      desc: "OLED-тёмный лендинг школы программирования в terminal-стилике: мигающий курсор в логотипе, prompt-строка $ ./start_career, зелёное свечение, курсы как файлы кода и счётчики метрик при скролле.",
      feats: ["Terminal-эстетика и сканлайны", "Счётчики с анимацией чисел", "Marquee-лента технологий", "CTA в виде окна терминала"],
      price: "11 900 ₽", file: "demos/itschool.html", url: "codway.su/demo/prokod"
    },
    transport: {
      title: "ТрансЛогистик · Сайт транспортной компании",
      desc: "Сайт перевозчика в tracking-blue палитре: карточка отслеживания груза прямо в первом экране со статусом «в пути», тарифная сетка с ховером и три гарантии с иконками.",
      feats: ["Живой трекинг накладной в герое", "Тарифная таблица с ховером строк", "Статус-бар груза с пульсацией", "Моноширинные номера и ставки"],
      price: "22 900 ₽", file: "demos/transport.html", url: "codway.su/demo/translogistic"
    },
    cs2: {
      title: "HEADSHOT // Форум CS2 · Сайт «под ключ»",
      desc: "Киберспортивный форум в неон-пурпуре на шрифтах Russo One + Chakra Petch: сетка-фон, турнирный баннер WINTER CUP со sweep-бликом, темы с тегами HOT/PIN и счётчиками просмотров.",
      feats: ["Шрифты Russo One / Chakra Petch", "Баннер турнира со sweep-анимацией", "Строки тем с ховер-подъёмом", "Разделы-фильтры и поиск"],
      price: "32 900 ₽", file: "demos/cs2.html", url: "codway.su/demo/headshot-cs2"
    }
  };
  /* Готовые приложения: данные для окна покупки (демо-режим у приложений отключён) */
  var APP_PRODUCTS = {
    "SoundPad Pro (приложение)": { name: "SoundPad Pro", price: "4 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Все 12 пэдов, voice-эффекты и усилитель ×4", "Настройка под ваш стрим/подкаст + инструкция", "Обновления и поддержка 3 месяца"] },
    "AI Assistant (приложение .exe)": { name: "AI Assistant", price: "3 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Пресеты «урок / помощник / vision / код» + ваш API-ключ", "Голосовой ввод (Whisper), озвучка, вставка скриншотов", "Обновления и поддержка 3 месяца"] },
    "NoteFlow (приложение)": { name: "NoteFlow", price: "2 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Импорт заметок, настройка папок и шаблонов", "Экспорт в .md / .pdf, бэкап в JSON — всё локально", "Обновления и поддержка 3 месяца"] },
    "ClipMaster (приложение)": { name: "ClipMaster", price: "2 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Настройка папок, закреплений и шаблонов под ваши задачи", "Шифрование паролей и авто-сортировка включены", "Обновления и поддержка 3 месяца"] },
    "FocusPomodoro (приложение)": { name: "FocusPomodoro", price: "1 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Пресеты блокировок под ваши сервисы + белый список", "Жёсткий режим с защитой от обхода и перезагрузки", "Обновления и поддержка 3 месяца"] },
    "TimeTrack (приложение)": { name: "TimeTrack", price: "3 900 ₽",
      includes: ["Исходники и готовая сборка .exe под Windows", "Настройка проектов и авто-категорий под ваш стек", "Шаблон отчётов PDF/Excel под ваш формат", "Обновления и поддержка 3 месяца"] }
  };
  /* Готовые сайты: данные для окна покупки (переиспользуем описание демо-стенда) */
  var SITE_PRODUCTS = {
    "Лендинг Premium (сайт)": { name: "Лендинг Premium", price: "8 900 ₽", cat: "сайт",
      includes: ["Готовый сайт на вашем домене и хостинге", "Адаптив под все экраны", "Формы заявок с интеграцией CRM", "SEO-оптимизация и адаптация под ваш бренд"] },
    "Корпоративный сайт (сайт)": { name: "Корпоративный сайт", price: "15 900 ₽", cat: "сайт",
      includes: ["Готовый сайт на вашем домене и хостинге", "До 20 страниц с удобной CMS для контента", "Мультиязычность по запросу", "Адаптация под ваш бренд включена"] },
    "Промо-сайт (сайт)": { name: "Промо-сайт", price: "11 900 ₽", cat: "сайт",
      includes: ["Готовый сайт на вашем домене и хостинге", "Кинематографичные анимации и сторителлинг", "Формы захвата заявок и трекинг конверсий", "Запуск за 7 дней от старта работ"] },
    "Интернет-магазин (сайт)": { name: "Интернет-магазин", price: "22 900 ₽", cat: "сайт",
      includes: ["Готовый магазин на вашем домене и хостинге", "Каталог, умные фильтры и карточки товаров", "Приём онлайн-оплаты и управление складом", "Адаптация под ваш бренд и ассортимент включена"] },
    "Веб-сервис или портал (сайт)": { name: "Веб-сервис / портал", price: "27 900 ₽", cat: "сайт",
      includes: ["Готовый сервис на вашем домене и хостинге", "Роли, права доступа и личные кабинеты", "Интеграции по API с внешними системами", "Расчёт на высокие нагрузки и рост аудитории"] },
    "Сайт «под ключ» (сайт)": { name: "Сайт «под ключ»", price: "32 900 ₽", cat: "сайт",
      includes: ["Готовый сайт на вашем домене и хостинге", "Копирайтинг, контент и фирменный стиль", "Полная адаптация под ваш бренд включена", "Поддержка 3 месяца после запуска"] }
  };
  /* Готовые Telegram-боты: данные для окна покупки */
  var BOT_PRODUCTS = {
    "Video Downloader (бот)": { name: "Video Downloader", price: "6 900 ₽", cat: "бот",
      includes: ["Готовый бот, подключённый к вашему Telegram", "Скачивание до 4K60 HDR с 5 платформ", "MP3-режим и плейлисты одним запросом", "Обновления и поддержка 3 месяца"] },
    "AI-модератор групп (бот)": { name: "AI-модератор групп", price: "9 900 ₽", cat: "бот",
      includes: ["Готовый бот, подключённый к вашей группе", "Фильтры мата, спама и капча на входе", "Автоматические варны → мут → бан", "Обновления и поддержка 3 месяца"] },
    "AI-менеджер продаж (бот)": { name: "AI-менеджер продаж", price: "13 900 ₽", cat: "бот",
      includes: ["Готовый бот, подключённый к вашему Telegram", "Отвечает клиентам по вашей базе знаний 24/7", "Заявки автоматически летят вам в админку", "Обновления и поддержка 3 месяца"] },
    "Магазин в Telegram (бот)": { name: "Магазин в Telegram", price: "9 900 ₽", cat: "бот",
      includes: ["Готовый бот-магазин, подключённый к вашему Telegram", "Каталог, корзина и приём оплаты", "Промокоды и уведомления о заказах", "Обновления и поддержка 3 месяца"] },
    "Бот записи клиентов (бот)": { name: "Бот записи клиентов", price: "6 900 ₽", cat: "бот",
      includes: ["Готовый бот, подключённый к вашему Telegram", "Свободные слоты и расписание в два тапа", "Автонапоминания и сбор отзывов", "Обновления и поддержка 3 месяца"] },
    "Бот-поддержка (бот)": { name: "Бот-поддержка", price: "5 900 ₽", cat: "бот",
      includes: ["Готовый бот, подключённый к вашему Telegram", "База знаний и ответы на частые вопросы 24/7", "Тикеты в админку и эскалация оператору", "Обновления и поддержка 3 месяца"] }
  };
  var CAT_LABEL = { "сайт": "Сайт", "бот": "Telegram-бот", "приложение": "Приложение" };
  function findProduct(key) {
    return SITE_PRODUCTS[key] || BOT_PRODUCTS[key] || (APP_PRODUCTS[key] ? Object.assign({ cat: "приложение" }, APP_PRODUCTS[key]) : null);
  }
  /* Telegram-боты: интерактивный симулятор */
  var TG_FILES={vdmax:"dl.html",aimod:"aimod.html",aisales:"aisales.html",shop:"shop.html",booker:"booker.html",support:"support.html"};
  var TG_BOTS = {
    vdmax:{title:"Video Downloader · Telegram-бот",desc:"Скачивает видео с YouTube, VK, RuTube, TikTok и Telegram в максимальном качестве до 4K60 — файлом прямо в чат. MP3-режим и плейлисты включены.",feats:["5 платформ","До 4K60 HDR + MP3","Плейлисты одним запросом"],price:"6 900 ₽",url:"t.me/videodownloader_max_bot",file:"demos/bots/dl.html"},
    aimod:{title:"AI-модератор групп · Telegram-бот",desc:"Цензурирует мат и оскорбления, режет ссылки-спам, встречает новичков капчей, ведёт варны и автоматически мутирует/банит нарушителей.",feats:["Фильтры мата/спама/капса","Капча на входе","Варны → мут → бан"],price:"9 900 ₽",url:"t.me/ai_moderator_codway_bot",file:"demos/bots/aimod.html"},
    aisales:{title:"AI-менеджер продаж · Telegram-бот",desc:"Отвечает клиентам в личке или группе по вашей базе знаний, квалифицирует потребность и присылает готовую заявку вам в админку CodWay.",feats:["Отвечает 24/7 по базе знаний","Заявки летят в админку","Скидки по сценарию"],price:"13 900 ₽",url:"t.me/ai_sales_codway_bot",file:"demos/bots/aisales.html"},
    shop:{title:"Магазин в Telegram",desc:"Каталог с карточками товаров, корзина, промокоды, приём оплаты и уведомления о заказах — весь магазин внутри мессенджера.",feats:["Каталог и корзина","Оплата и чеки","Уведомления о заказах"],price:"9 900 ₽",url:"t.me/shop_codway_bot",file:"demos/bots/shop.html"},
    booker:{title:"Бот записи клиентов · Telegram-бот",desc:"Свободные слоты в два тапа, автонапоминания за 24 часа и 2 часа до визита, сбор отзывов после обслуживания.",feats:["Слоты и расписание","Напоминания 24ч/2ч","Сбор отзывов"],price:"6 900 ₽",url:"t.me/booker_codway_bot",file:"demos/bots/booker.html"},
    support:{title:"Бот-поддержка · Telegram-бот",desc:"Отвечает на типовые вопросы клиентов из вашей базы знаний 24/7, принимает тикеты и эскалирует сложные случаи оператору — ни один вопрос не теряется.",feats:["База знаний и FAQ","Тикеты в админку","Эскалация оператору"],price:"5 900 ₽",url:"t.me/support_codway_bot",file:"demos/bots/support.html"}
  };
  function hashCode(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var visuals = [];
  var shots = [];
  function drawPattern(canvas, seedStr) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.parentNode.offsetWidth || 320;
    var h = canvas.parentNode.offsetHeight || 116;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var rnd = mulberry32(hashCode(seedStr));
    var style = parseInt(seedStr.replace(/\D/g, ''), 10) % 6;
    var a;

    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    if (style === 0) {                       /* точечная матрица */
      var gap = 16;
      for (var x = gap; x < w; x += gap) {
        for (var y = gap; y < h; y += gap) {
          a = rnd();
          if (a > 0.45) continue;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + rnd() * 0.4).toFixed(2) + ')';
          var r = rnd() > 0.9 ? 2.4 : 1.1;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === 1) {                /* диагональная штриховка */
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      for (var d = -h; d < w + h; d += 9 + rnd() * 8) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + h, h);
        ctx.globalAlpha = 0.35 + rnd() * 0.65;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (style === 2) {                /* концентрические окружности */
      var cx = w * (0.25 + rnd() * 0.5);
      var cy = h * (0.3 + rnd() * 0.4);
      for (var rr = 6; rr < w * 0.7; rr += 7 + rnd() * 9) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + rnd() * 0.3).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (style === 3) {                /* вертикальные бары */
      var bw = 5 + rnd() * 6;
      for (var bx = 6; bx < w - 6; bx += bw + 5 + rnd() * 10) {
        var bh = h * (0.15 + rnd() * 0.7);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.08 + rnd() * 0.3).toFixed(2) + ')';
        ctx.fillRect(bx, h - bh - 4, bw, bh);
      }
    } else if (style === 4) {                /* синус-волны */
      for (var l = 0; l < 5; l++) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + rnd() * 0.28).toFixed(2) + ')';
        ctx.lineWidth = 1;
        var amp = 6 + rnd() * 14;
        var frq = 0.02 + rnd() * 0.04;
        var ph = rnd() * 6.283;
        ctx.beginPath();
        for (var px = 0; px <= w; px += 3) {
          var py = h / 2 + Math.sin(px * frq + ph + l) * amp * (l * 0.35 + 0.5);
          px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else {                                  /* сетка крестов */
      var g2 = 26;
      for (var xx = g2; xx < w; xx += g2) {
        for (var yy = g2 / 2; yy < h; yy += g2) {
          if (rnd() > 0.55) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + rnd() * 0.35).toFixed(2) + ')';
          ctx.lineWidth = 1;
          var s2 = 2.5 + rnd() * 3;
          ctx.beginPath();
          ctx.moveTo(xx - s2, yy); ctx.lineTo(xx + s2, yy);
          ctx.moveTo(xx, yy - s2); ctx.lineTo(xx, yy + s2);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(w - 20, h - 18, 24, 1);
  }

  /* Сайты с демо получают живой мини-скриншот (масштабированный iframe),
     остальные карточки — процедурный монохромный узор.
     Карточки с .p-cover (своя обложка) пропускаются — иначе авто-p-shot
     дублирует визуал поверх ручной обложки. */
  var cardsAll = document.querySelectorAll('.product-card');
  cardsAll.forEach(function (card, idx) {
    /* Skip cards that have a custom cover — they bring their own visual. */
    if (card.querySelector('.p-cover')) return;
    var vis = document.createElement('div');
    vis.setAttribute('aria-hidden', 'true');
    card.insertBefore(vis, card.firstChild);

    var demoKey = card.getAttribute('data-demo');
    if (demoKey && DEMOS[demoKey]) {
      vis.className = 'p-shot';
      var fr = document.createElement('iframe');
      fr.title = 'Мини-превью сайта';
      fr.loading = 'lazy';
      fr.tabIndex = -1;
      vis.appendChild(fr);
      shots.push({ holder: vis, frame: fr, file: DEMOS[demoKey].file });
    } else {
      vis.className = 'p-visual';
      var cv = document.createElement('canvas');
      vis.appendChild(cv);
      var seed = idx + '|' + (card.querySelector('h3') || {}).textContent;
      visuals.push({ canvas: cv, seed: seed });
    }
  });

  function fitShots() {
    shots.forEach(function (s) {
      var w = s.holder.offsetWidth || 320;
      var hgt = s.holder.offsetHeight || 152;
      var sc = w / 1080;
      s.frame.style.width = '1080px';
      s.frame.style.height = Math.round(hgt / sc) + 'px';
      s.frame.style.transform = 'scale(' + sc + ')';
    });
  }
  function redrawVisuals() {
    fitShots();
    visuals.forEach(function (v) { drawPattern(v.canvas, v.seed); });
  }
  redrawVisuals();
  var rsTimer;
  window.addEventListener('resize', function () {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(redrawVisuals, 200);
  }, { passive: true });

  /* Ленивая загрузка мини-превью — только когда карточка близко к экрану */
  var shotIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      shotIO.unobserve(e.target);
      var rec = shots.find(function (s) { return s.holder === e.target; });
      if (rec && !rec.frame.src) rec.frame.src = rec.file;
    });
  }, { rootMargin: '300px' });
  shots.forEach(function (s) { shotIO.observe(s.holder); });

  /* ============================================================
     КАТАЛОГ: табы + переходы из категорий/тегов
     ============================================================ */
  var tabs = document.querySelectorAll('.tab');
  var cards = document.querySelectorAll('.product-card');
  function applyFilter(filter) {
    cards.forEach(function (c) {
      var show = filter === 'all' || c.getAttribute('data-cat') === filter;
      c.classList.toggle('card-hidden', !show);
      if (show && !reduced) {
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = '';
      }
    });
    var grid = document.getElementById('productGrid');
    if (grid) {
      grid.classList.toggle('app-view', filter === 'app');
    }
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      applyFilter(t.getAttribute('data-filter'));
    });
  });
  document.querySelectorAll('[data-goto-cat]').forEach(function (link) {
    link.addEventListener('click', function () {
      var cat = link.getAttribute('data-goto-cat');
      tabs.forEach(function (x) {
        x.classList.toggle('active', x.getAttribute('data-filter') === cat);
      });
      applyFilter(cat);
    });
  });

  /* ============================================================
     DEMO VIEWER — описание + живой предпросмотр в браузер-окне
     ============================================================ */
  var demoBackdrop = document.getElementById('demoBackdrop');
  var dmFrame = document.getElementById('dmFrame');
  var dmHolder = document.getElementById('dmHolder');
  var currentDemoFile = '';
  var lastDemoIsTg = false;
  var currentDemoBuyKey = '';

  /* ---------- Управление фокусом в диалогах ----------
     Диалоги не должны выпускать фокус на страницу под ними: иначе
     клавиатурный пользователь теряет контекст формы или демо. */
  var activeDialog = null;
  var dialogSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openDialog(dialog, initialFocus) {
    if (!dialog) return;
    dialog._returnFocus = document.activeElement;
    dialog._previousDialog = activeDialog;
    if (activeDialog) {
      activeDialog.setAttribute('inert', '');
      activeDialog.setAttribute('aria-hidden', 'true');
    }
    activeDialog = dialog;
    dialog.classList.add('open');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var target = initialFocus || dialog.querySelector(dialogSelector);
      if (target && typeof target.focus === 'function') target.focus();
    }, 340);
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    dialog.classList.remove('open');
    dialog.setAttribute('aria-hidden', 'true');
    if (activeDialog === dialog) activeDialog = dialog._previousDialog || null;
    if (activeDialog) {
      activeDialog.removeAttribute('inert');
      activeDialog.setAttribute('aria-hidden', 'false');
    }
    if (!activeDialog || !activeDialog.classList.contains('open')) document.body.style.overflow = '';
    var returnFocus = dialog._returnFocus;
    dialog._returnFocus = null;
    setTimeout(function () {
      if (returnFocus && document.contains(returnFocus) && typeof returnFocus.focus === 'function') {
        returnFocus.focus();
      }
    }, 0);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !activeDialog || !activeDialog.classList.contains('open')) return;
    var focusable = Array.prototype.slice.call(activeDialog.querySelectorAll(dialogSelector))
      .filter(function (el) {
        var style = window.getComputedStyle(el);
        return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
      });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Демо-ключ → ключ товара в каталоге (для кнопки «Купить такой …» в окне демо) */
  var DEMO_BUYKEY = {
    coffee: "Лендинг Premium (сайт)",
    stroi: "Корпоративный сайт (сайт)",
    ai: "Веб-сервис или портал (сайт)",
    itschool: "Промо-сайт (сайт)",
    transport: "Интернет-магазин (сайт)",
    cs2: "Сайт «под ключ» (сайт)",
    vdmax: "Video Downloader (бот)",
    aimod: "AI-модератор групп (бот)",
    aisales: "AI-менеджер продаж (бот)",
    shop: "Магазин в Telegram (бот)",
    booker: "Бот записи клиентов (бот)",
    support: "Бот-поддержка (бот)"
  };

  function openDemo(key) {
    var isTg = key.indexOf('tg:') === 0;
    var botKey = isTg ? key.slice(3) : null;
    var d = isTg ? TG_BOTS[botKey] : DEMOS[key];
    if (!d) return;
    document.getElementById('dmTitle').textContent = d.title;
    document.getElementById('dmDesc').textContent = d.desc;
    document.getElementById('dmPrice').textContent = d.price;
    document.getElementById('dmUrl').textContent = d.url || (isTg ? 't.me/' + botKey + '_bot' : 'codway.su/demo');
    var ul = document.getElementById('dmFeats');
    ul.innerHTML = '';
    d.feats.forEach(function (f) {
      var li = document.createElement('li');
      li.textContent = f;
      ul.appendChild(li);
    });
    var file = isTg ? (d.file || "demos/bots/" + (TG_FILES[botKey] || "dl.html")) : d.file;
    currentDemoFile = file;
    lastDemoIsTg = !!isTg;
    currentDemoBuyKey = DEMO_BUYKEY[isTg ? botKey : key] || '';
    dmFrame.src = file;
    setDevice(isTg ? 'narrow' : 'wide');
    var dmOrderBtn = document.getElementById('dmOrder');
    if (dmOrderBtn) {
      if (isTg) dmOrderBtn.textContent = 'Купить такого бота';
      else dmOrderBtn.textContent = 'Купить такой сайт';
    }
    openDialog(demoBackdrop, document.getElementById('demoClose'));
  }

  function closeDemo() {
    closeDialog(demoBackdrop);
    setTimeout(function () { dmFrame.src = 'about:blank'; }, 350);
  }

  function setDevice(mode) {
    dmHolder.classList.toggle('narrow', mode === 'narrow');
    document.querySelectorAll('.dev-btn[data-w]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-w') === mode);
    });
  }

  document.getElementById('demoClose').addEventListener('click', closeDemo);
  demoBackdrop.addEventListener('click', function (e) {
    if (e.target === demoBackdrop) closeDemo();
  });
  document.querySelectorAll('.dev-btn[data-w]').forEach(function (b) {
    b.addEventListener('click', function () { setDevice(b.getAttribute('data-w')); });
  });
  document.getElementById('dmReload').addEventListener('click', function () {
    if (currentDemoFile) {
      // force reload even if same src
      var src = currentDemoFile;
      dmFrame.src = 'about:blank';
      setTimeout(function(){ dmFrame.src = src; }, 50);
    }
  });
  document.getElementById('dmOrder').addEventListener('click', function () {
    closeDemo();
    var key = currentDemoBuyKey;
    var type = lastDemoIsTg ? 'бот' : 'сайт';
    setTimeout(function () {
      if (key && findProduct(key)) openBuy(key);
      else openOrder('Заказать разработку', type);
    }, 250);
  });

  document.querySelectorAll('[data-demo-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openDemo(btn.getAttribute('data-demo-open'));
    });
  });
  document.querySelectorAll('.product-card[data-demo] .p-shot, .product-card[data-demo] .p-visual').forEach(function (vis) {
    vis.addEventListener('click', function () {
      var key = vis.closest('.product-card').getAttribute('data-demo');
      openDemo(key);
    });
    vis.style.cursor = 'pointer';
  });

  /* ============================================================
     МОДАЛКА ЗАКАЗА
     ============================================================ */
  var backdrop = document.getElementById('orderBackdrop');
  var orderForm = document.getElementById('orderForm');
  var omTitle = document.getElementById('omTitle');
  var oType = document.getElementById('oType');
  var oDesc = document.getElementById('oDesc');
  var oBudget = document.getElementById('oBudget');
  var oDeadline = document.getElementById('oDeadline');
  var oLinks = document.getElementById('oLinks');
  var oStyle = document.getElementById('oStyle');
  var oExtras = document.getElementById('oExtras');
  var oRebrand = document.getElementById('oRebrand');
  var oConsent = document.getElementById('oConsent');

  /* ---------- Попап закона 152-ФЗ ---------- */
  var lawBackdrop = document.getElementById('lawBackdrop');
  function openLaw() {
    openDialog(lawBackdrop, document.getElementById('lawClose'));
  }
  function closeLaw() {
    closeDialog(lawBackdrop);
  }
  document.querySelectorAll('.consent-text').forEach(function (el) {
    el.addEventListener('click', openLaw);
    if (el.tagName === 'BUTTON') return;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLaw(); }
    });
  });
  document.getElementById('lawClose').addEventListener('click', closeLaw);
  document.getElementById('lawAccept').addEventListener('click', function () {
    if (oConsent) oConsent.checked = true;
    if (bConsent) bConsent.checked = true;
    closeLaw();
  });
  lawBackdrop.addEventListener('click', function (e) {
    if (e.target === lawBackdrop) closeLaw();
  });
  var oName = document.getElementById('oName');
  var oContact = document.getElementById('oContact');

  /* ---------- Character counter для textarea ---------- */
  var oDescCount = document.getElementById('oDescCount');
  if (oDesc && oDescCount) {
    oDesc.addEventListener('input', function () {
      oDescCount.textContent = oDesc.value.length;
    });
  }

  /* ---------- Form validation feedback ---------- */
  var formInputs = orderForm.querySelectorAll('input[required], select[required], textarea[required]');
  formInputs.forEach(function (input) {
    input.addEventListener('blur', function () {
      if (input.required && !input.value.trim()) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    });
    input.addEventListener('input', function () {
      if (input.value.trim()) {
        input.removeAttribute('aria-invalid');
      }
    });
  });

  function openOrder(titleText, typeVal) {
    omTitle.textContent = titleText || 'Заказать разработку';
    if (typeVal && oType.querySelector('option[value="' + typeVal + '"]')) {
      oType.value = typeVal;
    }
    // Сброс валидации при открытии
    formInputs.forEach(function (input) {
      input.removeAttribute('aria-invalid');
    });
    if (oDescCount) oDescCount.textContent = oDesc.value.length;
    openDialog(backdrop, oDesc);
  }

  function closeOrder() {
    closeDialog(backdrop);
  }

  document.getElementById('orderClose').addEventListener('click', closeOrder);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeOrder();
  });

  orderForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!oConsent.checked) {
      oConsent.focus();
      openLaw();
      return;
    }
    var payload = {
      kind: 'custom',
      hp_url: (orderForm.querySelector('[name="hp_url"]') || {}).value || '',
      form_ms: Date.now() - pageT0,
      source: omTitle.textContent,
      type: oType.value,
      description: oDesc.value.trim(),
      budget: (oBudget.value || '').trim() || 'не указан',
      deadline: oDeadline ? oDeadline.value : '',
      links: (oLinks && oLinks.value || '').trim(),
      style: (oStyle && oStyle.value || '').trim(),
      extras: (oExtras && oExtras.value || '').trim(),
      rebrand: !!(oRebrand && oRebrand.checked),
      consent: true,
      name: oName.value.trim(),
      contact: oContact.value.trim()
    };
    if (!payload.description || !payload.name || !payload.contact) return;
    clearFormError(orderForm);
    submitOrder(payload, {
      successEl: document.getElementById('orderSuccess'),
      form: orderForm,
      close: closeOrder,
      onError: function () { showFormError(orderForm); }
    });
  });

  document.querySelectorAll('[data-order-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeMenu();
      openOrder(null, null);
    });
  });

  var catMap = { site: 'сайт', bot: 'бот', app: 'приложение' };
  document.querySelectorAll('.btn-buy[data-product]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-product');
      if (findProduct(key)) {
        openBuy(key);
        return;
      }
      var card = btn.closest('.product-card');
      var cat = card ? card.getAttribute('data-cat') : null;
      openOrder('Заказать «' + key + '»', cat ? catMap[cat] : null);
    });
  });

  /* ============================================================
     МОДАЛКА ПОКУПКИ ГОТОВОГО ПРИЛОЖЕНИЯ
     ============================================================ */
  var buyBackdrop = document.getElementById('buyBackdrop');
  var buyForm = document.getElementById('buyForm');
  var bmTitle = document.getElementById('bmTitle');
  var buyName = document.getElementById('buyName');
  var buyPrice = document.getElementById('buyPrice');
  var buyIncludes = document.getElementById('buyIncludes');
  var bComment = document.getElementById('bComment');
  var bName = document.getElementById('bName');
  var bContact = document.getElementById('bContact');
  var bConsent = document.getElementById('bConsent');
  var bCustomize = document.getElementById('bCustomize');
  var buyTypeLabel = document.getElementById('buyTypeLabel');
  var buyNote = document.getElementById('buyNote');
  var currentProduct = null;

  function openBuy(productKey) {
    var p = findProduct(productKey);
    if (!p) return;
    currentProduct = { key: productKey, name: p.name, price: p.price, cat: p.cat || 'приложение' };
    bmTitle.textContent = 'Купить «' + p.name + '»';
    buyName.textContent = p.name;
    buyPrice.textContent = p.price;
    if (buyTypeLabel) buyTypeLabel.textContent = CAT_LABEL[currentProduct.cat] || 'Готовое решение';
    if (buyNote) {
      var deliveryWord = currentProduct.cat === 'сайт' ? 'Запуск' : 'Выдача';
      buyNote.textContent = 'Мы подтвердим заказ, пришлём реквизиты для оплаты и передадим файлы. ' + deliveryWord + ' — в течение 24 часов.';
    }
    // Сброс блока доработки к скрытому состоянию
    if (bCustomize) bCustomize.checked = false;
    var cd = document.getElementById('bCustomizeDetail');
    if (cd) cd.hidden = true;
    clearFormError(buyForm);
    buyIncludes.innerHTML = '';
    p.includes.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      buyIncludes.appendChild(li);
    });
    buyForm.querySelectorAll('input, textarea').forEach(function (el) {
      el.removeAttribute('aria-invalid');
    });
    openDialog(buyBackdrop, bName);
  }

  /* Чекбокс «нужна доработка» раскрывает поле с деталями */
  if (bCustomize) {
    bCustomize.addEventListener('change', function () {
      var d = document.getElementById('bCustomizeDetail');
      if (d) d.hidden = !bCustomize.checked;
      if (bCustomize.checked && bComment) {
        setTimeout(function () { try { bComment.focus(); } catch (e) {} }, 60);
      }
    });
  }

  function closeBuy() {
    closeDialog(buyBackdrop);
  }

  document.getElementById('buyClose').addEventListener('click', closeBuy);
  buyBackdrop.addEventListener('click', function (e) {
    if (e.target === buyBackdrop) closeBuy();
  });

  buyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!bConsent.checked) {
      bConsent.focus();
      openLaw();
      return;
    }
    if (!currentProduct) return;
    var comment = (bComment.value || '').trim();
    var customize = !!(bCustomize && bCustomize.checked);
    var payload = {
      kind: 'ready',
      product: currentProduct.name,
      hp_url: (buyForm.querySelector('[name="hp_url"]') || {}).value || '',
      form_ms: Date.now() - pageT0,
      source: 'Купить «' + currentProduct.name + '»',
      type: currentProduct.cat || 'приложение',
      description: 'Покупка готового решения «' + currentProduct.name + '» (' + (CAT_LABEL[currentProduct.cat] || 'приложение') + ') за ' + currentProduct.price +
        (comment ? '. Комментарий: ' + comment : '') +
        (customize ? '. Клиент отметил: нужна доработка/адаптация под себя (входит в стоимость).' : ''),
      budget: currentProduct.price,
      deadline: '24 часа',
      links: '', style: '', extras: comment, rebrand: false, customize: customize,
      consent: true,
      name: bName.value.trim(),
      contact: bContact.value.trim()
    };
    if (!payload.name || !payload.contact) return;
    clearFormError(buyForm);
    submitOrder(payload, {
      successEl: document.getElementById('buySuccess'),
      form: buyForm,
      close: closeBuy,
      onError: function () { showFormError(buyForm); }
    });
  });

  document.querySelectorAll('[data-chat-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeMenu();
      openOrder(null, null);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lawBackdrop.classList.contains('open')) { closeLaw(); return; }
      if (demoBackdrop.classList.contains('open')) { closeDemo(); return; }
      if (backdrop.classList.contains('open')) closeOrder();
      if (buyBackdrop.classList.contains('open')) closeBuy();
    }
  });

  /* ---------- Звёздное небо (оптимизировано для мобильных) ---------- */
  var canvas = document.getElementById('fx');
  var isMobile = /Mobi|Android/i.test(navigator.userAgent);
  var isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  if (!reduced && !isMobile && !isLowEnd) initParticles(canvas);

  function initParticles(cv) {
    var ctx = cv.getContext('2d');
    var W, H, parts = [], running = true, raf;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = window.innerWidth * dpr;
      H = cv.height = window.innerHeight * dpr;
      cv.style.width = window.innerWidth + 'px';
      cv.style.height = window.innerHeight + 'px';
      seed();
    }
    function seed() {
      // Меньше частиц на больших экранах, но не слишком много
      var baseCount = Math.max(30, Math.min(120, Math.round((W * H) / (dpr2() * 12000))));
      parts = [];
      for (var i = 0; i < baseCount; i++) {
        parts.push(newStar(true));
      }
    }
    function dpr2() { return Math.min(window.devicePixelRatio || 1, 2); }
    function newStar(anyY) {
      return {
        x: Math.random(),
        y: anyY ? Math.random() : 1.02,
        r: 0.4 + Math.random() * 1.0,
        vy: 0.00015 + Math.random() * 0.00035,
        vx: (Math.random() - 0.5) * 0.00005,
        a: 0.1 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2
      };
    }
    resize();
    window.addEventListener('resize', function () {
      clearTimeout(cv._rst);
      cv._rst = setTimeout(resize, 200);
    }, { passive: true });

    var lastFrame = 0;
    function frame(t) {
      if (!running) return;
      // Ограничение FPS до 30 для экономии батареи
      if (t - lastFrame < 33) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrame = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy;
        p.x += p.vx;
        if (p.y < -0.02) { parts[i] = newStar(false); continue; }
        if (p.x < -0.02 || p.x > 1.02) p.x = Math.random();
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.0013 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (p.a * tw).toFixed(3) + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    });

    raf = requestAnimationFrame(frame);
  }

  /* ---------- Премиальные микро-интеракции: магнитные кнопки + спотлайт на карточках ---------- */
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Спотлайт: мягкое свечение в акцентном цвете карточки, следующее за курсором.
  // Элемент .p-spot всегда добавляется (даже без наведения мышью работает как
  // ровное подсвечивание центра карточки за счёт CSS-фолбэка 50%/50%), а слежение
  // за курсором включаем только на устройствах с настоящим hover, чтобы не грузить
  // тачскрины и уважать prefers-reduced-motion.
  document.querySelectorAll('.product-card').forEach(function (card) {
    var spot = document.createElement('span');
    spot.className = 'p-spot';
    spot.setAttribute('aria-hidden', 'true');
    card.appendChild(spot);
    if (canHover && !reduced) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      });
    }
  });

  // (Магнитные кнопки убраны — CTA больше не «тянутся» за курсором.)
})();
