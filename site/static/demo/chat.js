/* CodWay demo: Telegram-style bot chat simulator with scripted flows (no real backend, no LLM) */
(function () {
  var D = window.DEMO, $ = D.$, esc = D.esc, wait = D.wait;
  var IC = {
    chev: '<svg viewBox="0 0 12 20" width="11" height="19"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clip: '<svg viewBox="0 0 24 24" width="25" height="25"><path d="M20.5 11.2 12.3 19.4a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 4.9 4.9l-8.5 8.5a1.7 1.7 0 0 1-2.5-2.5l7.9-7.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M12 17V7.5M7.8 11.2 12 7l4.2 4.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    checks: '<svg class="ck" viewBox="0 0 19 11" width="17" height="10"><path d="M1.2 5.8 4.6 9.2 11.6 1.6M7.4 9.2 14.4 1.6" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg class="ar" viewBox="0 0 10 10" width="8" height="8"><path d="M2.5 1.5h6v6M8.5 1.5 1.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    tail: '<svg class="tail" viewBox="0 0 11 17" width="11" height="17"><path d="M11 0v17H0c5.5-1 9.6-5.4 11-11z" fill="currentColor"/></svg>'
  };
  var F = FLOWS()[D.id] || FLOWS().booking;
  var app = $("#app");
  app.innerHTML = '<div class="tg"><div class="tg-head"><a class="tg-back" href="/#gotovye">' + IC.chev + 'Чаты</a><div class="tg-title"><b>' + F.name + '</b><small id="st">бот</small></div><span class="tg-ava">' + F.ava + '</span></div><div class="tg-wall"><div class="tg-list" id="list"></div></div><div class="tg-bottom"><form class="tg-input" id="f" autocomplete="off"><span class="ic">' + IC.clip + '</span><label class="tg-field"><input id="in" placeholder="Сообщение" enterkeyhint="send" aria-label="Сообщение"></label><button class="ic send" aria-label="Отправить">' + IC.send + '</button></form><div class="tg-rk" id="rk" hidden></div></div></div>';
  if (D.inTG) $(".tg-back").addEventListener("click", function (e) { e.preventDefault(); D.close(); });
  var list = $("#list"), wall = $(".tg-wall"), st = $("#st"), input = $("#in"), rk = $("#rk");
  var busy = false, onText = null;
  var t = function () { return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); };
  var scroll = function () { wall.scrollTo({ top: wall.scrollHeight, behavior: "smooth" }); };

  function bubble(side, html, kb) {
    var m = document.createElement("div");
    m.className = "tg-m " + side + " live";
    m.innerHTML = '<div class="tg-b">' + html + '<span class="tg-meta">' + t() + (side === "out" ? IC.checks : "") + "</span>" + (kb ? "" : IC.tail) + "</div>";
    if (kb) {
      var k = document.createElement("div"); k.className = "tg-ikb";
      kb.forEach(function (row) {
        var r = document.createElement("div");
        row.forEach(function (b) {
          var x = document.createElement("button"); x.type = "button";
          x.innerHTML = esc(b.t) + (b.url || b.end ? IC.link : "");
          x.onclick = function () { press(k, x, b); };
          r.appendChild(x);
        });
        k.appendChild(r);
      });
      m.appendChild(k);
    }
    list.appendChild(m); scroll();
    return m;
  }
  function press(k, x, b) {
    if (busy) return;
    D.haptic();
    if (b.end) { D.finish(b.end); return; }
    if (b.url) { window.open(b.url, "_blank", "noopener"); return; }
    if (!b.keep) { k.classList.add("used"); x.classList.add("on"); }
    if (!b.silent) bubble("out", esc(b.t));
    run(b.go, b);
  }
  /* bot "types", then sends */
  function say(html, kb, ms) {
    busy = true; st.textContent = "печатает…"; st.classList.add("typing");
    return wait(ms || Math.min(1400, 450 + html.length * 6)).then(function () {
      st.textContent = "бот"; st.classList.remove("typing"); busy = false;
      return bubble("in", html, kb);
    });
  }
  function reply(rows) {
    if (!rows) { rk.hidden = true; rk.innerHTML = ""; return; }
    rk.hidden = false;
    rk.innerHTML = rows.map(function (r) { return "<div>" + r.map(function (b) { return '<button type="button">' + esc(b) + "</button>"; }).join("") + "</div>"; }).join("");
    rk.querySelectorAll("button").forEach(function (b) { b.onclick = function () { send(b.textContent); }; });
  }
  function send(text) {
    text = text.trim(); if (!text || busy) return;
    bubble("out", esc(text)); D.haptic();
    (onText || F.text).call(ctx, text);
  }
  function run(step, b) { var fn = F.steps[step]; if (fn) fn.call(ctx, b || {}); }
  $("#f").addEventListener("submit", function (e) { e.preventDefault(); var v = input.value; input.value = ""; send(v); });
  var ctx = { say: say, reply: reply, run: run, state: {}, bubble: bubble, wait: wait, D: D, expect: function (fn) { onText = fn; } };
  bubble("out", "/start");
  run("start");

  /* ------------------------------------------------------------------ */
  function FLOWS() {
    var days = function () {
      var r = [], d = new Date(), wd = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      for (var i = 0; i < 4; i++) { var x = new Date(d.getTime() + i * 864e5); r.push({ t: i === 0 ? "Сегодня" : i === 1 ? "Завтра" : wd[x.getDay()] + ", " + x.getDate() + "." + String(x.getMonth() + 1).padStart(2, "0"), go: "time", v: i }); }
      return r;
    };
    var SERV = [["Стрижка", 1200, "45 мин"], ["Борода", 700, "30 мин"], ["Комплекс", 1700, "75 мин"], ["Детская", 900, "40 мин"]];
    var MAST = ["Артём", "Илья", "Любой мастер"];
    var booking = {
      name: "Barber Club", ava: "BC",
      text: function (s) {
        var l = s.toLowerCase();
        if (/запис|стриж|хочу/.test(l)) return this.run("serv");
        if (/цен|услуг|прайс|сколько/.test(l)) return this.run("prices");
        if (/адрес|где|добрат/.test(l)) return this.run("addr");
        if (/мои/.test(l)) return this.run("mine");
        this.say("Я бот записи 🙂 Нажмите <b>📅 Записаться</b> или выберите пункт в меню ниже.");
      },
      steps: {
        start: function () {
          this.reply([["📅 Записаться", "💈 Услуги и цены"], ["📍 Как добраться", "👤 Мои записи"]]);
          this.say("Привет! 👋 Я бот барбершопа <b>Barber Club</b>.<br>Запишу вас к мастеру за 30 секунд — без звонков.", [[{ t: "📅 Записаться", go: "serv" }], [{ t: "💈 Услуги и цены", go: "prices" }, { t: "📍 Адрес", go: "addr" }]]);
        },
        prices: function () { this.say(SERV.map(function (s) { return s[0] + " — <b>" + D.rub(s[1]) + "</b> · " + s[2]; }).join("<br>"), [[{ t: "📅 Записаться", go: "serv" }]]); },
        addr: function () { this.say("📍 ул. Пушкина, 12 · вход со двора<br>🕘 Ежедневно 10:00–21:00<br>🚇 5 минут от метро «Центральная»", [[{ t: "📅 Записаться", go: "serv" }]]); },
        mine: function () { var b = this.state.booked; this.say(b ? "Ваша запись: <b>" + b + "</b>" : "У вас пока нет записей.", b ? null : [[{ t: "📅 Записаться", go: "serv" }]]); },
        serv: function () { this.say("Выберите услугу 👇", SERV.map(function (s) { return [{ t: s[0] + " · " + D.rub(s[1]), go: "master", v: s }]; })); },
        master: function (b) { if (b.v) this.state.serv = b.v; this.say("К какому мастеру?", [MAST.slice(0, 2).map(function (m) { return { t: "💈 " + m, go: "date", v: m }; }), [{ t: MAST[2], go: "date", v: MAST[2] }]]); },
        date: function (b) { this.state.master = b.v; var d = days(); this.say("Выберите день:", [d.slice(0, 2), d.slice(2)]); },
        time: function (b) {
          this.state.day = b.t;
          var slots = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:00"], seed = (b.v || 0) + this.state.serv[0].length;
          var free = slots.filter(function (_, i) { return (i * 7 + seed) % 3 !== 0; }).slice(0, 6).map(function (s) { return { t: s, go: "confirm" }; });
          this.say("Свободные окна на <b>" + b.t.toLowerCase() + "</b>:", [free.slice(0, 3), free.slice(3, 6)]);
        },
        confirm: function (b) {
          var s = this.state; s.time = b.t;
          this.say("Проверьте запись:<br><br>✂️ " + s.serv[0] + " · " + D.rub(s.serv[1]) + "<br>💈 " + s.master + "<br>📅 " + s.day + ", <b>" + s.time + "</b>", [[{ t: "✅ Подтвердить", go: "done" }], [{ t: "Изменить", go: "serv" }]]);
        },
        done: function () {
          var s = this.state; s.booked = s.day + ", " + s.time + " · " + s.serv[0];
          var me = this;
          this.say("Готово! Вы записаны ✅<br><b>" + s.booked + "</b><br><br>Напомню за день и за 2 часа до визита. Чтобы закрепить время, внесите предоплату.", [[{ t: "💳 Предоплата 300 ₽ через СБП", end: "Здесь клиент оплатил бы предоплату через СБП или ЮKassa, а мастер получил бы уведомление о новой записи." }], [{ t: "Отменить запись", go: "cancel" }]])
            .then(function () { return wait(600); }).then(function () { me.bubble("in", '<span class="dnote">🔔 Так будет выглядеть напоминание:<br><b>Завтра в ' + s.time + "</b> вас ждёт мастер " + s.master + ". Всё в силе?</span>", [[{ t: "👍 Приду", go: "ok" }, { t: "Перенести", go: "serv" }]]); });
        },
        ok: function () { this.say("Отлично, ждём вас! 💈", [[{ t: "🤝 Хочу такого бота", end: "Это демо бота записи: так ваши клиенты будут записываться сами 24/7." }]]); },
        cancel: function () { this.state.booked = null; this.say("Запись отменена. Окно снова свободно для других клиентов.", [[{ t: "📅 Записаться снова", go: "serv" }]]); }
      }
    };

    var FAQ = [
      [/достав|курьер|привез|сколько ид|сроки/, "🚚 <b>Доставка</b><br>По городу — курьером за 1–2 дня, 290 ₽, бесплатно от 3 000 ₽. По России — СДЭК и Почта, 2–7 дней. Самовывоз — сегодня после 16:00."],
      [/оплат|карт|сбп|налич|рассроч/, "💳 <b>Оплата</b><br>Картой онлайн, по СБП, наличными или картой курьеру. Для юрлиц — по счёту. Рассрочка через «Долями» на 4 платежа."],
      [/возвр|вернуть|обмен|не подош/, "↩️ <b>Возврат</b><br>14 дней на возврат без объяснения причин, если товар не был в использовании. Деньги вернём за 1–3 дня после получения."],
      [/гарант|слома|брак/, "🛡 <b>Гарантия</b><br>12 месяцев на всю технику. При браке заменим товар или вернём деньги — просто пришлите фото в этот чат."],
      [/где заказ|статус|отслед|трек|номер заказа|мой заказ/, "📦 <b>Статус заказа</b><br>Пришлите номер заказа — например, <b>48213</b>, и я проверю, где он сейчас."],
      [/^\d{4,6}$/, "📦 Заказ <b>№{n}</b>: передан в доставку, курьер привезёт <b>завтра с 12:00 до 15:00</b>. За час до приезда придёт SMS."],
      [/график|время работ|часы|открыт|работает/, "🕘 <b>График</b><br>Магазин — ежедневно 10:00–21:00. Этот чат отвечает круглосуточно."],
      [/привет|здравств|добрый|хай|hello/, "Здравствуйте! 👋 Чем могу помочь? Спросите про доставку, оплату, возврат или статус заказа."],
      [/спасиб|благодар/, "Всегда рад помочь! Если появятся вопросы — пишите в любое время 🙂"]
    ];
    var ai = {
      name: "Lumen · поддержка", ava: "AI",
      text: function (s) {
        var l = s.toLowerCase().trim(), me = this;
        if (/менеджер|человек|оператор|живой/.test(l)) return this.run("human");
        for (var i = 0; i < FAQ.length; i++) if (FAQ[i][0].test(l)) {
          var a = FAQ[i][1].replace("{n}", esc(s.trim()));
          return this.say(a + '<span class="src">Источник: база знаний · ' + (i + 1) + "</span>", [[{ t: "👍 Помогло", go: "thanks", silent: false }, { t: "👤 Позвать человека", go: "human" }]], 1300);
        }
        this.say("Хм, в базе знаний нет точного ответа на этот вопрос 🤔<br>Чтобы не гадать, могу передать диалог менеджеру — он ответит здесь же.", [[{ t: "👤 Передать менеджеру", go: "human" }], [{ t: "Посмотреть частые вопросы", go: "menu" }]], 1300);
      },
      steps: {
        start: function () {
          this.reply([["🚚 Доставка", "💳 Оплата"], ["↩️ Возврат", "📦 Где мой заказ?"]]);
          this.say("Здравствуйте! Я AI-ассистент магазина <b>Lumen</b> 🤖<br>Отвечаю мгновенно и круглосуточно по базе знаний магазина. Напишите вопрос своими словами — например, <i>«сколько идёт доставка в Казань?»</i>", null, 900).then(this.run.bind(this, "menu"));
        },
        menu: function () { this.say("Или выберите тему:", [[{ t: "🚚 Доставка", go: "q", v: "доставка", silent: true }, { t: "💳 Оплата", go: "q", v: "оплата", silent: true }], [{ t: "↩️ Возврат", go: "q", v: "возврат", silent: true }, { t: "🛡 Гарантия", go: "q", v: "гарантия", silent: true }], [{ t: "📦 Где мой заказ?", go: "q", v: "статус", silent: true }]], 500); },
        q: function (b) { this.bubble("out", esc(b.t)); ai.text.call(this, b.v); },
        thanks: function () { this.say("Рад помочь! Ещё вопрос? Просто напишите его 🙂"); },
        human: function () { this.say("Передаю диалог менеджеру 👤<br>Он увидит всю переписку и ответит здесь же — обычно в течение 5 минут.", [[{ t: "Ок, жду ответа", end: "В настоящем боте диалог сейчас ушёл бы менеджеру в рабочий чат, а ответ пришёл бы клиенту сюда же." }]], 900); }
      }
    };

    var video = {
      name: "SaveClip", ava: "SC",
      text: function (s) {
        if (/https?:\/\/|www\.|youtu|tiktok|vk\.com|instagram/i.test(s)) return this.run("link", { v: s });
        if (/как скачать|помощ|help/i.test(s)) return this.say("1️⃣ Откройте видео в приложении<br>2️⃣ Нажмите «Поделиться» → «Копировать ссылку»<br>3️⃣ Вставьте ссылку сюда — и выберите качество", [[{ t: "Попробовать на примере", go: "ex", v: "https://youtu.be/dQw4-espresso", silent: true }]]);
        if (/premium/i.test(s)) return this.say("⭐ <b>Premium</b> — без рекламы и подписки на канал, файлы до 2 ГБ и плейлисты целиком.<br>149 ₽ в месяц или 990 ₽ навсегда.", [[{ t: "💳 Оформить за 149 ₽", end: "Здесь пользователь оплатил бы Premium через Telegram Stars или ЮKassa — бот сам выдаёт доступ." }]]);
        this.say("Это не похоже на ссылку 🙈<br>Пришлите ссылку на видео — например, <i>https://youtu.be/…</i>");
      },
      steps: {
        start: function () {
          this.reply([["❓ Как скачать", "⭐ Premium"]]);
          this.say("Привет! Я скачиваю видео и музыку 🎬<br>Пришлите ссылку из <b>YouTube, TikTok, VK или Instagram</b> — верну файл в нужном качестве.", [[{ t: "Вставить пример: YouTube", go: "ex", v: "https://youtu.be/dQw4-espresso", silent: true }], [{ t: "Пример: TikTok", go: "ex", v: "https://vt.tiktok.com/ZS8coffee/", silent: true }]]);
        },
        ex: function (b) { this.bubble("out", '<span class="lnk">' + esc(b.v) + "</span>"); this.run("link", b); },
        link: function (b) {
          var me = this, tt = /tiktok/i.test(b.v);
          this.state.src = tt ? "TikTok" : "YouTube";
          if (!this.state.sub) return this.say("Чтобы скачивать без ограничений, подпишитесь на канал <b>@saveclip_news</b> — это бесплатно 🙏", [[{ t: "📢 Открыть канал", go: "subbed", silent: true }], [{ t: "✅ Я подписался", go: "subbed" }]]).then(function () { me.state.pending = b; });
          this.say("🔎 Обрабатываю ссылку…", null, 500).then(function (m) {
            return wait(1100).then(function () {
              m.remove();
              return me.say('<span class="vcard"><img src="/img/' + (tt ? "icedlatte" : "americano") + '.webp" alt=""><i>' + (tt ? "0:38" : "4:12") + "</i></span><b>" + (tt ? "Айс-латте за 30 секунд ☕" : "Как сварить идеальный эспрессо дома") + "</b><br>" + me.state.src + " · выберите формат:", [[{ t: "🎬 1080p · 86 МБ", go: "dl", v: "1080p" }, { t: "720p · 41 МБ", go: "dl", v: "720p" }], [{ t: "360p · 14 МБ", go: "dl", v: "360p" }, { t: "🎧 MP3 · 6 МБ", go: "dl", v: "MP3" }]], 300);
            });
          });
        },
        subbed: function () { var me = this; this.state.sub = 1; this.say("Подписка подтверждена ✅ Спасибо!", null, 700).then(function () { me.run("link", me.state.pending || { v: "https://youtu.be/x" }); }); },
        dl: function (b) {
          var me = this, q = b.v;
          this.say('⏳ Загружаю ' + q + '…<span class="bar"><i style="width:0%"></i></span><span class="pct">0%</span>', null, 400).then(function (m) {
            var p = 0, iv = setInterval(function () {
              p = Math.min(100, p + 7 + Math.round(Math.random() * 14));
              m.querySelector(".bar i").style.width = p + "%"; m.querySelector(".pct").textContent = p + "%";
              if (p >= 100) { clearInterval(iv); wait(300).then(function () {
                m.remove();
                var mp3 = q === "MP3";
                me.bubble("in", '<span class="file"><span class="file-ic">' + (mp3 ? "♫" : "▶") + '</span><span><b>' + (mp3 ? "espresso_audio.mp3" : "espresso_" + q + ".mp4") + "</b><small>" + (mp3 ? "6,1 МБ · 4:12" : q === "1080p" ? "86 МБ" : q === "720p" ? "41 МБ" : "14 МБ") + " · демо-файл</small></span></span>", [[{ t: "⬇️ Сохранить", end: "В настоящем боте здесь пришёл бы сам файл " + (mp3 ? "MP3" : "видео " + q) + " — его можно сохранить или переслать." }], [{ t: "🔁 Скачать другое", go: "again" }]]);
              }); }
            }, 260);
          });
        },
        again: function () { this.say("Пришлите новую ссылку 👇", [[{ t: "Пример: TikTok", go: "ex", v: "https://vt.tiktok.com/ZS8coffee/", silent: true }]]); }
      }
    };
    return { booking: booking, ai: ai, video: video };
  }
})();
