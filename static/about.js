// Mission Commander profile motion stays lightweight so the page feels polished without heavy effects.

const missionBody = document.body;
const missionLog = document.querySelector("#missionLog");
const missionPortrait = document.querySelector(".mission-profile-image");
const counterNodes = document.querySelectorAll("[data-counter]");
const barNodes = document.querySelectorAll("[data-width]");
const navCards = document.querySelectorAll(".mission-nav-card");
const sectionTargets = document.querySelectorAll(".mission-section, .mission-hero");

function typeMissionLog() {
  if (!missionLog) {
    return;
  }

  const fullText = missionLog.dataset.typing || missionLog.textContent || "";
  missionLog.textContent = "";
  let index = 0;

  const timer = window.setInterval(() => {
    missionLog.textContent += fullText.charAt(index);
    index += 1;

    if (index >= fullText.length) {
      window.clearInterval(timer);
    }
  }, 24);
}

function animateCounter(node) {
  const target = Number(node.dataset.counter || "0");
  const suffix = node.dataset.suffix || "";
  const duration = 1200;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.round(target * progress);
    node.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      node.textContent = `${target}${suffix}`;
    }
  }

  requestAnimationFrame(frame);
}

function animateSkillBars() {
  barNodes.forEach((bar) => {
    const target = Number(bar.dataset.width || "0");
    window.setTimeout(() => {
      bar.style.width = `${target}%`;
    }, 120);
  });
}

function setupScrollSpy() {
  if (!("IntersectionObserver" in window)) {
    return;
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const id = entry.target.id;
      navCards.forEach((card) => {
        card.classList.toggle("is-active", card.getAttribute("href") === `#${id}`);
      });
    });
  }, { threshold: 0.35 });

  sectionTargets.forEach((section) => sectionObserver.observe(section));
}

function setupRevealAnimations() {
  if (!("IntersectionObserver" in window)) {
    counterNodes.forEach(animateCounter);
    animateSkillBars();
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const counter = entry.target.querySelector("[data-counter]");
      if (counter && !counter.dataset.counted) {
        counter.dataset.counted = "true";
        animateCounter(counter);
      }

      const bars = entry.target.querySelectorAll("[data-width]");
      bars.forEach((bar) => {
        if (!bar.dataset.loaded) {
          bar.dataset.loaded = "true";
          window.setTimeout(() => {
            bar.style.width = `${bar.dataset.width}%`;
          }, 120);
        }
      });

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll(".skill-card, .stat-card, .mission-hero, .mission-profile-frame, .terminal-shell").forEach((node) => {
    revealObserver.observe(node);
  });
}

function setupParallax() {
  let frame = null;

  document.addEventListener("pointermove", (event) => {
    if (frame) {
      return;
    }

    frame = requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 12;
      missionBody.style.setProperty("--mission-parallax-x", `${x}px`);
      missionBody.style.setProperty("--mission-parallax-y", `${y}px`);
      frame = null;
    });
  }, { passive: true });
}

window.addEventListener("load", () => {
  missionBody.classList.add("is-ready");
  typeMissionLog();
  setupScrollSpy();
  setupRevealAnimations();
  setupParallax();
});
