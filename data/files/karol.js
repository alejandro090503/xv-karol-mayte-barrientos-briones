/* KAROL MAYTE XV · menú de secciones flotante + capa de vida extra (sheen, máscara de fotos, tilt). */
(function () {
  "use strict";
  var SECCIONES = [
    ["inicio", "Inicio"],
    ["familia", "Familia"],
    ["fecha", "Fecha"],
    ["ubicaciones", "Lugares"],
    ["itinerario", "Itinerario"],
    ["vestimenta", "Vestimenta"],
    ["regalos", "Regalos"],
    ["album", "Álbum"],
    ["confirmacion", "Confirmar"],
  ].filter(function (s) { return document.getElementById(s[0]); });
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var shareSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
  var closeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  // ── Píldora ──
  var nav = el("nav", "ky-nav"); nav.setAttribute("aria-label", "Secciones de la invitación");
  var mono = el("a", "ky-mono", "XV"); mono.href = "#inicio"; mono.setAttribute("aria-label", "Ir al inicio");
  var links = el("div", "ky-links"); var pill = el("span", "ky-pill"); pill.setAttribute("aria-hidden", "true"); links.appendChild(pill);
  SECCIONES.forEach(function (s) { var a = el("a", "", s[1]); a.href = "#" + s[0]; a.dataset.sec = s[0]; links.appendChild(a); });
  var sep = el("span", "ky-sep"); sep.setAttribute("aria-hidden", "true");
  var share = el("button", "ky-icon-btn", shareSvg); share.type = "button"; share.setAttribute("aria-label", "Compartir invitación");
  var menuBtn = el("button", "ky-menu-btn", "☰ Menú"); menuBtn.type = "button"; menuBtn.setAttribute("aria-expanded", "false");
  nav.append(mono, links, sep, share, menuBtn);

  // ── Hoja a pantalla completa ──
  var sheet = el("div", "ky-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Menú de secciones"); sheet.hidden = false;
  var top = el("div", "ky-sheet-top"); var mono2 = el("span", "ky-mono", "XV");
  var close = el("button", "ky-icon-btn ky-close", closeSvg); close.type = "button"; close.setAttribute("aria-label", "Cerrar menú");
  top.append(mono2, close);
  var list = el("ol", "ky-list");
  SECCIONES.forEach(function (s, i) {
    var li = el("li"); li.style.setProperty("--i", i);
    var a = el("a"); a.href = "#" + s[0]; a.dataset.sec = s[0];
    var n = el("span", "", String(i + 1).padStart(2, "0")); a.append(n, document.createTextNode(s[1]));
    li.appendChild(a); list.appendChild(li);
  });
  var foot = el("p", "ky-sheet-foot", "Sábado 26 · Diciembre · 2026<br>Dolores Hidalgo, Gto.");
  sheet.append(top, list, foot);
  var toast = el("div", "ky-toast"); toast.setAttribute("role", "status");
  document.body.append(nav, sheet, toast);

  function openSheet() { sheet.classList.add("is-open"); menuBtn.setAttribute("aria-expanded", "true"); close.focus({ preventScroll: true }); }
  function closeSheet() { sheet.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", openSheet);
  close.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  function go(id) {
    var t = document.getElementById(id); if (!t) return;
    var y = t.getBoundingClientRect().top + window.scrollY - (innerWidth >= 1024 ? 84 : 0);
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? "auto" : "smooth" });
  }
  [links, list, mono].forEach(function (c) {
    c.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a) return;
      e.preventDefault(); closeSheet();
      go(a.getAttribute("href").slice(1));
    });
  });

  share.addEventListener("click", function () {
    var url = location.origin + location.pathname;
    var data = { title: "Mis XV años · Karol Mayte", text: "Te invito a mis XV años · 26 de diciembre de 2026", url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
      toast.textContent = "Enlace copiado"; toast.classList.add("is-on"); setTimeout(function () { toast.classList.remove("is-on"); }, 1800);
    }).catch(function () {});
  });

  // Aparece después de abrir el sobre (o de inmediato si no hay sobre)
  function show() { setTimeout(function () { nav.classList.add("is-on"); }, 600); }
  if (document.body.dataset.sobre === "false" || !document.getElementById("sobre-sello")) show();
  document.addEventListener("sobreSelloAbierto", show);
  // Red de seguridad: si la invitación se abrió por otra vía, mostrar al hacer scroll
  window.addEventListener("scroll", function onS() {
    if (!document.body.classList.contains("envelope-closed") && window.scrollY > 120) { nav.classList.add("is-on"); window.removeEventListener("scroll", onS); }
  }, { passive: true });

  // Sección activa (pastilla que se desliza + cursiva en la hoja)
  var current = "";
  function setActive(id) {
    if (id === current) return; current = id;
    Array.prototype.forEach.call(document.querySelectorAll(".ky-links a, .ky-list a"), function (a) { a.classList.toggle("is-active", a.dataset.sec === id); });
    var act = links.querySelector('a[data-sec="' + id + '"]');
    if (act) { pill.style.width = act.offsetWidth + "px"; pill.style.transform = "translate(" + act.offsetLeft + "px,-50%)"; }
  }
  function detect() {
    var mid = innerHeight * 0.4, best = SECCIONES[0][0];
    SECCIONES.forEach(function (s) { var r = document.getElementById(s[0]).getBoundingClientRect(); if (r.top <= mid) best = s[0]; });
    setActive(best);
  }
  var raf = 0;
  window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; detect(); }); }, { passive: true });
  window.addEventListener("resize", function () { current = ""; detect(); });
  detect();

  // ── Capa de vida: entra-en-pantalla robusto (IO + respaldo por scroll) ──
  var watch = [];
  function arm(nodes, armClass) {
    Array.prototype.forEach.call(nodes, function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < innerHeight * 0.92) { n.classList.add("ky-in"); return; }
      if (armClass && !reduced) n.classList.add(armClass);
      watch.push(n);
    });
  }
  function check() {
    for (var i = watch.length - 1; i >= 0; i--) {
      var r = watch[i].getBoundingClientRect();
      if (r.top < innerHeight * 0.88 && r.bottom > 0) { watch[i].classList.add("ky-in"); watch.splice(i, 1); }
    }
  }
  arm(document.querySelectorAll(".gift-option"));
  arm(document.querySelectorAll(".photo-frame"), "ky-armed");
  window.addEventListener("scroll", check, { passive: true });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) check(); }); }, { threshold: 0.1 });
    watch.forEach(function (n) { io.observe(n); });
  }

  // Tilt al tocar las cards de ubicación (en celular el toque reemplaza al hover)
  Array.prototype.forEach.call(document.querySelectorAll(".venue"), function (v) {
    function on() { v.classList.add("ky-lift"); }
    function off() { v.classList.remove("ky-lift"); }
    v.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") on(); });
    v.addEventListener("pointerleave", off);
    v.addEventListener("touchstart", function () { on(); setTimeout(off, 900); }, { passive: true });
  });
})();
