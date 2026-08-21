export type CategoryId = "sites" | "bots" | "apps" | "roblox" | "other";
export type ProductKind = "ready" | "custom";
export type DemoId = "shop-bot" | "ticket-bot" | "quiz-bot" | "site-frame";

export type Category = {
  id: CategoryId;
  label: string;
  short: string;
  blurb: string;
  readyTitle: string;
  customTitle: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "sites",
    label: "Сайты",
    short: "Сайты",
    blurb: "Лендинги, магазины, портфолио.",
    readyTitle: "Готовые сайты",
    customTitle: "Сайт на заказ",
  },
  {
    id: "bots",
    label: "Боты",
    short: "Боты",
    blurb: "Магазины, билеты, квизы, поддержка.",
    readyTitle: "Готовые Telegram-боты",
    customTitle: "Бот на заказ",
  },
  {
    id: "apps",
    label: "Приложения",
    short: "Приложения",
    blurb: "PWA и веб-сервисы.",
    readyTitle: "Готовые приложения",
    customTitle: "Приложение на заказ",
  },
  {
    id: "roblox",
    label: "Roblox",
    short: "Roblox",
    blurb: "Обби, тайкуны, гонки, симуляторы.",
    readyTitle: "Готовые Roblox-игры",
    customTitle: "Roblox на заказ",
  },
  {
    id: "other",
    label: "Другое",
    short: "Другое",
    blurb: "Парсеры, мини-CRM, автоматизация.",
    readyTitle: "Готовое — другое",
    customTitle: "Другое на заказ",
  },
];

export function getCategory(id: string | undefined) {
  return CATEGORIES.find((c) => c.id === id);
}

export function parseCatalogSearch(search: Record<string, unknown>): {
  cat?: CategoryId;
  kind?: ProductKind;
} {
  const cat = CATEGORIES.some((c) => c.id === search.cat)
    ? (search.cat as CategoryId)
    : undefined;
  const kind = search.kind === "ready" || search.kind === "custom" ? search.kind : undefined;
  return { cat, kind };
}

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: CategoryId;
  kind: ProductKind;
  price: number;
  oldPrice?: number;
  timeline: string;
  features: string[];
  stack: string[];
  includes: string[];
  popular?: boolean;
  isNew?: boolean;
  demo?: DemoId;
};

