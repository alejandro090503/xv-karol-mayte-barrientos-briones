/* KAROL MAYTE XV · "todo levita u ondea" + brillos que caen.
   - Levitación: usa las propiedades CSS `translate`/`rotate`/`scale` (no `transform`), así no choca
     con GSAP (reveals y parallax escriben `transform`).
   - Solo se animan los elementos cercanos a la pantalla (IntersectionObserver) para cuidar el iPhone.
   - Brillos: un solo <canvas> fijo, ~60 motas tipo glitter (marfil, rosa, salvia) que caen y titilan. */
(function () {
  "use strict";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  // ── 1. Ramos extra que se mecen (dibujos) en las secciones que no tenían ──
  var ramos = [
    ["#familia", "ky-flor--r", "a"],
    ["#ubicaciones", "ky-flor--l", "b"],
    ["#itinerario", "ky-flor--r", "a"],
    ["#album", "ky-flor--l", "b"],
    ["#confirmacion", "ky-flor--r", "a"],
    [".social", "ky-flor--l ky-flor--low", "a"],
  ];
  ramos.forEach(function (r) {
    var sec = document.querySelector(r[0]);
    if (!sec) return;
    var f = document.createElement("div");
    f.className = "ky-flor " + r[1] + " ky-flor--" + r[2];
    f.setAttribute("aria-hidden", "true");
    sec.insertBefore(f, sec.firstChild);
  });

  // ── 2. Levitación / ondeo en cada card y elemento ──
  var grupos = [
    [".gift-option", "ky-float"],
    [".timeline-event", "ky-float ky-float--sm"],
    [".countdown .time-block", "ky-bob"],
    [".calendar", "ky-float ky-float--slow"],
    [".fecha-evento", "ky-sway"],
    [".rsvp-card", "ky-float ky-float--slow ky-float--sm"],
    [".photo-frame", "ky-float ky-float--slow"],
    [".venue-icon, .gift-icon, .transfer-icon, .timeline-icon", "ky-bob"],
    [".calendar-actions .button, .venue .button, .social .button", "ky-float ky-float--sm"],
    [".hashtag, .dress .script, .signature, .photo-caption, .ending .script", "ky-wave"],
    [".section > h2", "ky-wave ky-wave--soft"],
    [".rule, .rsvp-divider", "ky-breath"],
    [".heart, .rsvp-divider-heart, .rsvp-ornament", "ky-beat"],
    ["details", "ky-float ky-float--sm"],
    [".c3-hint, .scroll-cue", "ky-bob"],
  ];
  var vivos = [];
  grupos.forEach(function (g) {
    $$(g[0]).forEach(function (el, i) {
      g[1].split(" ").forEach(function (c) { el.classList.add(c); });
      el.style.setProperty("--ky-d", (-(i * 1.37) % 6).toFixed(2) + "s"); // desfase entre hermanos
      vivos.push(el);
    });
  });
  $$(".ky-flor, .floral").forEach(function (el) { vivos.push(el); });

  if (!reduced) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle("ky-on", e.isIntersecting); });
      }, { rootMargin: "120px 0px" });
      vivos.forEach(function (el) { io.observe(el); });
    } else {
      vivos.forEach(function (el) { el.classList.add("ky-on"); });
    }
  }

  // El resplandor de la portada corre siempre por CSS; solo se pausa cuando la portada sale de pantalla.
  var glow = document.querySelector(".hero-glow");
  if (glow && !reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      glow.classList.toggle("is-paused", !es[0].isIntersecting);
    }).observe(document.querySelector(".hero"));
  }

  // ── 3. Brillos cayendo (glitter premium) ──
  if (reduced) return;
  var cv = document.createElement("canvas");
  cv.className = "ky-glitter";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var colores = [[251, 247, 242], [251, 247, 242], [233, 168, 188], [246, 219, 228], [141, 181, 150]];
  var motas = [];
  function size() {
    var shell = document.querySelector(".phone-preview-stage");
    var w = shell ? Math.min(shell.getBoundingClientRect().width, innerWidth) : innerWidth;
    W = Math.round(w); H = innerHeight;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function nueva(top) {
    var big = Math.random() < 0.12;
    return {
      x: Math.random() * W,
      y: top ? -10 : Math.random() * H,
      r: big ? 1.6 + Math.random() * 1.2 : 0.5 + Math.random() * 1.0,
      vy: 0.18 + Math.random() * 0.42,
      sway: 0.3 + Math.random() * 0.7,
      ph: Math.random() * Math.PI * 2,
      tw: 0.015 + Math.random() * 0.03,
      c: colores[(Math.random() * colores.length) | 0],
      big: big,
    };
  }
  size();
  var N = W < 500 ? 55 : 75;
  for (var i = 0; i < N; i++) motas.push(nueva(false));
  var corriendo = true, t = 0;
  function frame() {
    if (!corriendo) return;
    t++;
    ctx.clearRect(0, 0, W, H);
    for (var k = 0; k < motas.length; k++) {
      var m = motas[k];
      m.y += m.vy;
      m.x += Math.sin(t * 0.01 + m.ph) * m.sway * 0.35;
      if (m.y > H + 10) { motas[k] = nueva(true); continue; }
      var a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * m.tw + m.ph));
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + m.c[0] + "," + m.c[1] + "," + m.c[2] + "," + a.toFixed(3) + ")";
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
      if (m.big && a > 0.75) { // destello en cruz de las motas grandes
        ctx.strokeStyle = "rgba(255,255,255," + ((a - 0.75) * 2).toFixed(3) + ")";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(m.x - m.r * 3, m.y); ctx.lineTo(m.x + m.r * 3, m.y);
        ctx.moveTo(m.x, m.y - m.r * 3); ctx.lineTo(m.x, m.y + m.r * 3);
        ctx.stroke();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", function () {
    var antes = corriendo;
    corriendo = !document.hidden;
    if (corriendo && !antes) requestAnimationFrame(frame);
  });
  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(size, 150); }, { passive: true });
})();
