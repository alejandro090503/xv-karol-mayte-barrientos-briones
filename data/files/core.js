/* Lidia XV · contratos de fecha, álbum, eventos, audio y WhatsApp del demo.
   Sin backend ni persistencia de datos de invitados. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const text = (id) => document.getElementById(id)?.textContent.trim() || "";
  // Nombres de los mensajes de WhatsApp y textos alternativos: se leen de la portada
  // (.hero-name) para que nunca viajen los nombres del demo. body[data-festejados] los sustituye.
  const festejados = () => document.body.dataset.festejados?.trim() ||
    [...document.querySelectorAll(".hero-name")]
      .map((name) => [...name.childNodes]
        .filter((node) => !(node.nodeType === 1 && node.getAttribute("aria-hidden") === "true"))
        .map((node) => node.textContent).join("").replace(/\s+/g, " ").trim())
      .filter(Boolean).join(" y ") || "la quinceañera";

  function initDate() {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const month = months.indexOf(text("mes-evento").toLowerCase());
    const day = Number(text("dia-mes"));
    const year = Number(text("anio-evento"));
    const match = text("hora-evento").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    let hour = match ? Number(match[1]) : NaN;
    const minute = match ? Number(match[2]) : NaN;
    const period = match?.[3]?.toUpperCase();
    if (period && hour >= 1 && hour <= 12)
      hour = (hour % 12) + (period === "PM" ? 12 : 0);
    else if (period) hour = NaN;
    const date = new Date(Date.UTC(year, month, day));
    if (
      month < 0 ||
      date.getUTCDate() !== day ||
      date.getUTCMonth() !== month ||
      !Number.isFinite(hour) ||
      hour > 23 ||
      minute > 59
    ) {
      $("#countdown-status").textContent = "Pronto compartiremos la fecha.";
      return;
    }
    $("#dia-semana").textContent = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date);
    const title = `${months[month][0].toUpperCase()}${months[month].slice(1)} ${year}`;
    $("#calendar-title").textContent =
      months[month][0].toUpperCase() + months[month].slice(1);
    const grid = $("#calendar-grid");
    grid.setAttribute(
      "aria-label",
      `Calendario de ${title}; XV años de ${festejados()} el día ${day}`,
    );
    const add = (value, className = "") => {
      const cell = document.createElement("span");
      cell.textContent = value;
      cell.className = className;
      grid.append(cell);
      return cell;
    };
    ["L", "M", "M", "J", "V", "S", "D"].forEach((name) => add(name, "weekday"));
    const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    for (let blank = 0; blank < offset; blank++)
      add("").setAttribute("aria-hidden", "true");
    const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let n = 1; n <= total; n++) {
      const cell = add(String(n), n === day ? "selected" : "");
      if (n === day)
        cell.setAttribute(
          "aria-label",
          `${day} de ${months[month]}, XV años de ${festejados()}`,
        );
    }
    const pad = (n) => String(n).padStart(2, "0");
    const zone = document.body.dataset.eventOffset || "-07:00";
    const target = new Date(
      `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${zone}`,
    ).getTime();
    if (!Number.isFinite(target)) {
      $("#countdown-status").textContent = "Pronto compartiremos la fecha.";
      return;
    }
    let timer;
    const counters = ["dias", "horas", "minutos", "segundos"].map((key) => {
      const element = document.getElementById(`countdown-${key}`);
      const readable = document.createElement("span");
      readable.className = "sr-only";
      const window = document.createElement("span");
      window.className = "number-window";
      window.setAttribute("aria-hidden", "true");
      const reel = document.createElement("span");
      reel.className = "number-reel";
      window.append(reel);
      element.replaceChildren(readable, window);
      return {
        element,
        readable,
        reel,
        latest: "00",
        current: "",
        tween: null,
        deadline: null,
      };
    });
    let introduced = false;
    const face = (value) => {
      const row = document.createElement("span");
      row.className = "number-face";
      row.textContent = value;
      return row;
    };
    const settle = (counter) => {
      clearTimeout(counter.deadline);
      counter.tween?.kill();
      counter.tween = null;
      counter.reel.style.transform = "";
      counter.reel.replaceChildren(face(counter.latest));
      counter.current = counter.latest;
    };
    const roll = (counter, intro = false, index = 0) => {
      if (!window.gsap || reduced() || document.hidden) {
        settle(counter);
        return;
      }
      const rows = intro
        ? Array.from({ length: 12 }, (_, n) =>
            pad((Number(counter.latest) + (12 - n) * 7) % 100),
          )
        : [counter.current];
      rows.push(counter.latest);
      counter.reel.replaceChildren(...rows.map(face));
      counter.tween = gsap.fromTo(
        counter.reel,
        { yPercent: 0 },
        {
          yPercent: (-100 * (rows.length - 1)) / rows.length,
          duration: intro ? 2.1 + index * 0.16 : 0.42,
          delay: intro ? index * 0.12 : 0,
          ease: intro ? "power3.inOut" : "power2.inOut",
          onComplete: () => settle(counter),
        },
      );
      // Si el navegador limita los fotogramas, conservar la cifra real a tiempo.
      counter.deadline = setTimeout(() => settle(counter), intro ? 3800 : 800);
    };
    const inView = () => {
      const bounds = $(".countdown").getBoundingClientRect();
      return bounds.top < innerHeight && bounds.bottom > 0;
    };
    document.addEventListener(
      "lidia:countdown-intro",
      () => {
        if (introduced) return;
        introduced = true;
        counters.forEach((counter, index) => roll(counter, true, index));
      },
      { once: true },
    );
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      () => {
        if (reduced()) counters.forEach(settle);
      },
    );
    const tick = () => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const values = [
        Math.floor(remaining / 86400),
        Math.floor(remaining / 3600) % 24,
        Math.floor(remaining / 60) % 60,
        remaining % 60,
      ];
      counters.forEach((counter, i) => {
        counter.latest = pad(values[i]);
        counter.element.dataset.value = counter.latest;
        counter.readable.textContent = counter.latest;
        if (counter.tween) {
          counter.reel.lastElementChild.textContent = counter.latest;
          return;
        }
        if (counter.current === counter.latest) return;
        if (introduced && inView()) roll(counter);
        else settle(counter);
      });
      if (!remaining) {
        $("#countdown-status").textContent = "¡Llegó el día de mis XV años!";
        clearInterval(timer);
      }
      return remaining;
    };
    if (tick()) timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) counters.forEach(settle);
      else tick();
    });
  }

  function initTimeline() {
    const list = $(".itinerary-list");
    if (!list || typeof eventos === "undefined") return;
    eventos.forEach((event) => {
      const row = document.createElement("article");
      row.className = "timeline-event";
      row.dataset.reveal = "";
      const icon = document.createElement("span");
      icon.className = "timeline-icon";
      icon.setAttribute("aria-hidden", "true");
      // Nombre de icono acotado. Los textos nunca se insertan con innerHTML.
      if (/^[\w-]+$/.test(event.icono))
        icon.style.setProperty(
          "--event-icon",
          `url("${new URL(`${list.dataset.iconBase}/${event.icono}.png`, document.baseURI).href}")`,
        );
      const content = document.createElement("div");
      const time = document.createElement("time");
      const name = document.createElement("h3");
      time.textContent = event.hora;
      name.textContent = event.nombre;
      content.append(time, name);
      row.append(icon, content);
      list.append(row);
    });
  }

  function initAlbum() {
    const container = $("#cards-container");
    if (!container) return;
    const photos = container.dataset.photos
      .split(",")
      .map((file) => file.trim())
      .filter(Boolean);
    const dialog = $("#album-dialog");
    let index = 0;
    const photoUrl = (i) =>
      new URL(container.dataset.base + photos[i], document.baseURI).href;
    const count = () =>
      `${String(index + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
    const renderFull = () => {
      $("#album-full").src = photoUrl(index);
      $("#album-full").alt =
        `Mis XV años · Fotografía ${index + 1} de ${photos.length}`;
      $("#lightbox-count").textContent = count();
    };
    photos.forEach((file, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "album-card";
      button.setAttribute("aria-label", `Ampliar fotografía ${i + 1}`);
      const img = document.createElement("img");
      Object.assign(img, {
        src: photoUrl(i),
        alt: `${festejados()} · Fotografía ${i + 1} de ${photos.length}`,
        loading: "lazy",
        decoding: "async",
        width: i === 8 ? 900 : 1200,
        height: i === 8 ? 600 : 1800,
      });
      button.append(img);
      button.addEventListener("click", () => {
        index = i;
        renderFull();
        dialog.showModal();
      });
      container.append(button);
    });
    const cards = [...container.children];
    const go = (delta) => {
      index = (index + delta + photos.length) % photos.length;
      container.scrollTo({
        left:
          cards[index].offsetLeft -
          (container.clientWidth - cards[index].clientWidth) / 2,
        behavior: reduced() ? "instant" : "smooth",
      });
    };
    $("#album-prev").addEventListener("click", () => go(-1));
    $("#album-next").addEventListener("click", () => go(1));
    let frame;
    container.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const center = container.scrollLeft + container.clientWidth / 2;
          index = cards.reduce(
            (best, card, i) =>
              Math.abs(card.offsetLeft + card.clientWidth / 2 - center) <
              Math.abs(
                cards[best].offsetLeft + cards[best].clientWidth / 2 - center,
              )
                ? i
                : best,
            0,
          );
          $("#album-count").textContent = count();
        });
      },
      { passive: true },
    );
    $("#lightbox-close").addEventListener("click", () => dialog.close());
    const fullGo = (delta) => {
      index = (index + delta + photos.length) % photos.length;
      renderFull();
    };
    $("#lightbox-prev").addEventListener("click", () => fullGo(-1));
    $("#lightbox-next").addEventListener("click", () => fullGo(1));
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        fullGo(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        fullGo(-1);
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      go(0);
      cards[index].focus({ preventScroll: true });
    });
  }

  function initForms() {
    const phone = document.body.dataset.whatsapp || "";
    const passLimit = Math.min(
      16,
      Math.max(1, Number(document.body.dataset.guestLimit) || 16),
    );

    function bind(form, compose) {
      if (!form) return;
      const formPhone = form.dataset.whatsapp || phone;
      form.addEventListener("input", () => {
        form
          .querySelectorAll("input,textarea")
          .forEach((field) => field.setCustomValidity(""));
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        for (const field of form.querySelectorAll("[required]")) {
          if (field.type !== "radio" && !field.value.trim()) {
            field.setCustomValidity("Completa este campo.");
            field.reportValidity();
            return;
          }
        }
        if (!form.reportValidity() || !/^\d{10,15}$/.test(formPhone)) return;
        const data = new FormData(form);
        const waUrl = `https://wa.me/${formPhone}?text=${encodeURIComponent(compose(data))}`;
        const opened = window.open(waUrl, "_blank");
        if (!opened || opened.closed || typeof opened.closed === "undefined") {
          window.location.href = waUrl;
        }
      });
    }

    const wishesForm = $("#wishes-form");
    if (wishesForm) {
      bind(
        wishesForm,
        (data) =>
          `Un buen deseo para ${festejados()} por sus XV años\n\nDe: ${data.get("nombre")?.trim() || ""}\n${data.get("mensaje")?.trim() || ""}`,
      );
    }

    // PP.html usa el simulador de pases y no contiene el RSVP de WhatsApp.
    const rsvpForm = $("#rsvp-form");
    if (rsvpForm) {
      const guestInput = $("#guest-field input");
      if (guestInput) guestInput.max = String(passLimit);

      bind(rsvpForm, (data) => {
        const attending = data.get("asistencia") === "Sí, con mucho gusto";
        return `Confirmación · XV años de ${festejados()}\n\nNombre: ${data.get("nombre")?.trim() || ""}\nAsistencia: ${data.get("asistencia") || ""}${attending ? `\nPersonas (incluyéndome): ${data.get("personas") || "1"}` : ""}${data.get("comentario")?.trim() ? `\nComentario: ${data.get("comentario").trim()}` : ""}`;
      });

      rsvpForm.addEventListener("change", () => {
        const yes =
          rsvpForm.querySelector('input[name="asistencia"]:checked')?.value ===
          "Sí, con mucho gusto";
        const guestField = $("#guest-field");
        if (guestField) {
          guestField.hidden = !yes;
          const input = guestField.querySelector("input");
          if (input) {
            input.disabled = !yes;
            input.required = yes;
          }
        }
      });
      const initialGuestInput = $("#guest-field input");
      if (initialGuestInput) initialGuestInput.disabled = true;
    }

    const copyBtn = $("#copy-account");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const value = text("bank-account").replace(/\s/g, "");
        try {
          if (!navigator.clipboard) throw new Error("Clipboard unavailable");
          await navigator.clipboard.writeText(value);
          const copyStatus = $("#copy-status");
          if (copyStatus) copyStatus.textContent = "Cuenta copiada.";
        } catch {
          const bankAccount = $("#bank-account");
          if (bankAccount) {
            const range = document.createRange();
            range.selectNodeContents(bankAccount);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            const copyStatus = $("#copy-status");
            if (copyStatus) {
              copyStatus.textContent =
                "Seleccionamos la cuenta. Mantén pulsado para copiarla.";
            }
          }
        }
      });
    }
  }

  function initMedia() {
    const audio = $("#wedding-audio");
    const toggle = $("#music-toggle");
    const hero = $(".hero");
    const video = $(".hero-video");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let invitationOpen = false;

    if (!audio || !toggle) return;

    audio.volume = 0.45;
    function updateAudio() {
      toggle.setAttribute("aria-pressed", String(!audio.paused));
      toggle.setAttribute(
        "aria-label",
        audio.paused ? "Reproducir música" : "Pausar música",
      );
    }
    function playAudio() {
      audio.play().then(updateAudio).catch(updateAudio);
    }
    audio.addEventListener("play", updateAudio);
    audio.addEventListener("pause", updateAudio);
    toggle.addEventListener("click", () =>
      audio.paused ? playAudio() : audio.pause(),
    );

    if (hero && hero.dataset.heroMode !== "video") {
      const image = hero.querySelector(`.hero-${hero.dataset.heroMode}`);
      if (image?.dataset.src) image.src = image.dataset.src;
    }

    const playVideo = () => {
      if (
        !video ||
        !hero ||
        hero.dataset.heroMode !== "video" ||
        video.dataset.videoReady !== "true" ||
        motion.matches ||
        document.hidden ||
        !invitationOpen
      )
        return;
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      video.muted = true;
      video.play().catch(() => {
        /* Safari o ahorro de energía: conservar poster. */
      });
    };

    if (video) {
      video.addEventListener(
        "error",
        () => {
          video.removeAttribute("src");
          video.load();
        },
        { once: true },
      );
    }

    // Música y video arrancan con el gesto, mientras el sobre todavía los cubre.
    document.addEventListener(
      "sobreSelloInteraccion",
      () => {
        invitationOpen = true;
        playAudio();
        playVideo();
      },
      { once: true },
    );
    document.addEventListener(
      "sobreSelloRevelando",
      () => {
        invitationOpen = true;
        playVideo();
      },
      { once: true },
    );
    document.addEventListener(
      "sobreSelloAbierto",
      () => {
        invitationOpen = true;
        toggle.hidden = false;
        if (hero) hero.dataset.revealed = "true";
        playVideo();
        // También funciona con movimiento reducido o sin GSAP.
        const cue = hero ? hero.querySelector(".scroll-cue") : null;
        if (cue) {
          const dismissCue = () => {
            if (window.scrollY < 16) return;
            cue.hidden = true;
            window.removeEventListener("scroll", dismissCue);
          };
          window.addEventListener("scroll", dismissCue, { passive: true });
          dismissCue();
        }
      },
      { once: true },
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        audio.pause();
        if (video) video.pause();
      } else playVideo();
    });
    motion.addEventListener("change", () =>
      motion.matches ? (video && video.pause()) : playVideo(),
    );
    if (hero && "IntersectionObserver" in window)
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) playVideo();
          else if (video) video.pause();
        },
        { threshold: 0.05 },
      ).observe(hero);
  }

  // Los SVG canónicos viven en /Iconos/. Se insertan para poder trazar sus
  // líneas; la imagen src sigue visible si la carga o la animación fallan.
  function initSharedIcons() {
    return Promise.all(
      [...document.querySelectorAll("img[data-svg-inline]")].map(
        async (image) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          try {
            const response = await fetch(image.src, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`SVG ${response.status}`);
            const parsed = new DOMParser().parseFromString(
              await response.text(),
              "image/svg+xml",
            );
            const source = parsed.documentElement;
            if (
              source.localName !== "svg" ||
              source.querySelector("parsererror")
            )
              throw new Error("SVG inválido");
            const drawing = document.importNode(source, true);
            drawing.removeAttribute("style");
            drawing.className.baseVal = `${image.className} ink-drawing`;
            drawing.dataset.draw = "";
            drawing.setAttribute("aria-hidden", "true");
            drawing.setAttribute("focusable", "false");
            image.replaceWith(drawing);
          } catch {
            // El <img> permanece como respaldo visible.
          } finally {
            clearTimeout(timeout);
          }
        },
      ),
    );
  }

  function initReplay() {
    const button = $("#replay-invitation");
    if (!button) return;
    button.addEventListener("click", () => {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      window.location.reload();
    });
  }

  // Las funciones son independientes: un dato incompleto no bloquea la apertura.
  [initDate, initTimeline, initAlbum, initForms, initMedia, initReplay].forEach(
    (init) => {
      try {
        init();
      } catch (error) {
        console.error(`Lidia XV / ${init.name}:`, error);
      }
    },
  );
  window.lidiaIconsReady = initSharedIcons();
})();
