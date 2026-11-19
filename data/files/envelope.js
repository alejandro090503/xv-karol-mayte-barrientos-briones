/* Mantiene sobreSelloInteraccion y sobreSelloAbierto. Animación local de Lidia. */
(() => {
  "use strict";
  const envelope = document.getElementById("sobre-sello");
  const main = document.querySelector(".phone-preview-shell");
  const button = envelope.querySelector(".seal-button");
  let opening = false;
  let finished = false;
  let revealing = false;
  let timeline;
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
    if (opening)
      document.getElementById("inicio").focus({ preventScroll: true });
  }
  async function open() {
    if (opening) return;
    opening = true;
    button.disabled = true;
    // Debe ocurrir sin esperar al timeline: habilita el audio en Safari/iOS.
    document.dispatchEvent(new CustomEvent("sobreSelloInteraccion"));
    window.scrollTo({ top: 0, behavior: "instant" });
    // Música/video conservan el gesto directo. La preparación de la escena
    // termina antes de mover el sello, nunca mientras se escribe el nombre.
    try {
      await window.lidiaMotionReady;
    } catch (error) {
      console.error("Lidia / preparación de movimiento:", error);
    }
    if (finished) return;
    if (motion.matches || !window.gsap) {
      complete();
      return;
    }
    watchdog = setTimeout(complete, 6000);
    timeline = gsap
      .timeline({ onComplete: complete, defaults: { ease: "power2.inOut" } })
      .to(button, { scale: 0.92, duration: 0.18 })
      .to(button, {
        scale: 1.09,
        y: -16,
        rotation: -9,
        opacity: 0,
        duration: 0.5,
      })
      .to(
        ".envelope-heading, .envelope-instruction, .envelope-bottom-copy",
        { opacity: 0, duration: 0.35 },
        "<",
      )
      .to(
        ".envelope-flap-wrap",
        { rotationX: 172, duration: 1, ease: "power2.inOut" },
        "-=.12",
      )
      .set(".envelope-flap-wrap", { zIndex: 1 })
      .to(".envelope-letter", { yPercent: -28, duration: 0.9 }, "-=.3")
      .to(".envelope-side--left", { xPercent: -14, duration: 0.8 }, "<")
      .to(".envelope-side--right", { xPercent: 14, duration: 0.8 }, "<")
      .to(".envelope-bottom", { yPercent: 20, duration: 0.8 }, "<")
      .to(envelope, { yPercent: 12, opacity: 0, duration: 0.8 }, "-=.2")
      .call(reveal, [], "-=.65");
  }
  motion.addEventListener("change", () => {
    if (motion.matches && opening && !finished) {
      timeline?.kill();
      complete();
    }
  });
  if (document.body.dataset.sobre === "false") {
    Promise.resolve(window.lidiaMotionReady).then(complete, complete);
    return;
  }
  envelope.hidden = false;
  main.inert = true;
  document.body.classList.add("envelope-closed");
  button.addEventListener("click", open);
  envelope.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      button.focus();
    }
    if (event.key === "Escape") open();
  });
})();
