/* KAROL MAYTE XV · sobre en video (Gemini + Flow).
   Mantiene los eventos de la base: sobreSelloInteraccion (música), sobreSelloRevelando (hero) y sobreSelloAbierto.
   Flujo: imagen fija a pantalla completa → toque → video → al subir la solapa (SOBRE_CORTE) se funde a la invitación. */
(() => {
  "use strict";
  const SOBRE_CORTE = 2.2; // segundos del video: la solapa ya va bien abierta → destello blanco y fundido
  const FUNDIDO_MS = 1650; // 0.6 s a blanco + 1 s del blanco a la invitación
  const envelope = document.getElementById("sobre-sello");
  const main = document.querySelector(".phone-preview-shell");
  const button = envelope.querySelector(".seal-button");
  const video = envelope.querySelector(".sobre-video");
  const img = envelope.querySelector(".sobre-img");
  let opening = false;
  let finished = false;
  let revealing = false;
  let fading = false;
  let watchdog;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");

  function reveal() {
    if (revealing) return;
    revealing = true;
    document.dispatchEvent(new CustomEvent("sobreSelloRevelando"));
  }
  function complete() {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    reveal();
    main.inert = false;
    document.body.classList.remove("envelope-closed");
    envelope.remove();
    document.dispatchEvent(new CustomEvent("sobreSelloAbierto"));
    if (opening) document.getElementById("inicio").focus({ preventScroll: true });
  }
  async function fundir() {
    if (fading) return;
    fading = true;
    // Fundido inmediato en cuanto sube la solapa: la invitación aparece debajo mientras el sobre se desvanece.
    document.body.classList.remove("envelope-closed");
    main.inert = false;
    envelope.classList.add("is-fading");
    setTimeout(complete, FUNDIDO_MS);
    // El hero se revela cuando GSAP está listo (casi siempre ya lo está), sin esperar más de 500 ms.
    try { await Promise.race([window.lidiaMotionReady, new Promise((r) => setTimeout(r, 500))]); } catch (e) { /* nunca bloquea */ }
    reveal();
  }
  function open() {
    if (opening) return;
    opening = true;
    button.disabled = true;
    // Debe ocurrir dentro del gesto: habilita el audio en Safari/iOS.
    document.dispatchEvent(new CustomEvent("sobreSelloInteraccion"));
    window.scrollTo({ top: 0, behavior: "instant" });
    envelope.classList.add("is-opening");
    if (motion.matches || !video) { fundir(); return; }
    watchdog = setTimeout(fundir, 4500); // respaldo si el video no avanza
    const cruce = () => { envelope.classList.add("is-playing"); };
    video.addEventListener("playing", cruce, { once: true });
    // timeupdate llega cada ~250 ms; se revisa cada 40 ms para cortar justo en SOBRE_CORTE.
    const revisa = () => { if (video.currentTime >= SOBRE_CORTE) { clearInterval(vigia); fundir(); } };
    const vigia = setInterval(revisa, 40);
    video.addEventListener("timeupdate", revisa); // respaldo si el navegador frena los temporizadores
    video.addEventListener("ended", fundir, { once: true });
    video.addEventListener("error", fundir, { once: true });
    const p = video.play();
    if (p && p.catch) p.catch(fundir);
  }

  motion.addEventListener("change", () => {
    if (motion.matches && opening && !finished) complete();
  });
  if (document.body.dataset.sobre === "false") {
    Promise.resolve(window.lidiaMotionReady).then(complete, complete);
    return;
  }
  envelope.hidden = false;
  main.inert = true;
  document.body.classList.add("envelope-closed");
  button.addEventListener("click", open);
  if (img) img.addEventListener("click", open);
  envelope.addEventListener("keydown", (event) => {
    if (event.key === "Tab") { event.preventDefault(); button.focus(); }
    if (event.key === "Escape" || event.key === "Enter") open();
  });
})();
