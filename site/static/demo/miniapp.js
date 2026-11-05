/* CodWay demo: Telegram Mini App (catalog → variants → cart → checkout). Works standalone and inside Telegram WebApp. */
(function () {
  var D = window.DEMO, $ = D.$, esc = D.esc, rub = D.rub, tg = D.tg, inTG = D.inTG;
  var C = CATALOGS()[D.id] || CATALOGS().coffee;
  var app = $("#app");
  var S = { view: "catalog", cat: C.cats[0], q: "", cart: [], co: {} };
  C.checkout.forEach(function (g) { if (g.vals) S.co[g.key] = g.vals[0]; });
  app.innerHTML = '<div class="ma ma-live ' + C.skin + '"><div class="ma-head"><button class="ma-close" type="button">Закрыть</button><div class="ma-title"><b>' + C.title + '</b><small>мини-приложение</small></div><span class="ma-more"><i></i><i></i><i></i></span></div><div class="ma-body" id="v"></div><button class="ma-main" id="mb" type="button" hidden></button></div>';
  var V = $("#v"), MB = $("#mb");
  $(".ma-close").onclick = function () { if (S.view === "catalog") D.close(); else go("back"); };
  var price = function (it, sel) { return it.price + (sel || []).reduce(function (a, o) { return a + o[1]; }, 0); };
  var total = function () { return S.cart.reduce(function (a, l) { return a + l.p * l.n; }, 0); };
  var count = function () { return S.cart.reduce(function (a, l) { return a + l.n; }, 0); };
  var plural = function (n, a, b, c) { var m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); };

  /* main button: Telegram MainButton inside TG, own button otherwise */
  var mbAction = null;
  function main(text, fn) {
    mbAction = fn;
    if (inTG) {
      if (!text) return tg.MainButton.hide();
      tg.MainButton.setText(text); tg.MainButton.show();
    } else { MB.hidden = !text; MB.textContent = text || ""; }
  }
  MB.onclick = function () { if (mbAction) mbAction(); };
  if (inTG) {
    tg.MainButton.onClick(function () { if (mbAction) mbAction(); });
    tg.BackButton.onClick(function () { go("back"); });
  }
  function go(v) {
    if (v === "back") v = S.view === "checkout" ? "cart" : "catalog";
    S.view = v; D.haptic();
    if (inTG) { if (v === "catalog") tg.BackButton.hide(); else tg.BackButton.show(); }
    $(".ma-close").textContent = v === "catalog" ? "Закрыть" : "Назад";
    render(); V.scrollTop = 0;
  }
  function render() {
    if (S.view === "catalog") catalog(); else if (S.view === "cart") cart(); else checkout();
  }
  function cartBtn() { var n = count(); main(n ? C.cartLabel + " · " + plural(n, "товар", "товара", "товаров") + " · " + rub(total()) : "", function () { go("cart"); }); }

  function catalog() {
    var items = C.items.filter(function (i) { return S.q ? i.name.toLowerCase().indexOf(S.q.toLowerCase()) >= 0 : i.cat === S.cat; });
    V.innerHTML = (C.hero ? '<div class="ma-promo">' + C.hero + "</div>" : "") +
      '<label class="ma-search"><svg viewBox="0 0 16 16" width="13" height="13"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3.6 3.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="q" placeholder="Поиск" value="' + esc(S.q) + '" aria-label="Поиск"></label>' +
      '<div class="ma-cats">' + C.cats.map(function (c) { return '<button type="button" class="' + (c === S.cat && !S.q ? "on" : "") + '">' + c + "</button>"; }).join("") + "</div>" +
      '<div class="ma-grid">' + (items.length ? items.map(function (i) {
        var n = S.cart.filter(function (l) { return l.id === i.id; }).reduce(function (a, l) { return a + l.n; }, 0);
        return '<button type="button" class="ma-item" data-id="' + i.id + '"><span class="ma-pic"><img src="/img/' + i.img + '.webp" alt="" loading="lazy">' + (n ? '<b class="ma-q">' + n + "</b>" : "") + (i.badge ? '<i class="ma-badge">' + i.badge + "</i>" : "") + "</span><span>" + i.name + "</span><small>" + (i.opts && i.opts.length ? "от " : "") + rub(i.price) + '</small><em>' + (n ? "Ещё" : "Добавить") + "</em></button>";
      }).join("") : '<p class="ma-empty">Ничего не нашли 🙈</p>') + "</div>";
    var q = $("#q");
    q.oninput = function () { S.q = q.value; var pos = q.selectionStart; catalog(); var nq = $("#q"); nq.focus(); nq.setSelectionRange(pos, pos); };
    V.querySelectorAll(".ma-cats button").forEach(function (b) { b.onclick = function () { S.cat = b.textContent; S.q = ""; D.haptic(); catalog(); }; });
    V.querySelectorAll(".ma-item").forEach(function (b) { b.onclick = function () { sheet(C.items.filter(function (i) { return i.id === b.dataset.id; })[0]); }; });
    cartBtn();
  }

  /* product sheet with variants */
  function sheet(it) {
    D.haptic();
    var sel = (it.opts || []).map(function (g) { return g.vals[0]; }), n = 1;
    var el = document.createElement("div"); el.className = "ma-sheet";
    var draw = function () {
      el.innerHTML = '<div class="ma-sheet-bg"></div><div class="ma-sheet-card"><i class="dsheet-grab"></i><div class="ma-sheet-pic"><img src="/img/' + it.img + '.webp" alt=""></div><h3>' + it.name + "</h3><p>" + it.desc + "</p>" +
        (it.opts || []).map(function (g, gi) { return '<div class="ma-opt"><small>' + g.name + '</small><div class="ma-seg">' + g.vals.map(function (v, vi) { return '<button type="button" data-g="' + gi + '" data-v="' + vi + '" class="' + (sel[gi] === v ? "on" : "") + '">' + v[0] + (v[1] ? "<i>+" + v[1] + "</i>" : "") + "</button>"; }).join("") + "</div></div>"; }).join("") +
        '<div class="ma-add"><div class="ma-step"><button type="button" data-d="-1">−</button><b>' + n + '</b><button type="button" data-d="1">+</button></div><button type="button" class="ma-add-go">Добавить · ' + rub(price(it, sel) * n) + "</button></div></div>";
      el.querySelectorAll(".ma-seg button").forEach(function (b) { b.onclick = function () { sel[+b.dataset.g] = it.opts[+b.dataset.g].vals[+b.dataset.v]; D.haptic(); draw(); }; });
      el.querySelectorAll(".ma-step button").forEach(function (b) { b.onclick = function () { n = Math.max(1, n + +b.dataset.d); D.haptic(); draw(); }; });
      el.querySelector(".ma-add-go").onclick = function () {
        var key = it.id + "|" + sel.map(function (s) { return s[0]; }).join("|");
        var l = S.cart.filter(function (x) { return x.key === key; })[0];
        if (l) l.n += n; else S.cart.push({ key: key, id: it.id, name: it.name, img: it.img, opt: sel.filter(function (s, i) { return !it.opts[i].hideDefault || i; }).map(function (s) { return s[0]; }).join(" · "), p: price(it, sel), n: n });
        D.haptic("medium"); shut(); catalog();
      };
      el.querySelector(".ma-sheet-bg").onclick = shut;
    };
    var shut = function () { el.classList.remove("on"); setTimeout(function () { el.remove(); }, 280); cartBtn(); };
    draw(); app.appendChild(el); requestAnimationFrame(function () { el.classList.add("on"); });
    if (inTG) tg.MainButton.hide(); else MB.hidden = true;
  }

  function cart() {
    if (!S.cart.length) return go("catalog");
    V.innerHTML = '<h2 class="ma-h">Корзина</h2><div class="ma-lines">' + S.cart.map(function (l, i) {
      return '<div class="ma-line"><img src="/img/' + l.img + '.webp" alt=""><div><b>' + l.name + "</b><small>" + l.opt + "</small><span>" + rub(l.p * l.n) + '</span></div><div class="ma-step sm"><button type="button" data-i="' + i + '" data-d="-1">−</button><b>' + l.n + '</b><button type="button" data-i="' + i + '" data-d="1">+</button></div></div>';
    }).join("") + '</div><div class="ma-sum"><span>Товары</span><span>' + rub(total()) + "</span></div>" + (C.cartNote ? '<p class="ma-note">' + C.cartNote + "</p>" : "") + '<button type="button" class="ma-link" id="more">+ Добавить ещё</button>';
    V.querySelectorAll(".ma-step button").forEach(function (b) { b.onclick = function () { var l = S.cart[+b.dataset.i]; l.n += +b.dataset.d; if (l.n < 1) S.cart.splice(+b.dataset.i, 1); D.haptic(); cart(); }; });
    $("#more").onclick = function () { go("catalog"); };
    main("Оформить · " + rub(total()), function () { go("checkout"); });
  }

  function checkout() {
    var extra = C.fee ? C.fee(S) : 0;
    V.innerHTML = '<h2 class="ma-h">Оформление</h2>' + C.checkout.map(function (g) {
      if (g.vals) return '<div class="ma-opt"><small>' + g.name + '</small><div class="ma-seg wrap">' + g.vals.map(function (v, i) { return '<button type="button" data-k="' + g.key + '" data-v="' + i + '" class="' + (S.co[g.key] === v ? "on" : "") + '">' + v + "</button>"; }).join("") + "</div></div>";
      return '<label class="ma-fld"><small>' + g.name + '</small><input data-k="' + g.key + '" placeholder="' + g.ph + '" value="' + esc(S.co[g.key] || "") + '"' + (g.type ? ' type="' + g.type + '"' : "") + "></label>";
    }).join("") + '<div class="ma-sum"><span>Товары</span><span>' + rub(total()) + "</span></div>" + (extra ? '<div class="ma-sum"><span>' + C.feeLabel + "</span><span>" + rub(extra) + "</span></div>" : "") + '<div class="ma-sum big"><span>Итого</span><span>' + rub(total() + extra) + '</span></div><p class="ma-note">Демо: оплата не проводится, данные никуда не отправляются.</p>';
    V.querySelectorAll(".ma-seg button").forEach(function (b) { b.onclick = function () { var g = C.checkout.filter(function (x) { return x.key === b.dataset.k; })[0]; S.co[g.key] = g.vals[+b.dataset.v]; D.haptic(); checkout(); }; });
    V.querySelectorAll(".ma-fld input").forEach(function (i) { i.oninput = function () { S.co[i.dataset.k] = i.value; }; });
    main(C.payLabel + " · " + rub(total() + extra), function () { D.finish(C.finish(S)); });
  }
  go("catalog");

  function CATALOGS() {
    var size = { name: "Объём", vals: [["0,25 л", 0], ["0,35 л", 40], ["0,45 л", 80]] };
    var milk = { name: "Молоко", vals: [["Обычное", 0], ["Овсяное", 60], ["Миндальное", 70], ["Без лактозы", 40]] };
    var syrup = { name: "Сироп", vals: [["Без сиропа", 0], ["Ваниль", 40], ["Карамель", 40], ["Лаванда", 50]] };
    var coffee = {
      title: "Зерно", skin: "skin-coffee", cartLabel: "Корзина", payLabel: "Оплатить",
      hero: '<b>Заказ ко времени</b><span>Без очереди: заберите готовый кофе на стойке</span>',
      cats: ["Кофе", "Холодное", "Выпечка", "Десерты"],
      items: [
        { id: "cap", cat: "Кофе", name: "Капучино", img: "cappuccino", price: 220, desc: "Двойной эспрессо и плотная молочная пена. Зерно Бразилия — шоколад и орех.", opts: [size, milk, syrup], badge: "Хит" },
        { id: "raf", cat: "Кофе", name: "Раф лавандовый", img: "raf", price: 290, desc: "Сливочный раф с лавандовым сиропом собственного приготовления.", opts: [size, milk] },
        { id: "fw", cat: "Кофе", name: "Флэт уайт", img: "flatwhite", price: 240, desc: "Двойной ристретто, тонкий слой бархатного молока.", opts: [size, milk, syrup] },
        { id: "am", cat: "Кофе", name: "Американо", img: "americano", price: 170, desc: "Эспрессо и горячая вода. Чистый вкус зерна.", opts: [size, syrup] },
        { id: "ice", cat: "Холодное", name: "Айс-латте", img: "icedlatte", price: 260, desc: "Эспрессо, холодное молоко и лёд.", opts: [size, milk, syrup] },
        { id: "cb", cat: "Холодное", name: "Колд брю", img: "iced", price: 250, desc: "Кофе холодной экстракции — 16 часов настаивания.", opts: [size, syrup], badge: "Новинка" },
        { id: "cro", cat: "Выпечка", name: "Круассан", img: "croissant", price: 180, desc: "Французское масло, 27 слоёв. Печём каждое утро.", opts: [{ name: "Начинка", vals: [["Классический", 0], ["Миндальный", 70], ["Шоколадный", 50]] }] },
        { id: "chz", cat: "Десерты", name: "Чизкейк", img: "cheesecake", price: 260, desc: "Нью-Йорк с ягодным соусом.", opts: [] },
        { id: "cake", cat: "Десерты", name: "Шоколадный торт", img: "cake", price: 290, desc: "Бельгийский шоколад, ганаш, кусочек 140 г.", opts: [] }
      ],
      cartNote: "Бариста начнёт готовить ко времени, которое вы выберете.",
      checkout: [
        { key: "time", name: "Когда заберёте", vals: ["Как можно скорее", "Через 15 мин", "Через 30 мин", "К 9:30"] },
        { key: "place", name: "Кофейня", vals: ["Ленина, 5", "ТЦ «Галерея»"] },
        { key: "pay", name: "Оплата", vals: ["СБП", "Картой", "Бонусами"] },
        { key: "note", name: "Комментарий бариста", ph: "Например: погорячее" }
      ],
      finish: function (s) { return "Здесь прошла бы оплата через " + s.co.pay + ", а бариста получил бы заказ на «" + s.co.time.toLowerCase() + "» в кофейне на " + s.co.place + "."; }
    };
    var shop = {
      title: "Shop", skin: "skin-shop", cartLabel: "Корзина", payLabel: "Оплатить",
      hero: '<b>−15% на первый заказ</b><span>Промокод применится автоматически</span>',
      cats: ["Одежда", "Аксессуары"],
      items: [
        { id: "tee", cat: "Одежда", name: "Футболка Basic", img: "tee", price: 1990, desc: "Плотный хлопок 220 г/м², свободный крой.", opts: [{ name: "Размер", vals: [["S", 0], ["M", 0], ["L", 0], ["XL", 200]] }, { name: "Цвет", vals: [["Белый", 0], ["Чёрный", 0], ["Серый", 0]] }], badge: "Хит" },
        { id: "hood", cat: "Одежда", name: "Худи Oversize", img: "hoodie", price: 3490, desc: "Футер с начёсом, капюшон на подкладке.", opts: [{ name: "Размер", vals: [["S", 0], ["M", 0], ["L", 0], ["XL", 300]] }, { name: "Цвет", vals: [["Меланж", 0], ["Чёрный", 0]] }] },
        { id: "sw", cat: "Одежда", name: "Свитшот Cloud", img: "sweatshirt", price: 2990, desc: "Мягкий трикотаж, спущенное плечо.", opts: [{ name: "Размер", vals: [["S", 0], ["M", 0], ["L", 0]] }] },
        { id: "cap", cat: "Аксессуары", name: "Кепка Trucker", img: "cap", price: 1290, desc: "Регулируемая застёжка, сетка сзади.", opts: [{ name: "Цвет", vals: [["Белый", 0], ["Чёрный", 0]] }] },
        { id: "tote", cat: "Аксессуары", name: "Шоппер Canvas", img: "tote", price: 890, desc: "Плотный канвас, внутренний карман.", opts: [] },
        { id: "bp", cat: "Аксессуары", name: "Рюкзак Leather", img: "backpack", price: 6990, desc: "Натуральная кожа, отделение для ноутбука 14\".", opts: [{ name: "Цвет", vals: [["Коньяк", 0], ["Чёрный", 500]] }], badge: "New" }
      ],
      checkout: [
        { key: "del", name: "Доставка", vals: ["Курьер · 1–2 дня", "Пункт выдачи", "Самовывоз"] },
        { key: "name", name: "Имя", ph: "Иван" },
        { key: "phone", name: "Телефон", ph: "+7 900 000-00-00", type: "tel" },
        { key: "addr", name: "Адрес", ph: "Город, улица, дом" },
        { key: "pay", name: "Оплата", vals: ["СБП", "Картой", "Telegram Stars"] }
      ],
      feeLabel: "Доставка",
      fee: function (s) { return /Курьер/.test(s.co.del) && total() < 5000 ? 390 : 0; },
      finish: function (s) { return "Здесь прошла бы оплата через " + s.co.pay + ", а заказ появился бы в админ-боте магазина со статусом «Новый»."; }
    };
    return { coffee: coffee, shop: shop };
  }
})();
