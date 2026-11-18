const CHECKOUT_URL = "https://app.zuptos.com.br/checkout/37324b4f3d109e3f";

const todayDate = document.getElementById("todayDate");
const countdown = document.getElementById("countdown");

function updateDailyOffer() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const remaining = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = String(Math.floor(remaining / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  if (todayDate) todayDate.textContent = now.toLocaleDateString("pt-BR");
  if (countdown) countdown.textContent = `${hours}:${minutes}:${seconds}`;
}

updateDailyOffer();
window.setInterval(updateDailyOffer, 1000);

const audio = document.getElementById("globalAudio");
let activeButton = null;

function resetAudioButton() {
  if (activeButton) {
    activeButton.textContent = "▶";
    activeButton.classList.remove("is-playing");
    activeButton.setAttribute("aria-label", activeButton.getAttribute("aria-label").replace("Pausar", "Tocar"));
  }
}

document.querySelectorAll("[data-audio]").forEach((button) => {
  button.addEventListener("click", () => {
    const source = button.dataset.audio;
    if (activeButton === button && !audio.paused) {
      audio.pause();
      resetAudioButton();
      activeButton = null;
      return;
    }
    resetAudioButton();
    if (!audio.src.endsWith(source)) audio.src = source;
    activeButton = button;
    audio.play().then(() => {
      button.textContent = "Ⅱ";
      button.classList.add("is-playing");
    }).catch(() => {
      resetAudioButton();
      activeButton = null;
    });
  });
});

audio.addEventListener("ended", () => {
  resetAudioButton();
  activeButton = null;
});

const track = document.getElementById("previewTrack");
const figures = track ? [...track.querySelectorAll("figure")] : [];
const dots = document.querySelector(".carousel-dots");
let previewIndex = 0;

if (track && figures.length) {
  figures.forEach((_, index) => {
    const dot = document.createElement("i");
    if (index === 0) dot.classList.add("active");
    dots.appendChild(dot);
  });

  const refreshDots = () => {
    [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === previewIndex));
  };

  const goTo = (index) => {
    previewIndex = (index + figures.length) % figures.length;
    const figure = figures[previewIndex];
    const left = figure.offsetLeft - (track.clientWidth - figure.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    refreshDots();
  };

  document.querySelector(".carousel-arrow.next").addEventListener("click", () => goTo(previewIndex + 1));
  document.querySelector(".carousel-arrow.prev").addEventListener("click", () => goTo(previewIndex - 1));
  track.addEventListener("scroll", () => {
    window.clearTimeout(track._scrollTimer);
    track._scrollTimer = window.setTimeout(() => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      figures.forEach((figure, index) => {
        const figureCenter = figure.offsetLeft + figure.offsetWidth / 2;
        const current = Math.abs(center - figureCenter);
        if (current < distance) { distance = current; nearest = index; }
      });
      previewIndex = nearest;
      refreshDots();
    }, 80);
  }, { passive: true });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -25px" });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

document.querySelectorAll("[data-checkout]").forEach((link) => {
  if (CHECKOUT_URL) {
    link.href = CHECKOUT_URL;
  } else {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      alert("O link de pagamento de R$ 67 será conectado aqui.");
    });
  }
});

document.querySelectorAll(".anchor-offer").forEach((link) => {
  link.addEventListener("click", () => {
    document.getElementById("oferta").classList.add("offer-highlight");
    setTimeout(() => document.getElementById("oferta").classList.remove("offer-highlight"), 1100);
  });
});
