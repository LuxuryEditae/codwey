/* CodWay demo sites: tabs, filters, modals, booking steps, calculator, demo forms. No dependencies. */
(function () {
  var S = window.DEMO_SITE || {}, d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var rub = function (n) { return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₽"; };
  var MARK = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 8 86 29v42L50 92 14 71V29z"/><path d="m41 40-9 10 9 10M59 40l9 10-9 10"/></svg>';
  // floating demo badge
  var bar = d.createElement("div"); bar.className = "cw-bar";
  bar.innerHTML = MARK + '<a class="cw-home" href="/sajt-na-zakaz/#demo-sajty" title="Все демо-сайты на codway.su"><b>Демо-сайт</b><span class="cw-long"> от CodWay · ' + (S.price || "") + '</span></a><a href="' + S.link + '" target="_blank" rel="noopener">Хочу такой →</a><button type="button" aria-label="Скрыть">×</button>';
  bar.lastChild.onclick = function () { bar.remove(); };
  d.body.appendChild(bar);
  // final modal
  var fm = d.createElement("div"); fm.className = "cw-modal"; fm.setAttribute("role", "dialog"); fm.setAttribute("aria-modal", "true");
  fm.innerHTML = '<div class="cw-card"><div class="cw-ic">' + MARK + '</div><h3>Это демо-сайт</h3><p class="cw-txt"></p><p class="cw-sub">CodWay сделает такой же сайт под ваш бизнес за ' + (S.days || "5–7 дней") + ' — с вашими текстами, фото и заявками прямо в Telegram. Готовое решение — ' + (S.price || "") + '.</p><a class="cw-go" href="' + S.link + '" target="_blank" rel="noopener">Обсудить в @codwey_bot</a><button class="cw-x" type="button">Вернуться к сайту</button></div>';
  d.body.appendChild(fm);
  var closeAll = function () { $$(".modal.on").forEach(function (m) { m.classList.remove("on"); }); };
  var finish = function (txt) { closeAll(); $(".cw-txt", fm).textContent = txt || "Заявка никуда не отправилась — на настоящем сайте она сразу пришла бы владельцу в Telegram."; fm.classList.add("on"); d.body.classList.add("lock"); };
  var hideFinish = function () { fm.classList.remove("on"); d.body.classList.remove("lock"); };
  fm.addEventListener("click", function (e) { if (e.target === fm || e.target.closest(".cw-x")) hideFinish(); });
  window.demoFinish = finish;
  // modals
  var open = function (id, src) { var m = d.getElementById(id); if (!m) return; m.classList.add("on"); d.body.classList.add("lock"); m.dispatchEvent(new CustomEvent("open", { detail: src })); var f = $("input,select,button:not([data-close])", m); if (f && matchMedia("(min-width:700px)").matches) setTimeout(function () { f.focus(); }, 60); };
  d.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]"); if (o) { e.preventDefault(); open(o.dataset.open, o); return; }
    var c = e.target.closest("[data-close]"); if (c || e.target.classList.contains("modal")) { closeAll(); d.body.classList.remove("lock"); }
    var b = e.target.closest("[data-burger]"); if (b) d.body.classList.toggle("nav-on");
    if (e.target.closest(".nav a")) d.body.classList.remove("nav-on");
  });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeAll(); hideFinish(); } });
  // tabs: [data-tabs] > [data-tab]  ↔  [data-panel] inside same [data-tabs-root]
  $$("[data-tabs-root]").forEach(function (root) {
    var btns = $$("[data-tab]", root), panels = $$("[data-panel]", root);
    btns.forEach(function (b) { b.addEventListener("click", function () {
      btns.forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
      panels.forEach(function (p) { p.hidden = p.dataset.panel !== b.dataset.tab; });
    }); });
  });
  // filters: [data-filter-root] > [data-filter] + [data-cat]
  $$("[data-filter-root]").forEach(function (root) {
    var btns = $$("[data-filter]", root), items = $$("[data-cat]", root);
    btns.forEach(function (b) { b.addEventListener("click", function () {
      btns.forEach(function (x) { x.classList.toggle("on", x === b); });
      items.forEach(function (i) { i.hidden = b.dataset.filter !== "all" && i.dataset.cat.indexOf(b.dataset.filter) < 0; });
    }); });
  });
  // steppers
  $$("[data-stepper]").forEach(function (s) { var i = $("input", s), min = +i.min || 1, max = +i.max || 99;
    $$("button", s).forEach(function (b) { b.addEventListener("click", function () { i.value = Math.min(max, Math.max(min, (+i.value || min) + (+b.dataset.d))); i.dispatchEvent(new Event("input", { bubbles: true })); }); }); });
  // date inputs default to tomorrow
  $$('input[type=date]').forEach(function (i) { var t = new Date(Date.now() + 864e5); i.min = new Date().toISOString().slice(0, 10); if (!i.value) i.value = t.toISOString().slice(0, 10); });
  // phone mask
  $$('input[type=tel]').forEach(function (i) { i.addEventListener("input", function () {
    var v = i.value.replace(/\D/g, ""); if (!v) { i.value = ""; return; } if (v[0] === "8") v = "7" + v.slice(1); if (v[0] !== "7") v = "7" + v; v = v.slice(0, 11);
    var o = "+7"; if (v.length > 1) o += " (" + v.slice(1, 4); if (v.length >= 4) o += ") " + v.slice(4, 7); if (v.length >= 7) o += "-" + v.slice(7, 9); if (v.length >= 9) o += "-" + v.slice(9, 11); i.value = o; }); });
  // demo forms
  $$("form[data-demo]").forEach(function (f) { f.noValidate = true; f.addEventListener("submit", function (e) {
    e.preventDefault(); var bad = null;
    $$("[required]", f).forEach(function (i) { var ok = i.type === "checkbox" ? i.checked : i.type === "tel" ? i.value.replace(/\D/g, "").length === 11 : i.value.trim().length > 1; i.classList.toggle("bad", !ok); if (!ok && !bad) bad = i; });
    if (bad) { bad.focus(); return; }
    var name = (f.elements.name && f.elements.name.value.trim().split(" ")[0]) || "";
    var msg = f.dataset.demo || "на настоящем сайте заявка сразу пришла бы владельцу в Telegram."; finish(name ? name + ", " + msg : msg.charAt(0).toUpperCase() + msg.slice(1));
    f.reset(); $$('input[type=date]', f).forEach(function (i) { i.value = new Date(Date.now() + 864e5).toISOString().slice(0, 10); });
  }); });
  // header state
  var hd = $(".hdr"); if (hd) { var on = function () { hd.classList.toggle("scr", scrollY > 30); }; on(); addEventListener("scroll", on, { passive: true }); }
  // reveal on scroll
  if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { io.observe(el); }); } else $$(".rv").forEach(function (el) { el.classList.add("in"); });
  // ---- beauty: multi-step booking ----
  var bk = d.getElementById("bkm");
  if (bk) {
    var st = { step: 1 }, steps = $$(".bk-step", bk), dots = $$(".bk-dots i", bk), back = $(".bk-back", bk), next = $(".bk-next", bk);
    var days = $(".bk-days", bk), times = $(".bk-times", bk), sum = $(".bk-sum", bk);
    var wd = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"], mo = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    days.innerHTML = Array.from({ length: 10 }, function (_, i) { var x = new Date(Date.now() + i * 864e5); return '<button type="button" data-v="' + (i === 0 ? "Сегодня" : x.getDate() + " " + mo[x.getMonth()]) + '"><small>' + (i === 0 ? "сег" : wd[x.getDay()]) + "</small><b>" + x.getDate() + "</b></button>"; }).join("");
    var renderTimes = function (seed) { var sl = ["10:00", "11:00", "12:30", "13:30", "15:00", "16:00", "17:30", "18:30", "19:30"]; times.innerHTML = sl.map(function (t, i) { var busy = (i * 5 + seed) % 4 === 0; return '<button type="button"' + (busy ? " disabled" : "") + ' data-v="' + t + '">' + t + "</button>"; }).join(""); };
    renderTimes(1);
    var pick = function (wrap, key, cb) { wrap.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; $$("button", wrap).forEach(function (x) { x.classList.toggle("on", x === b); }); st[key] = b.dataset.v; st[key + "P"] = b.dataset.p; if (cb) cb(b); upd(); }); };
    pick($(".bk-svc", bk), "svc"); pick($(".bk-mst", bk), "mst"); pick(days, "day", function (b) { st.time = null; renderTimes([].indexOf.call(days.children, b) + 2); }); pick(times, "time");
    var need = { 1: "svc", 2: "mst", 3: "time" };
    var upd = function () {
      steps.forEach(function (s, i) { s.hidden = i + 1 !== st.step; }); dots.forEach(function (x, i) { x.classList.toggle("on", i < st.step); });
      back.style.visibility = st.step > 1 ? "visible" : "hidden";
      next.textContent = st.step === 4 ? "Подтвердить запись" : "Далее"; next.disabled = st.step < 4 && !st[need[st.step]] || (st.step === 3 && !st.day);
      sum.innerHTML = [st.svc && "<b>" + st.svc + "</b>" + (st.svcP ? " · " + st.svcP : ""), st.mst && "Мастер: " + st.mst, st.day && st.time && st.day + ", " + st.time].filter(Boolean).join("<br>") || "Выберите услугу";
    };
    back.onclick = function () { st.step--; upd(); };
    next.onclick = function () {
      if (st.step < 4) { st.step++; upd(); return; }
      var f = $(".bk-form", bk), n = f.elements.name, p = f.elements.phone, ok1 = n.value.trim().length > 1, ok2 = p.value.replace(/\D/g, "").length === 11;
      n.classList.toggle("bad", !ok1); p.classList.toggle("bad", !ok2); if (!ok1 || !ok2) return;
      finish(n.value.trim().split(" ")[0] + ", на настоящем сайте вы были бы записаны на «" + st.svc + "» к мастеру " + st.mst + " — " + st.day + " в " + st.time + ". Клиенту пришло бы SMS, мастеру — уведомление в Telegram, а за день до визита — напоминание.");
      st = { step: 1 }; $$(".on", bk).forEach(function (x) { if (x.tagName === "BUTTON") x.classList.remove("on"); }); f.reset(); upd();
    };
    bk.addEventListener("open", function (e) { var src = e.detail; st.step = 1;
      if (src && src.dataset.svc) { var b = $('.bk-svc [data-v="' + src.dataset.svc + '"]', bk); if (b) { b.click(); st.step = 2; } }
      if (src && src.dataset.mst) { var m = $('.bk-mst [data-v="' + src.dataset.mst + '"]', bk); if (m) { m.click(); st.step = st.svc ? 3 : 1; } }
      upd(); });
    upd();
  }
  // ---- remont: before/after slider ----
  $$("[data-ba]").forEach(function (b) { var r = $("input", b); var f = function () { b.style.setProperty("--x", r.value + "%"); }; r.addEventListener("input", f); f(); });
  // ---- remont: calculator ----
  var cf = d.getElementById("calc");
  if (cf) {
    var out = function () {
      var a = +cf.area.value, t = cf.querySelector("[name=type]:checked"), r = +t.dataset.rate, k = cf.querySelector("[name=house]:checked").value === "new" ? 1 : 1.12;
      var opt = $$("[name=opt]:checked", cf).reduce(function (s, o) { return s + (o.dataset.m ? +o.dataset.m * a : +o.dataset.f); }, 0);
      var tot = a * r * k + opt, days = Math.round(a * +t.dataset.d + ($$("[name=opt]:checked", cf).length * 2));
      $(".c-area", cf).textContent = a + " м²"; cf.area.style.setProperty("--p", ((a - cf.area.min) / (cf.area.max - cf.area.min) * 100) + "%");
      $(".c-tot", cf).textContent = rub(Math.round(tot / 1000) * 1000); $(".c-days", cf).textContent = "≈ " + Math.max(10, days) + " рабочих дней";
      $(".c-mon", cf).textContent = rub(Math.round(tot / 12 / 100) * 100) + "/мес"; $(".c-m2", cf).textContent = rub(Math.round(tot / a / 10) * 10) + " за м²";
      cf.dataset.sum = $(".c-tot", cf).textContent;
    };
    cf.addEventListener("input", out); cf.addEventListener("change", out); out();
    cf.addEventListener("submit", function (e) { e.preventDefault(); var lead = d.getElementById("lead"); $(".lead-sum", lead).textContent = "Ваш расчёт: " + cf.dataset.sum + " · " + cf.area.value + " м² · " + cf.querySelector("[name=type]:checked").parentNode.querySelector("b").textContent; open("lead"); });
  }
})();
