(() => {
  const d = document.documentElement; d.classList.add("js");
  const els = document.querySelectorAll(".sec .h2, .sec .muted, .svc-card, .sol-card, .steps, .cmp-tbl, .ptbl, .fcard, .ccard, .calc, .faq");
  if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("on"));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((e, i) => { e.classList.add("rv"); e.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(e); });
})();
(() => {
  const b = document.querySelector(".burger"), nav = document.getElementById("nav");
  b && b.addEventListener("click", () => { const o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
  const CW = window.CW, f = document.getElementById("order-form");
  if (!CW || !f) return;
  const rub = (v) => new Intl.NumberFormat("ru-RU").format(v) + " ₽";
  const P = Object.fromEntries(CW.projects.map((p) => [p.id, p])), F = Object.fromEntries(CW.features.map((p) => [p.id, p]));
  const picked = f.querySelector(".sol-picked"), feat = f.querySelector(".feat"), msg = f.querySelector(".form-msg");
  let solution = null;
  const calc = () => {
    const pr = P[f.project.value]; const fs = [...f.querySelectorAll('[name=features]:checked')].map((i) => F[i.value]);
    const tp = document.getElementById("total-price"), td = document.getElementById("total-days");
    if (solution) { tp.textContent = rub(solution.price); td.textContent = "готовое решение · запуск 1–3 дня"; return; }
    const s = (k) => [pr, ...fs].reduce((a, x) => a + x[k], 0);
    tp.textContent = `${rub(s("min"))} – ${rub(s("max"))}`;
    td.textContent = pr.id === "system" ? "3–5 недель" : `${s("daysMin")}–${s("daysMax")} дней`;
  };
  const setSolution = (id) => {
    solution = CW.solutions.find((s) => s.id === id) || null;
    picked.hidden = !solution; feat.classList.toggle("off", !!solution);
    if (solution) { picked.querySelector("span").textContent = `Готовое решение: ${solution.title} — ${rub(solution.price)}`;
      f.querySelector(`[name=project][value=${solution.project}]`).checked = true;
      f.querySelectorAll("[name=features]").forEach((i) => (i.checked = false)); }
    calc();
  };
  f.addEventListener("change", (e) => { if (e.target.name === "project" && solution && e.target.value !== solution.project) setSolution(null); else calc(); });
  picked.querySelector(".x").addEventListener("click", () => setSolution(null));
  document.querySelectorAll("[data-solution]").forEach((btn) => btn.addEventListener("click", () => {
    setSolution(btn.dataset.solution); document.getElementById("zayavka").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => f.description.focus({ preventScroll: true }), 500);
  }));
  const normContact = (v) => {
    v = v.trim(); if (/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v)) return "@" + v.replace(/^@/, "");
    let d = v.replace(/[^\d+]/g, ""); if (/^8\d{10}$/.test(d)) d = "+7" + d.slice(1); if (/^7\d{10}$/.test(d)) d = "+" + d;
    return /^\+[1-9]\d{9,14}$/.test(d) ? d : null;
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  let sid = uuid(), busy = false;
  f.addEventListener("input", () => { sid = uuid(); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault(); if (busy) return;
    const say = (t, ok) => { msg.textContent = t; msg.className = "form-msg " + (ok ? "ok" : "err"); };
    const contact = normContact(f.contact.value), description = f.description.value.trim();
    if (description.length < 10) return say("Опишите задачу хотя бы парой предложений.");
    if (!contact) return say("Укажите Telegram @username (от 5 символов) или телефон, например +7 900 000-00-00.");
    if (!f.consent.checked) return say("Отметьте согласие на обработку контактов.");
    const body = { submission_id: sid, contact, project: f.project.value, description, consent: true, website: f.website.value,
      features: solution ? [] : [...f.querySelectorAll('[name=features]:checked')].map((i) => i.value) };
    if (solution) body.solution_id = solution.id;
    busy = true; const btn = f.querySelector("[type=submit]"); btn.disabled = true; say("Отправляем…", true);
    try {
      const send = (b) => fetch(CW.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      let r = await send(body);
      if (r.status === 422 && body.solution_id) { // backend may not know a newer solution yet: send it as a regular request
        const sol = solution; delete body.solution_id; body.submission_id = uuid();
        body.description = `[Готовое решение: ${sol.title}${sol.price ? " — " + Number(sol.price).toLocaleString("ru-RU") + " ₽" : ""}] ` + description;
        r = await send(body);
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : "Проверьте поля формы и попробуйте ещё раз.");
      say(`Заявка №${j.id} принята ✅ Ответим в течение часа (9:00–22:00 МСК). Быстрее — в боте @codwey_bot.`, true);
      f.reset(); setSolution(null); sid = uuid();
    } catch (err) {
      say((err.message && !/fetch/i.test(err.message) ? err.message : "Не получилось отправить.") + " Напишите нам в Telegram @mexciti или в бот.");
    } finally { busy = false; btn.disabled = false; }
  });
  calc();
})();
