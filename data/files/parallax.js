/* Parallax compartido por index.html, index.php y PP.html.
   El borde superior de la foto se alinea con su marco cuando el centro
   del marco llega al 45% del viewport. */
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.gsap || !window.ScrollTrigger) return;
  await window.lidiaMotionReady;

  const motionPreference = matchMedia(
    "(prefers-reduced-motion: no-preference)",
  );
  let parallaxContext;
  const syncParallax = () => {
    parallaxContext?.revert();
    parallaxContext = null;
    if (!motionPreference.matches) return;

    parallaxContext = gsap.context(() => {
      document.querySelectorAll("[data-parallax]").forEach((frame) => {
        const image = frame.querySelector("img");
        if (!image) return;
        const distance = () =>
          Math.max(
            0,
            Math.min(
              Number(
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--parallax-travel",
                ),
              ) || 76,
              (image.offsetHeight - frame.offsetHeight) / 2 - 4,
            ),
          );

        gsap.fromTo(
          image,
          { y: () => -distance() },
          {
            // Compensa el top negativo del CSS sin descubrir el fondo del marco.
            y: () => -(parseFloat(getComputedStyle(image).top) || 0),
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              // Equivalen a "top bottom" y "center 45%". Las coordenadas
              // absolutas evitan el desfase del scroll suave al redimensionar.
              start: () =>
                frame.getBoundingClientRect().top +
                window.scrollY -
                window.innerHeight,
              end: () =>
                frame.getBoundingClientRect().top +
                window.scrollY +
                frame.offsetHeight / 2 -
                window.innerHeight * 0.45,
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    });
    ScrollTrigger.refresh();
  };
  // Esperar a que el controlador compartido termine de cambiar de preferencia.
  motionPreference.addEventListener("change", () =>
    requestAnimationFrame(syncParallax),
  );
  // No esperar al scrollEnd de ScrollTrigger si el cambio de orientación
  // coincide con el desplazamiento o con un cambio de preferencia de movimiento.
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  }, { passive: true });
  syncParallax();
}, { once: true });