export const PRODUCTS: Product[] = [
  {
    slug: "pulseshop",
    name: "PulseShop",
    tagline: "Магазин в Telegram за вечер",
    description:
      "Каталог, корзина, заявки админу и оплата. Готовый бот для небольшого магазина — без студии и без ожидания недель.",
    longDescription:
      "PulseShop — готовый магазин в Telegram. Покупатель листает категории, кладёт товар в корзину и оставляет заявку или оплачивает. Админ получает заказ в чат, меняет наличие и рассылает статусы. Исходники отдаём сразу после оплаты, помогаем залить на ваш бот.",
    category: "bots",
    kind: "ready",
    price: 1490,
    oldPrice: 7900,
    timeline: "в день оплаты",
    popular: true,
    demo: "shop-bot",
    features: [
      "Каталог с фото, ценой и остатком",
      "Корзина и оформление заказа",
      "Админ-панель в Telegram",
      "Уведомления о новых заказах",
      "Готовый текст и кнопки на русском",
    ],
    stack: ["Python", "aiogram 3", "SQLite"],
    includes: ["Исходный код", "Инструкция запуска", "1 правка под товары"],
  },
  {
    slug: "ticketgate",
    name: "TicketGate",
    tagline: "Билеты и QR на вход",
    description:
      "События, покупка билета, уникальный QR и проверка на входе. Для вечеринок, лекций и маленьких площадок.",
    longDescription:
      "TicketGate продаёт билеты прямо в Telegram. Каждый билет — уникальный QR. На входе волонтёр сканирует кодом из бота-сканера. Есть лимит мест, промокоды и выгрузка гостей.",
    category: "bots",
    kind: "ready",
    price: 1290,
    oldPrice: 6500,
    timeline: "в день оплаты",
    demo: "ticket-bot",
    isNew: true,
    features: [
      "Карточки событий и слоты",
      "QR-билет в чат",
      "Сканер для охраны",
      "Лимит мест и промокоды",
      "Список гостей в CSV",
    ],
    stack: ["Python", "aiogram 3", "SQLite"],
    includes: ["Бот продаж", "Бот-сканер", "Инструкция"],
  },
  {
    slug: "quizstorm",
    name: "QuizStorm",
    tagline: "Квиз, конкурс, розыгрыш",
    description:
      "Викторина с таймером, таблицей лидеров и призом. Для каналов, школ и брендов, которым нужна активность.",
    longDescription:
      "QuizStorm поднимает активность в канале: вопросы, античит по времени, таблица лидеров и выдача приза победителю. Админ загружает вопросы файлом.",
    category: "bots",
    kind: "ready",
    price: 990,
    oldPrice: 4900,
    timeline: "в день оплаты",
    demo: "quiz-bot",
    features: [
      "Вопросы из файла",
      "Таймер и антиспам",
      "Таблица лидеров",
      "Выдача приза",
      "Рассылка анонса в канал",
    ],
    stack: ["Python", "aiogram 3"],
    includes: ["Код", "Пример пакета вопросов", "Инструкция"],
  },
  {
    slug: "nightlist",
    name: "NightList",
    tagline: "Лист на вечеринку",
    description:
      "Запись гостей, лист на входе, депозит и бронь стола. Для баров и промоутеров, которым надоел Excel.",
    longDescription:
      "NightList собирает заявки в лист, считает депозит, бронирует стол и отдаёт охране короткий список. Гость получает подтверждение в чат.",
    category: "bots",
    kind: "ready",
    price: 1190,
    oldPrice: 5600,
    timeline: "1 день",
    features: [
      "Заявка: имя, гости, стол",
      "Депозит и статусы",
      "Список для охраны",
      "Чёрный список",
      "Напоминание за 3 часа",
    ],
    stack: ["Python", "aiogram 3", "SQLite"],
    includes: ["Код", "Инструкция", "Шаблон текстов"],
  },
  {
    slug: "supportkit",
    name: "SupportKit",
    tagline: "Поддержка без хаоса",
    description:
      "Тикеты из Telegram в общую очередь. Несколько операторов, теги и быстрые ответы.",
    longDescription:
      "SupportKit превращает входящие в тикеты. Операторы берут диалог из очереди, отвечают шаблонами, ставят теги. Клиент видит один чат.",
    category: "bots",
    kind: "ready",
    price: 990,
    oldPrice: 5200,
    timeline: "в день оплаты",
    features: [
      "Очередь тикетов",
      "Несколько операторов",
      "Быстрые ответы",
      "Теги и статус",
      "Оценка после закрытия",
    ],
    stack: ["Python", "aiogram 3"],
    includes: ["Код", "Инструкция для операторов"],
  },
  {
    slug: "schoolbell",
    name: "SchoolBell",
    tagline: "Рассылка родителям",
    description:
      "Объявления классу, опросы и напоминания. Учитель пишет один раз — родители получают в Telegram.",
    longDescription:
      "SchoolBell делит семьи по классам, шлёт объявления, собирает «будет / не будет» и пингует тех, кто не ответил. Без сбора лишних данных.",
    category: "bots",
    kind: "ready",
    price: 790,
    oldPrice: 3900,
    timeline: "в день оплаты",
    features: [
      "Классы и роли",
      "Рассылка по группе",
      "Опрос «будет / нет»",
      "Напоминание молчунам",
      "Архив объявлений",
    ],
    stack: ["Python", "aiogram 3"],
    includes: ["Код", "Короткая инструкция для учителя"],
  },
  {
    slug: "deliverygo",
    name: "DeliveryGo",
    tagline: "Доставка из кухни",
    description:
      "Меню, корзина, слот доставки и статус заказа. Для маленькой кухни, которой не нужен огромный агрегатор.",
    longDescription:
      "DeliveryGo — меню с модификаторами, слоты доставки, статус «готовим / в пути». Курьер отмечается в боте, клиент видит прогресс.",
    category: "bots",
    kind: "ready",
    price: 1690,
    oldPrice: 8900,
    timeline: "1–2 дня",
    popular: true,
    features: [
      "Меню и стоп-лист",
      "Модификаторы блюд",
      "Слоты доставки",
      "Статус заказа",
      "Роль курьера",
    ],
    stack: ["Python", "aiogram 3", "SQLite"],
    includes: ["Код", "Инструкция", "1 настройка меню"],
  },
  {
    slug: "pollmaster",
    name: "PollMaster",
    tagline: "Опросы, которые читают",
    description:
      "Красивые опросы с несколькими вопросами, ветками и выгрузкой. Не один Telegram-poll, а нормальная анкета.",
    longDescription:
      "PollMaster ведёт многошаговую анкету: ветки, обязательные поля, лимит по времени, CSV для заказчика. Подходит для регистрации на ивент.",
    category: "bots",
    kind: "ready",
    price: 590,
    oldPrice: 2900,
    timeline: "в день оплаты",
    isNew: true,
    features: [
      "Много шагов и ветки",
      "Обязательные поля",
      "Антидубль по user id",
      "Выгрузка CSV",
      "Закрытие по дате",
    ],
    stack: ["Python", "aiogram 3"],
    includes: ["Код", "Пример анкеты"],
  },
  {
    slug: "novastudio",
    name: "NovaStudio",
    tagline: "Лендинг для студии",
    description:
      "Одностраничник: герой, кейсы, цены, форма заявки. Спокойный тёмный свет — продаёт услуги, а не «креатив».",
    longDescription:
      "NovaStudio — готовый лендинг для дизайнера, фотографа или маленькой студии. Блок кейсов, пакеты услуг, FAQ и форма. Отдаём исходники, меняем тексты и фото.",
    category: "sites",
    kind: "ready",
    price: 2490,
    oldPrice: 18000,
    timeline: "1–2 дня",
    popular: true,
    demo: "site-frame",
    features: [
      "Адаптив 390px+",
      "Кейсы и пакеты",
      "Форма заявки",
      "SEO-заголовок и sitemap",
      "Готовые тексты-заготовки",
    ],
    stack: ["HTML", "CSS", "JS"],
    includes: ["Исходники", "Замена текстов и фото", "Выкладка на хостинг"],
  },
  {
    slug: "embershop",
    name: "EmberShop",
    tagline: "Витрина без 1С",
    description:
      "Каталог одежды или мерча: карточки, фильтры, корзина, заявка в Telegram. Для тех, кто продаёт руками.",
    longDescription:
      "EmberShop — лёгкий магазин на статике плюс корзина в Telegram. Фильтры по размеру и цвету, избранное в браузере, заказ улетает менеджеру.",
    category: "sites",
    kind: "ready",
    price: 3490,
    oldPrice: 28000,
    timeline: "2–3 дня",
    popular: true,
    features: [
      "Каталог и фильтры",
      "Корзина",
      "Заказ в Telegram",
      "Карточки с размерами",
      "Админ-таблица товаров CSV",
    ],
    stack: ["HTML", "JS", "Telegram"],
    includes: ["Исходники", "20 карточек под ваши фото", "Выкладка"],
  },
  {
    slug: "atlasfolio",
    name: "AtlasFolio",
    tagline: "Портфолио, которое дышит",
    description:
      "Сетка работ, страница кейса, контакт. Для дизайнера, которому надоел шаблон с Behance.",
    longDescription:
      "AtlasFolio — журналная сетка, крупные кадры, страница проекта и короткая биография. Без анимационного цирка, с нормальной типографикой.",
    category: "sites",
    kind: "ready",
    price: 1990,
    oldPrice: 14000,
    timeline: "1–2 дня",
    demo: "site-frame",
    features: [
      "Сетка и страница кейса",
      "Светлая/тёмная тема",
      "Страница «обо мне»",
      "Форма и соцссылки",
      "Оптимизация картинок",
    ],
    stack: ["HTML", "CSS"],
    includes: ["Исходники", "Сборка 6 кейсов", "Выкладка"],
  },
  {
    slug: "forkmenu",
    name: "ForkMenu",
    tagline: "Сайт кафе с меню",
    description:
      "Главная, меню с категориями, бронь стола в Telegram. Для кофейни, которой хватит одной страницы.",
    longDescription:
      "ForkMenu показывает часы, адрес, меню и принимает бронь. Меню правится из простого файла. Карта и кнопки «как дойти».",
    category: "sites",
    kind: "ready",
    price: 2290,
    oldPrice: 16000,
    timeline: "1–2 дня",
    features: [
      "Меню по категориям",
      "Бронь в Telegram",
      "Часы и адрес",
      "Галерея зала",
      "Кнопка маршрута",
    ],
    stack: ["HTML", "CSS", "Telegram"],
    includes: ["Исходники", "Набор блюд", "Выкладка"],
  },
  {
    slug: "quietnotes",
    name: "QuietNotes",
    tagline: "Личный блог без CMS",
    description:
      "Статичный блог: лента, пост, RSS. Пишете в Markdown — собирается сайт. Никакого WordPress.",
    longDescription:
      "QuietNotes — блог на Markdown. Лента, теги, RSS, тёмная тема. Собирается одной командой, живёт на любом статическом хостинге.",
    category: "sites",
    kind: "ready",
    price: 1490,
    oldPrice: 9000,
    timeline: "1 день",
    isNew: true,
    features: [
      "Markdown → страницы",
      "Теги и RSS",
      "Поиск по заголовкам",
      "Тёмная тема",
      "Читабельная ширина текста",
    ],
    stack: ["11ty", "Markdown"],
    includes: ["Репозиторий", "3 стартовых поста", "Выкладка"],
  },
  {
    slug: "orbitlaunch",
    name: "OrbitLaunch",
    tagline: "Лендинг цифрового продукта",
    description:
      "Герой, фичи, тарифы, FAQ. Для SaaS, курса или приложения, которому нужна посадочная без «AI-градиента».",
    longDescription:
      "OrbitLaunch — строгий маркетинговый лендинг: проблема, решение, три тарифа, социальное доказательство, FAQ и форма. Копирайт-заготовки на русском.",
    category: "sites",
    kind: "ready",
    price: 2990,
    oldPrice: 22000,
    timeline: "2 дня",
    features: [
      "Три тарифа",
      "FAQ-аккордеон",
      "Форма и аналитика-заглушка",
      "Секции фич",
      "Готовый оффер",
    ],
    stack: ["HTML", "CSS", "JS"],
    includes: ["Исходники", "Тексты-заготовки", "Выкладка"],
  },
  {
    slug: "habitloop",
    name: "HabitLoop",
    tagline: "Трекер привычек как PWA",
    description:
      "Цепочки, напоминания, статистика. Ставится на домашний экран, данные живут на устройстве.",
    longDescription:
      "HabitLoop — прогрессивное приложение: привычки, стрики, тепловая карта. Без аккаунта, без облака. Можно доработать под бренд.",
    category: "apps",
    kind: "ready",
    price: 2490,
    oldPrice: 15000,
    timeline: "2 дня",
    popular: true,
    features: [
      "Стрики и цели",
      "Напоминания",
      "Тепловая карта",
      "PWA на домашний экран",
      "Экспорт JSON",
    ],
    stack: ["React", "PWA"],
    includes: ["Код", "Смена названия и цвета", "Выкладка"],
  },
  {
    slug: "invoicelite",
    name: "InvoiceLite",
    tagline: "Счета без бухгалтерии",
    description:
      "Создание PDF-счёта, нумерация, реквизиты. Для фрилансера, которому надоел Word.",
    longDescription:
      "InvoiceLite хранит реквизиты, нумерует счета, считает сумму и печатает PDF. Клиентская база — локально в браузере.",
    category: "apps",
    kind: "ready",
    price: 1990,
    oldPrice: 12000,
    timeline: "1–2 дня",
    features: [
      "PDF-счёт",
      "Нумерация",
      "Реквизиты и логотип",
      "Список клиентов",
      "Поиск по номерам",
    ],
    stack: ["React", "PDF"],
    includes: ["Код", "Ваши реквизиты", "Выкладка"],
  },
  {
    slug: "shiftboard",
    name: "ShiftBoard",
    tagline: "Смены маленькой команды",
    description:
      "График смен, обмен и подтверждение. Для кофейни или пункта выдачи на 5–15 человек.",
    longDescription:
      "ShiftBoard рисует неделю, позволяет обменяться сменой и подтвердить выход. Уведомления можно связать с Telegram.",
    category: "apps",
    kind: "ready",
    price: 2990,
    oldPrice: 19000,
    timeline: "3 дня",
    isNew: true,
    features: [
      "Недельный график",
      "Обмен сменами",
      "Роли админ / сотрудник",
      "Связка с Telegram",
      "Экспорт недели",
    ],
    stack: ["React", "Telegram"],
    includes: ["Код", "Онбординг команды", "Выкладка"],
  },
  {
    slug: "neonkart",
    name: "NeonKart",
    tagline: "Картинг в Roblox",
    description:
      "Кольцо, три машины, круги и таблица. Готовый плейс, который можно брендировать под группу.",
    longDescription:
      "NeonKart — аркадные гонки: три карта, трасса с чекпоинтами, круги, таблица лучших. Код читаемый, можно добавить свою трассу.",
    category: "roblox",
    kind: "ready",
    price: 990,
    oldPrice: 4500,
    timeline: "1–2 дня",
    popular: true,
    features: [
      "3 машины с разным разгоном",
      "Чекпоинты и круги",
      "Таблица лучших",
      "Простой гараж",
      "Место под группу",
    ],
    stack: ["Luau", "Roblox Studio"],
    includes: ["Плейс-файл", "Инструкция публикации", "1 смена бренда"],
  },
  {
    slug: "towerbits",
    name: "TowerBits",
    tagline: "Tower defense на 8 волн",
    description:
      "Башни, враги, апгрейды. Короткий TD для группы: понятный цикл «волна — золото — апгрейд».",
    longDescription:
      "TowerBits — восемь волн, четыре башни, золото и апгрейды. Баланс простой, карта одна, код разложен по модулям.",
    category: "roblox",
    kind: "ready",
    price: 1290,
    oldPrice: 6000,
    timeline: "2 дня",
    features: [
      "8 волн",
      "4 типа башен",
      "Золото и апгрейды",
      "Экран поражения/победы",
      "Магазин между волнами",
    ],
    stack: ["Luau", "Roblox Studio"],
    includes: ["Плейс-файл", "Инструкция", "1 смена темы"],
  },
  {
    slug: "petpark",
    name: "PetPark",
    tagline: "Симулятор питомцев",
    description:
      "Яйца, питомцы, энчанты. Короткий пет-симулятор с яйцами и зоной прогулки — без бесконечного гринда на старте.",
    longDescription:
      "PetPark выдаёт яйца, питомцев редкости и зону, где они гуляют. Есть ребёрс и витрина. Подходит как база под свой симулятор.",
    category: "roblox",
    kind: "ready",
    price: 1490,
    oldPrice: 7500,
    timeline: "2–3 дня",
    isNew: true,
    features: [
      "Яйца трёх редкостей",
      "Петы следуют за игроком",
      "Энчант-станция",
      "Витрина коллекции",
      "База под свой магазин",
    ],
    stack: ["Luau", "Roblox Studio"],
    includes: ["Плейс-файл", "Инструкция", "Смена названий петов"],
  },
  {
    slug: "obbyrush",
    name: "ObbyRush",
    tagline: "Обби на 40 этапов",
    description:
      "Чекпоинты, монеты, скины. Классический обби без киллер-китов — чистый паркур и сохранение прогресса.",
    longDescription:
      "ObbyRush — сорок этапов, чекпоинты, монеты на скины. Прогресс сохраняется. Можно вставить свои килл-брыки на отдельные этапы.",
    category: "roblox",
    kind: "ready",
    price: 790,
    oldPrice: 3500,
    timeline: "1 день",
    popular: true,
    features: [
      "40 этапов",
      "Чекпоинты",
      "Монеты и 6 скинов",
      "Сохранение",
      "Финишный подиум",
    ],
    stack: ["Luau", "Roblox Studio"],
    includes: ["Плейс-файл", "Инструкция"],
  },
  {
    slug: "tycoonlite",
    name: "TycoonLite",
    tagline: "Тайкун на одну базу",
    description:
      "Дропы, кнопки постройки, доход. Лёгкий тайкун: игрок поднимает базу и копит к финальному дропу.",
    longDescription:
      "TycoonLite — одна база, цепочка построек, пассивный доход, финальный дроп. Код без обфускации, можно нарастить вторую базу.",
    category: "roblox",
    kind: "ready",
    price: 1690,
    oldPrice: 8200,
    timeline: "2–3 дня",
    features: [
      "Цепочка построек",
      "Пассивный доход",
      "Сохранение базы",
      "Финальный дроп",
      "Место под геймпасс",
    ],
    stack: ["Luau", "Roblox Studio"],
    includes: ["Плейс-файл", "Инструкция", "1 геймпасс-кнопка"],
  },
  {
    slug: "site-custom",
    name: "Сайт на заказ",
    tagline: "Лендинг, магазин, сервис",
    description:
      "Считаем смету в чате. Менеджер Вей уточнит страницы, референсы и срок — без накрутки «как на Авито».",
    longDescription:
      "Заказываете сайт: лендинг, магазин, каталог, личный кабинет. Вей задаст несколько вопросов и соберёт смету по блокам. Типовой лендинг начинается от 1 990 ₽, магазин — от 3 490 ₽.",
    category: "sites",
    kind: "custom",
    price: 1990,
    timeline: "3–10 дней",
    features: [
      "Бриф в чате",
      "Смета по блокам",
      "Адаптив",
      "Выкладка",
      "Правки в рамках сметы",
    ],
    stack: ["под задачу"],
    includes: ["Дизайн-система", "Вёрстка", "Запуск"],
  },
  {
    slug: "bot-custom",
    name: "Telegram-бот на заказ",
    tagline: "Магазин, запись, CRM",
    description:
      "Опишите сценарий — Вей доспрашивает и считает. Простые боты от 990 ₽, магазин и оплаты — чуть выше.",
    longDescription:
      "Кастомный бот: запись, магазин, заявки, квизы, внутренние инструменты. Смета собирается из модулей (каталог, оплата, админка, рассылки), без скрытых часов.",
    category: "bots",
    kind: "custom",
    price: 990,
    timeline: "2–8 дней",
    features: [
      "Сценарий диалога",
      "Админ-команды",
      "Хранение данных",
      "Инструкция",
      "Запуск на вашем токене",
    ],
    stack: ["Python / Node"],
    includes: ["Код", "Деплой-инструкция", "Правки по смете"],
  },
  {
    slug: "app-custom",
    name: "Приложение на заказ",
    tagline: "PWA, кабинет, сервис",
    description:
      "Веб-приложение под задачу: кабинеты, таблицы, формы. Смета — в чате, цены ниже студийных.",
    longDescription:
      "Делаем веб-приложения и PWA. Не нативные сторы, а быстрый веб, который ставится на экран. Вей разберёт экраны и посчитает по модулям.",
    category: "apps",
    kind: "custom",
    price: 3990,
    timeline: "7–20 дней",
    features: [
      "Экраны по брифу",
      "Адаптив",
      "Хранение данных",
      "PWA по желанию",
      "Сопровождение запуска",
    ],
    stack: ["React"],
    includes: ["Код", "Выкладка", "Короткое обучение"],
  },
  {
    slug: "roblox-custom",
    name: "Roblox-игра на заказ",
    tagline: "Обби, тайкун, симулятор",
    description:
      "Плейс под группу: механика, UI, сохранение, геймпассы. Смета по системам, без «от 30 тысяч».",
    longDescription:
      "Кастомный плейс: обби, тайкун, TD, симулятор, хаб. Считаем системы — персонаж, экономика, UI, датасторы, монетизация. Стартовые обби от 1 290 ₽.",
    category: "roblox",
    kind: "custom",
    price: 1290,
    timeline: "5–21 день",
    features: [
      "Дизайн плейса",
      "Скрипты без обфускации",
      "Сохранения",
      "Геймпассы по смете",
      "Помощь с публикацией",
    ],
    stack: ["Luau"],
    includes: ["Плейс", "Инструкция", "Правки по смете"],
  },
  {
    slug: "other-custom",
    name: "Автоматизация и другое",
    tagline: "Парсеры, мини-CRM, скрипты",
    description:
      "Если это не сайт, не бот и не Roblox — всё равно напишите. Парсим, склеиваем таблицы, делаем маленькие панели.",
    longDescription:
      "Парсеры, выгрузки, мини-админки, интеграции таблиц, одноразовые скрипты. Вей спросит вход, выход и частоту — и назовёт цену.",
    category: "other",
    kind: "custom",
    price: 790,
    timeline: "1–7 дней",
    features: [
      "Бриф по входу/выходу",
      "Скрипт или панель",
      "Короткая инструкция",
      "Запуск у вас",
      "Мелкие правки",
    ],
    stack: ["под задачу"],
    includes: ["Код", "Инструкция"],
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function productsByCategory(id: CategoryId | "all") {
  if (id === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === id);
}

export function featuredProducts() {
  return PRODUCTS.filter((p) => p.popular && p.kind === "ready").slice(0, 6);
}

export function readyProducts() {
  return PRODUCTS.filter((p) => p.kind === "ready");
}

export function customProducts() {
  return PRODUCTS.filter((p) => p.kind === "custom");
}

export function filterProducts(cat?: CategoryId, kind?: ProductKind) {
  return PRODUCTS.filter((p) => {
    if (cat && p.category !== cat) return false;
    if (kind && p.kind !== kind) return false;
    return true;
  });
}

export function minPriceOf(list: { price: number }[]) {
  if (list.length === 0) return 0;
  return Math.min(...list.map((p) => p.price));
}

export function catalogSummaryForPrompt() {
  return PRODUCTS.map((p) => {
    const kind = p.kind === "ready" ? "готовое" : "на заказ, от";
    const old = p.oldPrice ? `, обычно у фрилансеров ~${p.oldPrice}` : "";
    return `- ${p.name} [${p.category}/${kind}] ${p.price} ₽${old}. ${p.tagline}. Срок: ${p.timeline}.`;
  }).join("\n");
}
