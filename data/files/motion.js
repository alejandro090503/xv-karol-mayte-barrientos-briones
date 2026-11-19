/* Único controlador de revelado. No cargar dinamicDisplay ni variantSafeLayout.
   Elementos visibles por defecto, incluso si GSAP no está disponible. */
(() => {
  "use strict";
  // El sobre puede consultar este contrato incluso sin GSAP.
  window.lidiaMotionReady = Promise.resolve();
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const refresh = () => ScrollTrigger.refresh();
  const hero = document.querySelector(".hero");
  const cue = hero.querySelector(".scroll-cue");
  let heroTimeline;
  let revealed = false;
  const waitingEntrances = new Set();
  // Red de seguridad de entradas: se define al construir las animaciones.
  let settleEntrances = () => {};

  // Preparar antes de abrir: evita mostrar el texto completo y ocultarlo después.
  media.add("(prefers-reduced-motion: no-preference)", () => {
    if (revealed) return;
    const names = hero.querySelectorAll(".hero-name");
    const details = hero.querySelectorAll(
      ".hero-top, .hero-content > .eyebrow, .hero-date, .scroll-cue",
    );
    gsap.set(names, { "--write-progress": "0%" });
    gsap.set(details, { autoAlpha: 0, y: 15 });
    // Un segundo nombre (p. ej. «Avril» y «Celeste») se escribe después del
    // primero; con uno solo, el ritmo del demo no cambia.
    const extra = Math.max(0, names.length - 1) * 0.85;
    heroTimeline = gsap
      .timeline({ paused: true })
      .to(
        ".hero-top, .hero-content > .eyebrow",
        { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: "power2.out" },
        0,
      )
      // Se revela la palabra completa sin separar sus ligaduras caligráficas.
      .to(
        names,
        {
          "--write-progress": "110%",
          duration: names.length > 1 ? 1.7 : 2.1,
          stagger: 1.1,
          ease: "sine.inOut",
        },
        0.15,
      )
      .to(
        ".hero-date",
        { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
        1.8 + extra,
      )
      .to(
        cue,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          clearProps: "transform",
          ease: "power2.out",
        },
        2.2 + extra,
      );
    return () => {
      heroTimeline = null;
    };
  });
  const revealHero = () => {
    if (revealed) return;
    revealed = true;
    hero.dataset.revealed = "true";
    heroTimeline?.play();
    waitingEntrances.forEach((animation) => animation.play());
    waitingEntrances.clear();
    // Lo que el invitado alcanzó durante la apertura no espera otro scroll.
    requestAnimationFrame(() => settleEntrances());
  };
  document.addEventListener("sobreSelloRevelando", revealHero, { once: true });
  document.addEventListener("sobreSelloAbierto", revealHero, { once: true });

  // Las fotos reservan su tamaño en CSS/HTML: su carga no debe reiniciar
  // los umbrales de entrada mientras el invitado está desplazándose.
  document
    .querySelectorAll("details")
    .forEach((item) => item.addEventListener("toggle", refresh));
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", () => requestAnimationFrame(refresh));
    form.addEventListener("change", () => requestAnimationFrame(refresh));
  });
  // Preparar letras, SVG y medidas con el sobre todavía opaco.
  // Al abrir sólo se reproducen animaciones ya construidas.
  window.lidiaMotionReady = (async () => {
    await Promise.all([window.lidiaIconsReady, document.fonts.ready]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const originals = [];
      const entrance = (element, start = "clamp(top 88%)") => ({
        trigger: element,
        start,
        // Sin once: ScrollTrigger 3.12.5 puede eliminar un trigger once dentro
        // de refresh() (load tardío, barra del navegador) antes de reproducir
        // su entrada, y el texto se queda oculto. «play» ya ocurre una sola vez.
        toggleActions: "play none none none",
        // Si el invitado rebasa la sección deslizando rápido, se completa al instante.
        fastScrollEnd: true,
        // Marca para la red de seguridad (settleEntrances).
        lidiaEntrance: true,
        onEnter: (trigger) => {
          if (!revealed && trigger.animation) {
            trigger.animation.pause(0);
            waitingEntrances.add(trigger.animation);
          }
        },
      });
      // Mantener las palabras cursivas enteras conserva sus ligaduras.
      // Una copia accesible evita que el lector anuncie letras por separado.
      function splitTitle(element) {
        const nodes = [...element.childNodes];
        const label = element.innerText.replace(/\s+/g, " ").trim();
        const visual = document.createElement("span");
        visual.className = "motion-visual";
        visual.setAttribute("aria-hidden", "true");
        nodes.forEach((node) => visual.append(node.cloneNode(true)));
        const readable = document.createElement("span");
        readable.className = "sr-only";
        readable.textContent = label;
        element.replaceChildren(visual, readable);
        originals.push([element, nodes]);
        const units = [];
        function visit(parent, cursive) {
          [...parent.childNodes].forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const fragment = document.createDocumentFragment();
              node.textContent
                .split(/(\s+)/)
                .filter(Boolean)
                .forEach((part) => {
                  if (/^\s+$/.test(part)) {
                    fragment.append(document.createTextNode(part));
                    return;
                  }
                  const word = document.createElement("span");
                  word.className = "motion-word";
                  if (cursive) {
                    word.textContent = part;
                    units.push(word);
                  } else
                    [...part].forEach((letter) => {
                      const character = document.createElement("span");
                      character.className = "motion-char";
                      character.textContent = letter;
                      word.append(character);
                      units.push(character);
                    });
                  fragment.append(word);
                });
              node.replaceWith(fragment);
            } else if (node.nodeType === Node.ELEMENT_NODE)
              visit(node, cursive || node.classList.contains("script"));
          });
        }
        visit(visual, element.matches(".script,.photo-caption"));
        return units;
      }
      const titles = new Set(
        document.querySelectorAll(
          "main section h2, main section h3, main section .eyebrow, main section p.script, .photo-caption",
        ),
      );
      titles.forEach((element) => {
        // Los resultados PP entran al confirmar con su propia animacion CSS.
        if (element.closest(".timeline-event, .demo-pass__result")) return;
        const units = splitTitle(element);
        gsap.from(units, {
          y: -22,
          rotation: 3,
          autoAlpha: 0,
          duration: 0.95,
          stagger: { amount: Math.min(0.65, units.length * 0.028) },
          ease: "power3.out",
          clearProps: "transform,opacity,visibility",
          scrollTrigger: entrance(element),
        });
      });
      document
        .querySelectorAll(
          "main p, main .time, main .button, main .field, main legend, main .radio-choice, main summary, .album-controls, .site-footer",
        )
        .forEach((element) => {
          if (
            titles.has(element) ||
            element.closest(
              ".hero,.calendar,.fecha-evento,.timeline-event,.draft,.bank-details,[hidden]",
            ) ||
            element.matches(".date-note,#countdown-status")
          )
            return;
          gsap.from(element, {
            autoAlpha: 0,
            duration: 1.05,
            ease: "sine.out",
            clearProps: "opacity,visibility",
            scrollTrigger: entrance(element),
          });
        });
      document
        .querySelectorAll(
          "main .rule, main .heart, .venue-photo, .cards-container",
        )
        .forEach((element) => {
          gsap.from(element, {
            autoAlpha: 0,
            y: 18,
            scale: 0.95,
            duration: 1.1,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
            scrollTrigger: entrance(element),
          });
        });
      // La fecha se ensambla primero; el calendario inicia al alcanzar su propia altura.
      const date = document.querySelector(".fecha-evento");
      gsap
        .timeline({ scrollTrigger: entrance(date, "clamp(top 78%)") })
        .from(date.querySelector(".centro"), {
          y: 24,
          scale: 0.8,
          autoAlpha: 0,
          duration: 0.9,
          ease: "back.out(1.3)",
        })
        .from(
          date.querySelectorAll(".side"),
          {
            x: (i) => (i ? 35 : -35),
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.16,
            ease: "power2.out",
          },
          0.2,
        );
      const calendar = document.querySelector(".calendar");
      const days = [
        ...calendar.querySelectorAll(".calendar-grid > span:not(.weekday)"),
      ].filter((day) => day.textContent);
      const selected = calendar.querySelector(".selected");
      gsap.set(selected, {
        "--mark-scale": 0,
        "--mark-color": "var(--calendar-ink, var(--ivory))",
      });
      gsap
        .timeline({ scrollTrigger: entrance(calendar, "clamp(top 67%)") })
        .from(calendar.querySelector(".calendar-header"), {
          autoAlpha: 0,
          scaleX: 0.8,
          duration: 0.6,
        })
        .from(
          calendar.querySelectorAll(".weekday"),
          { y: -12, autoAlpha: 0, duration: 0.5, stagger: 0.055 },
          0.15,
        )
        .from(
          days,
          {
            y: -28,
            rotation: (i) => (i % 2 ? 7 : -7),
            scale: 0.7,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.035,
            ease: "back.out(1.3)",
          },
          0.4,
        )
        .to(
          selected,
          {
            "--mark-scale": 1,
            "--mark-color": "var(--calendar-selected-ink, var(--sage-dark))",
            duration: 0.6,
            ease: "back.out(1.8)",
          },
          ">-0.05",
        )
        .fromTo(
          selected,
          { "--ring-opacity": 0.65, "--ring-scale": 0.7 },
          { "--ring-opacity": 0, "--ring-scale": 1.35, duration: 1 },
          "<",
        )
        .from(".date-note", { autoAlpha: 0, duration: 0.8 }, "<.2");
      const counter = document.querySelector(".countdown");
      gsap.from(counter.children, {
        y: 24,
        autoAlpha: 0,
        scale: 0.9,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          ...entrance(counter, "clamp(top 82%)"),
          onEnter: () =>
            document.dispatchEvent(new Event("lidia:countdown-intro")),
        },
      });
      const itinerary = document.querySelector(".itinerary-list");
      gsap.fromTo(
        itinerary,
        { "--timeline-progress": 0 },
        {
          "--timeline-progress": 1,
          ease: "none",
          scrollTrigger: {
            trigger: itinerary,
            start: "top 75%",
            end: "bottom 65%",
            scrub: 0.6,
          },
        },
      );
      const poses = [
        { scale: 0.3, rotation: -35 },
        { x: -38, rotation: -15 },
        { y: -38, rotation: 15 },
        { y: 30, scale: 0.6 },
        { rotation: -70, scale: 0.7 },
        { scale: 0.2, y: 16 },
      ];
      itinerary.querySelectorAll(".timeline-event").forEach((row, i) => {
        const heading = splitTitle(row.querySelector("h3"));
        gsap
          .timeline({ scrollTrigger: entrance(row, "clamp(top 85%)") })
          .from(row.querySelector(".timeline-icon"), {
            ...poses[i % poses.length],
            autoAlpha: 0,
            duration: 0.9,
            ease: "back.out(1.4)",
          })
          .from(
            row.querySelector("time"),
            { x: i % 2 ? 18 : -18, autoAlpha: 0, duration: 0.6 },
            0.18,
          )
          .from(
            heading,
            {
              y: -14,
              autoAlpha: 0,
              duration: 0.7,
              stagger: 0.025,
              ease: "power2.out",
            },
            0.3,
          );
      });
      document.querySelectorAll("[data-draw]").forEach((drawing) => {
        // data-ink puede marcar una geometría o un grupo SVG completo.
        // Un <g> no tiene getTotalLength(): medirlo detenía también flores,
        // parallax y ondas. Ignorar sólo la geometría inválida, nunca el resto.
        const paths = [
          ...drawing.querySelectorAll(
            "path,line,polyline,polygon,circle,ellipse,rect",
          ),
        ]
          .filter(
            (path) =>
              path.closest("[data-ink]") &&
              typeof path.getTotalLength === "function",
          )
          .flatMap((path) => {
            try {
              const length = path.getTotalLength();
              return Number.isFinite(length) && length > 0
                ? [{ path, length }]
                : [];
            } catch {
              return [];
            }
          });
        const timeline = gsap.timeline({
          scrollTrigger: entrance(drawing, "clamp(top 85%)"),
        });
        paths.forEach(({ path, length }, i) => {
          timeline.fromTo(
            path,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              duration: 1.6,
              ease: "power2.inOut",
              clearProps: "strokeDasharray,strokeDashoffset",
            },
            i * Math.min(0.13, 0.8 / Math.max(1, paths.length - 1)),
          );
        });
        const washes = drawing.querySelectorAll(".illustration-wash");
        if (washes.length)
          timeline.from(
            washes,
            {
              opacity: 0,
              scale: 0.7,
              transformOrigin: "50% 50%",
              duration: 1.3,
            },
            0,
          );
      });
      // El parallax compartido se prepara en parallax.js tras lidiaMotionReady.
      // Sólo se animan mientras su sección está cerca del viewport.
      document.querySelectorAll(".floral").forEach((element) => {
        gsap.from(element, {
          autoAlpha: 0,
          scale: 0.65,
          y: 30,
          x: element.matches(".floral--left, .floral--date-bottom") ? -25 : 25,
          duration: 1.7,
          ease: "power3.out",
          scrollTrigger: entrance(element),
        });
        const awake = ({ isActive }) => {
          element.dataset.awake = String(isActive);
        };
        const floralTrigger = ScrollTrigger.create({
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          onToggle: awake,
          onRefresh: awake,
        });
        awake(floralTrigger);
      });
      document.querySelectorAll("[data-wave-motion]").forEach((element) => {
        const tween = gsap.to(element.querySelector("use"), {
          x: 6,
          scaleX: 1.025,
          transformOrigin: "50% 100%",
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        });
        const waveTrigger = ScrollTrigger.create({
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          onToggle: ({ isActive }) =>
            isActive ? tween.resume() : tween.pause(),
        });
        if (waveTrigger.isActive) tween.resume();
      });
      const cloud = hero.querySelector("[data-cloud-wave]");
      if (cloud) {
        // Los tres trazos tienen la misma estructura: morph continuo sin saltos.
        const shapes = [
          "M0 0C74 60 175 74 250 48S371 11 430 27V64H0Z",
          "M0 21C92 -4 156 57 248 34S362 62 430 5V64H0Z",
          "M0 10C62 45 159 5 242 26S360 70 430 20V64H0Z",
        ];
        const cloudMotion = gsap
          .timeline({
            repeat: -1,
            paused: true,
            defaults: { duration: 5.5, ease: "sine.inOut" },
          })
          .to(cloud, { attr: { d: shapes[1] } })
          .to(cloud, { attr: { d: shapes[2] } })
          .to(cloud, { attr: { d: shapes[0] } });
        ScrollTrigger.create({
          trigger: hero,
          start: "top bottom",
          end: "bottom top",
          onToggle: ({ isActive }) =>
            isActive ? cloudMotion.resume() : cloudMotion.pause(),
        });
        // El hero ya está en pantalla cuando se registra el trigger.
        if (hero.getBoundingClientRect().bottom > 0) cloudMotion.play();
      }
      const horizontal = document.querySelector(
        '[data-hero-mode="horizontal"] .hero-horizontal',
      );
      if (horizontal)
        gsap.fromTo(
          horizontal,
          { xPercent: -8 },
          {
            xPercent: 8,
            duration: 24,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          },
        );
      // Red de seguridad: ninguna entrada que el invitado ya alcanzó puede
      // quedarse oculta aunque su trigger no haya disparado (scroll muy rápido
      // mientras se escribe el nombre, refresh() tardío o scroll táctil de iOS
      // durante la apertura). Guarda su propia referencia a cada animación, así
      // cubre también un trigger eliminado. Lo que ya quedó arriba de la
      // pantalla se muestra sin animar; lo que está en pantalla se anima.
      const entrances = new Map();
      const settle = () => {
        ScrollTrigger.getAll().forEach((trigger) => {
          const animation = trigger.animation;
          if (trigger.vars.lidiaEntrance && animation && animation.progress() < 1)
            entrances.set(animation, trigger.trigger);
        });
        if (!revealed) return;
        const reach = window.innerHeight * 0.92;
        entrances.forEach((element, animation) => {
          if (animation.progress() === 1) {
            entrances.delete(animation);
            return;
          }
          if (animation.isActive()) return;
          const box = element.getBoundingClientRect();
          if (box.top > reach || (!box.width && !box.height)) return;
          if (box.bottom < 0) animation.progress(1);
          else animation.play();
        });
      };
      settle();
      settleEntrances = settle;
      ScrollTrigger.addEventListener("scrollEnd", settle);
      ScrollTrigger.addEventListener("refresh", settle);
      refresh();
      return () => {
        ScrollTrigger.removeEventListener("scrollEnd", settle);
        ScrollTrigger.removeEventListener("refresh", settle);
        settleEntrances = () => {};
        entrances.clear();
        waitingEntrances.clear();
        originals.forEach(([element, nodes]) =>
          element.replaceChildren(...nodes),
        );
        document
          .querySelectorAll(".floral")
          .forEach((element) => delete element.dataset.awake);
      };
    });
    document.dispatchEvent(new Event("lidia:motion-ready"));
  })();
})();
