/* ELYSIUM · carrusel 3D con espejo (c3-) y card de confirmación con pases.
   El carrusel viene de xv-amelie-flores-carvajal; la card, de boda-jenifer-teran-y-edgar-jeronimo
   (aquí la respuesta va al Panel de Invitados: panel-invitados.vercel.app/api/confirmar). */

/* ── Carrusel 3D: giro automático, arrastre con inercia, pausa fuera de pantalla, visor propio ── */
(function () {
  var scene = document.getElementById("c3Scene");
  var ring = document.getElementById("c3Ring");
  if (!scene || !ring) return;
  var cards = Array.prototype.slice.call(ring.querySelectorAll(".c3-card"));
  var n = cards.length;
  if (!n) return;

  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STEP = 360 / n, AUTO = RM ? 0 : 7; /* grados por segundo */
  var radius = 260, rot = 0, vel = AUTO, dir = 1;
  var dragging = false, moved = false, startX = 0, lastX = 0, lastT = 0, dragVel = 0;
  var inView = false, lbOpen = false;
  var srcs = cards.map(function (c) {
    var im = c.querySelector(".c3-photo img");
    return im ? im.getAttribute("src") : "";
  });
  function G() { return window.gsap; }

  function layout() {
    var w = cards[0].offsetWidth || 140;
    radius = Math.round((w * 1.14 * n) / (2 * Math.PI));
    cards.forEach(function (c, i) {
      c.style.transform = "rotateY(" + i * STEP + "deg) translateZ(" + radius + "px)";
    });
    render();
  }
  function render() {
    ring.style.transform = "translateZ(" + -radius + "px) rotateY(" + rot.toFixed(3) + "deg)";
    for (var i = 0; i < n; i++) {
      var a = ((i * STEP + rot) * Math.PI) / 180;
      var f = (Math.cos(a) + 1) / 2;
      cards[i].style.opacity = (0.45 + 0.55 * f * f).toFixed(3);
    }
  }
  var last = 0;
  function frame(t) {
    var dt = last ? Math.min(t - last, 60) / 1000 : 0.0167;
    last = t;
    if (inView && !lbOpen && !dragging) {
      var target = AUTO * dir;
      vel = target + (vel - target) * Math.pow(0.14, dt);
      rot += vel * dt;
      render();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (en) { en.forEach(function (e) { inView = e.isIntersecting; }); },
      { rootMargin: "60px 0px" }
    ).observe(scene);
  } else inView = true;

  var DEG_PX = 0.32;
  scene.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false;
    startX = lastX = e.clientX; lastT = performance.now(); dragVel = 0;
    scene.classList.add("c3-dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var now = performance.now(), dx = e.clientX - lastX, dt = Math.max(1, now - lastT);
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    rot += dx * DEG_PX;
    dragVel = dragVel * 0.55 + ((dx * DEG_PX) / (dt / 1000)) * 0.45;
    lastX = e.clientX; lastT = now;
    render();
  }, { passive: true });
  function endDrag(cancel) {
    if (!dragging) return;
    dragging = false;
    scene.classList.remove("c3-dragging");
    var idle = performance.now() - lastT;
    vel = cancel || idle > 90 ? 0 : Math.max(-420, Math.min(420, dragVel));
    if (Math.abs(dragVel) > 25 && idle <= 90 && !cancel) dir = dragVel > 0 ? 1 : -1;
  }
  window.addEventListener("pointerup", function () { endDrag(false); });
  window.addEventListener("pointercancel", function () { endDrag(true); });
  scene.addEventListener("dragstart", function (e) { e.preventDefault(); });
  cards.forEach(function (c, i) {
    c.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); moved = false; return; }
      openLb(i);
    });
  });

  var lb = document.getElementById("c3Lb");
  var lbImg = document.getElementById("c3LbImg"), lbFig = document.getElementById("c3LbFig");
  var lbCount = document.getElementById("c3LbCount");
  var lbClose = document.getElementById("c3LbClose"), lbPrev = document.getElementById("c3LbPrev"), lbNext = document.getElementById("c3LbNext");
  var cur = 0, lastFocus = null, prevOverflow = "";

  function show(i, animate) {
    cur = (i + n) % n;
    var src = srcs[cur], g = G();
    lbCount.textContent = cur + 1 + " / " + n;
    lbImg.alt = "Foto " + (cur + 1) + " de " + n;
    if (animate && g && !RM) {
      g.to(lbImg, { opacity: 0, duration: 0.14, onComplete: function () {
        lbImg.src = src;
        g.to(lbImg, { opacity: 1, duration: 0.26 });
      } });
    } else lbImg.src = src;
  }
  function openLb(i) {
    if (!lb || !srcs[i]) return;
    var g = G();
    lbOpen = true; lastFocus = document.activeElement;
    show(i, false);
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    lb.hidden = false;
    if (g && !RM) {
      g.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
      g.fromTo(lbImg, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out", clearProps: "transform" });
    }
    lbClose.focus({ preventScroll: true });
  }
  function closeLb() {
    if (!lb || lb.hidden) return;
    var g = G();
    function done() {
      lb.hidden = true; lbOpen = false;
      document.documentElement.style.overflow = prevOverflow;
      if (g) g.set([lb, lbImg], { clearProps: "opacity" });
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    if (g && !RM) g.to(lb, { opacity: 0, duration: 0.22, ease: "power1.in", onComplete: done });
    else done();
  }
  if (lb) {
    lbClose.addEventListener("click", closeLb);
    lbPrev.addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1, true); });
    lbNext.addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1, true); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lbOpen) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") show(cur - 1, true);
      else if (e.key === "ArrowRight") show(cur + 1, true);
    });
    var sx = null, sy = 0;
    lbFig.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; });
    lbFig.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1), true);
    });
  }

  layout();
  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(layout, 150); }, { passive: true });
})();

