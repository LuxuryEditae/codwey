/* CodWay demo core: Telegram WebApp integration + shared helpers */
(function () {
  var D = window.DEMO || {};
  var tg = window.Telegram && window.Telegram.WebApp;
  var inTG = !!(tg && tg.initData);
  var root = document.documentElement;
  D.tg = tg; D.inTG = inTG;
  if (inTG) {
    document.body.classList.add("in-tg");
    tg.ready(); tg.expand();
    var applyTheme = function () {
      var p = tg.themeParams || {}, map = { bg_color: "--a-bg", secondary_bg_color: "--a-bg2", text_color: "--a-txt", hint_color: "--a-hint", button_color: "--a-btn", button_text_color: "--a-btn-txt", link_color: "--a-link", section_bg_color: "--a-card", destructive_text_color: "--a-red" };
      for (var k in map) if (p[k]) root.style.setProperty(map[k], p[k]);
      document.body.classList.toggle("tg-dark", tg.colorScheme === "dark");
      if (tg.setHeaderColor && p.bg_color) try { tg.setHeaderColor(p.bg_color); } catch (e) {}
    };
    applyTheme(); tg.onEvent("themeChanged", applyTheme);
  }
  D.$ = function (s, r) { return (r || document).querySelector(s); };
  D.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  D.rub = function (v) { return new Intl.NumberFormat("ru-RU").format(v).replace(/\u00a0/g, " ") + " ₽"; };
  D.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  D.haptic = function (t) { try { if (inTG) tg.HapticFeedback.impactOccurred(t || "light"); } catch (e) {} };
  D.openBot = function () {
    if (inTG) tg.openTelegramLink(D.link); else window.open(D.link, "_blank", "noopener");
  };
  D.close = function () { if (inTG) tg.close(); else location.href = "/#gotovye"; };
  /* Final step of every demo: explain it is a demo, offer the real thing in @codway_bot */
  D.finish = function (what) {
    D.haptic("medium");
    try { if (inTG) tg.HapticFeedback.notificationOccurred("success"); } catch (e) {}
    var host = document.getElementById("app");
    var old = host.querySelector(".dsheet"); if (old) old.remove();
    var el = document.createElement("div");
    el.className = "dsheet";
    el.innerHTML = '<div class="dsheet-bg"></div><div class="dsheet-card" role="dialog" aria-modal="true" aria-label="Это демо"><i class="dsheet-grab"></i><div class="dsheet-ic">✓</div><b>Это демо-версия</b><p>' + (what || "В настоящем решении здесь прошла бы оплата и заказ.") + '</p><p class="dsheet-sub">Хотите такое же решение для своего бизнеса? Сроки подберём под вас. Напишите в бот — ответим в течение часа.</p><button class="dsheet-go" type="button">Обсудить в @codway_bot</button><button class="dsheet-x" type="button">Продолжить демо</button></div>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("on"); });
    var shut = function () { el.classList.remove("on"); setTimeout(function () { el.remove(); }, 300); };
    el.querySelector(".dsheet-go").onclick = function () { D.openBot(); };
    el.querySelector(".dsheet-x").onclick = shut;
    el.querySelector(".dsheet-bg").onclick = shut;
  };
})();
