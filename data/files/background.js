/* Fondo opcional independiente de GSAP: la imagen es siempre el respaldo.
   body: data-background-mode="image|video", data-background-motion="true|false".
   Video: indicar una ruta en .invitation-backdrop__video[data-src]. */
(() => {
  "use strict";
  const backdrop = document.querySelector(".invitation-backdrop");
  if (!backdrop) return;
  const video = backdrop.querySelector("video");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let opened = false;
  let videoFailed = false;
  let pending = false;

  function update() {
    const active = opened && !document.hidden && !reduced.matches;
    const allowVideo =
      active &&
      document.body.dataset.backgroundMode === "video" &&
      Boolean(video.dataset.src) &&
      !videoFailed;
    backdrop.dataset.moving = String(
      active &&
        document.body.dataset.backgroundMotion === "true" &&
        !allowVideo,
    );
    if (!allowVideo) {
      video.pause();
      backdrop.dataset.videoPlaying = "false";
      return;
    }
    if (!video.hasAttribute("src")) video.src = video.dataset.src;
    if (pending || !video.paused) return;
    pending = true;
    video
      .play()
      .then(() => {
        pending = false;
        if (document.hidden || reduced.matches) update();
      })
      .catch(() => {
        pending = false;
        videoFailed = true;
        update();
      });
  }
  video.addEventListener("playing", () => {
    backdrop.dataset.videoPlaying = "true";
  });
  video.addEventListener("error", () => {
    videoFailed = true;
    update();
  });
  // Usar el gesto del sello permite reproducir video silenciado en móviles.
  document.addEventListener(
    "sobreSelloInteraccion",
    () => {
      opened = true;
      update();
    },
    { once: true },
  );
  document.addEventListener(
    "sobreSelloAbierto",
    () => {
      opened = true;
      update();
    },
    { once: true },
  );
  reduced.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
})();