/* ── Card de confirmación: ?para=Nombre&pases=N → Panel de Invitados (panel-invitados.vercel.app) ──
   Contrato: POST /api/confirmar { nombre, url_boda, estado: 'confirmado'|'declino', pases_confirmados, nombres_confirmados }
   Precarga: GET /api/confirmar?nombre=<para>&url_boda=<url>. Nunca WhatsApp. */
(function () {
  var btnYes = document.getElementById("btnYes");
  if (!btnYes) return;
  var API = "https://panel-invitados.vercel.app/api/confirmar";
  var URL_BODA = "https://xv-karol-mayte-barrientos-briones.vercel.app";
  // PENDIENTE: fecha límite RSVP. Al confirmarla, poner aquí "2026-12-XXT23:59:59-06:00"
  // y el mismo texto en #rsvp-deadline-text ("Confirma antes del …").
  var DEADLINE = null;
  var frozen = DEADLINE ? Date.now() > new Date(DEADLINE).getTime() : false;

  var limit = Math.min(16, Math.max(1, Number(document.body.dataset.guestLimit) || 16));
  var q = new URLSearchParams(location.search);
  var para = (q.get("para") || q.get("nombre") || "").trim();
  var pases = Math.min(limit, Math.max(1, parseInt(q.get("pases"), 10) || 1));

  var btnNo = document.getElementById("btnNo");
  var note = document.getElementById("rsvpPasesNote");
  var num = document.getElementById("rsvp-pases-num");
  var names = document.getElementById("namesContainer");
  var send = document.getElementById("btnEnviar");
  var btnText = document.getElementById("rsvp-btn-text");
  var bandeja = document.getElementById("rsvp-bandeja");
  var gracias = document.getElementById("rsvp-gracias");
  var gTitle = document.getElementById("rsvp-gracias-title");
  var gSub = document.getElementById("rsvp-gracias-sub");
  var editar = document.getElementById("rsvp-editar-btn");
  var feed = document.getElementById("rsvp-feedback");
  var choice = "";

  num.textContent = pases;
  note.textContent = para
    ? para + ", " + (pases === 1 ? "tienes 1 pase reservado" : "tienes " + pases + " pases reservados")
    : "";

  for (var i = 0; i < pases; i++) {
    var inp = document.createElement("input");
    inp.type = "text";
    inp.className = "rsvp-input";
    inp.maxLength = 80;
    inp.autocomplete = i === 0 ? "name" : "off";
    inp.placeholder = "Nombre completo del invitado " + (i + 1);
    inp.setAttribute("aria-label", inp.placeholder);
    names.appendChild(inp);
  }
  function inputs() { return Array.prototype.slice.call(names.querySelectorAll("input")); }

  function setFeedback(t) { feed.textContent = t || ""; }
  function select(c) {
    choice = c;
    btnYes.className = "rsvp-toggle-btn" + (c === "yes" ? " selected-yes" : "");
    btnNo.className = "rsvp-toggle-btn" + (c === "no" ? " selected-no" : "");
    names.hidden = c !== "yes";
    if (c === "no") inputs().forEach(function (x) { x.value = ""; });
    setFeedback("");
  }
  btnYes.addEventListener("click", function () { if (!frozen) select("yes"); });
  btnNo.addEventListener("click", function () { if (!frozen) select("no"); });

  function mostrarGracias(estado, lista) {
    if (estado === "confirmado") {
      gTitle.textContent = "¡Gracias por confirmar!";
      gSub.textContent = lista.length === 1
        ? "Te espero, " + lista[0] + ", para celebrar juntos mis XV años."
        : "Confirmamos " + lista.length + " lugares: " + lista.join(", ") + ".";
    } else {
      gTitle.textContent = "Gracias por avisarme";
      gSub.textContent = "Lamento que no puedas acompañarme. Te voy a extrañar.";
    }
    bandeja.hidden = true;
    gracias.hidden = false;
    editar.disabled = frozen;
  }
  function abrirBandeja() {
    gracias.hidden = true;
    bandeja.hidden = false;
    setFeedback("");
  }
  editar.addEventListener("click", function () { if (!frozen) abrirBandeja(); });

  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var colors = ["#E9A8BC", "#8DB596", "#fbf7f2", "#B04A6E"];
    var card = document.querySelector(".rsvp-card");
    if (!card) return;
    for (var k = 0; k < 28; k++) {
      var p = document.createElement("i");
      p.className = "ky-confetti";
      p.style.left = 50 + (Math.random() * 30 - 15) + "%";
      p.style.background = colors[k % colors.length];
      p.style.setProperty("--dx", (Math.random() * 260 - 130).toFixed(0) + "px");
      p.style.setProperty("--dy", (-120 - Math.random() * 160).toFixed(0) + "px");
      p.style.setProperty("--rot", (Math.random() * 720 - 360).toFixed(0) + "deg");
      p.style.animationDelay = (Math.random() * 0.15).toFixed(2) + "s";
      card.appendChild(p);
      setTimeout(function (el) { el.remove(); }, 1800, p);
    }
  }

  if (frozen) {
    send.disabled = true;
    btnText.textContent = "Confirmaciones cerradas";
  }

  // Precarga: si ya respondió, la sección arranca cerrada con el agradecimiento.
  if (para) {
    fetch(API + "?nombre=" + encodeURIComponent(para) + "&url_boda=" + encodeURIComponent(URL_BODA))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var inv = d && (d.invitado || d);
        if (!inv || !inv.estado || (inv.estado !== "confirmado" && inv.estado !== "declino")) return;
        var guardados = inv.nombres_confirmados || [];
        select(inv.estado === "confirmado" ? "yes" : "no");
        inputs().forEach(function (x, k) { if (guardados[k]) x.value = guardados[k]; });
        btnText.textContent = frozen ? "Confirmaciones cerradas" : "Actualizar respuesta";
        mostrarGracias(inv.estado, guardados);
      })
      .catch(function () {});
  }

  send.addEventListener("click", function () {
    if (frozen) return;
    if (!para) { setFeedback("Abre tu invitación desde el enlace personal que te enviaron para poder confirmar."); return; }
    if (!choice) { setFeedback("Elige si podrás asistir."); btnYes.focus(); return; }
    var lista = inputs().map(function (x) { return x.value.trim(); }).filter(Boolean);
    if (choice === "yes" && !lista.length) { setFeedback("Escribe al menos un nombre."); inputs()[0].focus(); return; }
    var estado = choice === "yes" ? "confirmado" : "declino";
    send.disabled = true;
    btnText.textContent = "Enviando…";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: para,
        url_boda: URL_BODA,
        estado: estado,
        pases_confirmados: estado === "confirmado" ? lista.length : 0,
        nombres_confirmados: estado === "confirmado" ? lista : [],
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d, status: r.status }; }); })
      .then(function (res) {
        send.disabled = false;
        if (!res.ok || (res.d && res.d.ok === false)) {
          btnText.textContent = "Confirmar asistencia";
          setFeedback(res.status === 410
            ? "Esta invitación ya no está activa. Comunícate con la familia."
            : "No pudimos guardar tu respuesta. Intenta de nuevo en un momento.");
          return;
        }
        btnText.textContent = "Actualizar respuesta";
        mostrarGracias(estado, lista);
        if (estado === "confirmado") confetti();
      })
      .catch(function () {
        send.disabled = false;
        btnText.textContent = "Confirmar asistencia";
        setFeedback("Sin conexión. Revisa tu internet e intenta de nuevo.");
      });
  });
})();
