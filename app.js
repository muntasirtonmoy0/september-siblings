let appData = null;
let activeMember = null;
let poppedBalloonsCount = 0;
let extinguishedCandlesCount = 0;

// --- 1. Sound Chimes ---
let audioCtx = null;
function playMelodyNote(freq = 523.25, type = "sine", duration = 0.25) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silent fallback
  }
}

// --- 2. Floating Touch Sparkles ---
const sparkCanvas = document.getElementById("sparkles-canvas");
const sparkCtx = sparkCanvas.getContext("2d");
let sparkles = [];

function resizeSparkleCanvas() {
  sparkCanvas.width = window.innerWidth;
  sparkCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeSparkleCanvas);
resizeSparkleCanvas();

function addSparkle(x, y) {
  for (let i = 0; i < 3; i++) {
    sparkles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      size: Math.random() * 4 + 2,
      alpha: 1,
      color: `hsl(${Math.random() * 360}, 90%, 65%)`
    });
  }
}
window.addEventListener("pointermove", (e) => addSparkle(e.clientX, e.clientY));
window.addEventListener("pointerdown", (e) => addSparkle(e.clientX, e.clientY));

function renderSparkles() {
  sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
  sparkles.forEach((s, idx) => {
    s.x += s.vx;
    s.y += s.vy;
    s.alpha -= 0.03;
    if (s.alpha <= 0) {
      sparkles.splice(idx, 1);
    } else {
      sparkCtx.save();
      sparkCtx.globalAlpha = s.alpha;
      sparkCtx.fillStyle = s.color;
      sparkCtx.beginPath();
      sparkCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      sparkCtx.fill();
      sparkCtx.restore();
    }
  });
  requestAnimationFrame(renderSparkles);
}
renderSparkles();

// --- 3. Stage Navigation & Dedicated URL Hash Routing ---
function goToStage(stageId) {
  document.querySelectorAll(".stage").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(stageId);
  if (target) target.classList.add("active");

  const backBtn = document.getElementById("global-back-btn");
  if (stageId !== "stage-gift" && stageId !== "stage-select") {
    backBtn.classList.remove("hidden");
  } else {
    backBtn.classList.add("hidden");
  }

  if (stageId !== "stage-video") {
    const vid = document.getElementById("memory-video");
    if (vid) vid.pause();
  }
}

function returnToHub() {
  history.pushState(null, "", "#select");
  goToStage("stage-select");
}

document.getElementById("global-back-btn").addEventListener("click", returnToHub);
document.getElementById("replay-btn").addEventListener("click", returnToHub);

window.addEventListener("popstate", () => {
  handleRoute();
});

function handleRoute() {
  if (!appData) return;
  const hash = window.location.hash.replace("#", "");

  if (!hash || hash === "gift") {
    goToStage("stage-gift");
  } else if (hash === "select") {
    goToStage("stage-select");
  } else {
    const found = appData.members.find((m) => m.id.toLowerCase() === hash.toLowerCase());
    if (found) {
      loadMemberSurprise(found, false);
    } else {
      goToStage("stage-select");
    }
  }
}

// --- 4. Load Data ---
fetch("./data.json")
  .then((res) => res.json())
  .then((data) => {
    appData = data;
    if (data.trioTitle) {
      document.getElementById("trio-title").innerText = data.trioTitle;
    }
    renderTrioCards(data.members);
    handleRoute();
  })
  .catch((err) => console.error("Error loading birthday data:", err));

// Stage 1: Gift Click
document.getElementById("gift-box").addEventListener("click", () => {
  if (navigator.vibrate) navigator.vibrate(60);
  playMelodyNote(523.25, "triangle", 0.35);
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  
  history.pushState(null, "", "#select");
  setTimeout(() => goToStage("stage-select"), 600);
});

// Stage 2: Sibling Hub Cards
function renderTrioCards(members) {
  const container = document.getElementById("trio-cards");
  container.innerHTML = "";

  members.forEach((member) => {
    const card = document.createElement("div");
    card.className = "trio-card";
    card.style.borderLeftColor = member.color;
    card.innerHTML = `
      <div class="trio-card-info">
        <span class="trio-card-name">${member.name}</span>
        <span class="trio-card-rel">(${member.relation})</span>
      </div>
      <span class="trio-card-date" style="color:${member.color};">${member.date}</span>
    `;

    card.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate(40);
      playMelodyNote(587.33, "triangle", 0.3);
      history.pushState(null, "", `#${member.id}`);
      loadMemberSurprise(member, false);
    });

    container.appendChild(card);
  });
}

function loadMemberSurprise(member, updateHash = true) {
  activeMember = member;
  poppedBalloonsCount = 0;
  extinguishedCandlesCount = 0;

  if (updateHash) {
    history.pushState(null, "", `#${member.id}`);
  }

  document.querySelectorAll(".flame").forEach((f) => f.classList.remove("out"));
  document.getElementById("balloon-header").innerText = `Tap to pop ${member.relation}'s balloons! 🎈`;
  document.getElementById("balloon-progress").innerText = `Pop all 3 balloons (0/3)`;

  initBalloons(member.balloons);
  setupVideo(member.videoUrl);
  setupLetter(member.message);
  goToStage("stage-balloons");
}

// Stage 3: Exactly 3 Balloons with Scratch Modal
function initBalloons(balloons) {
  const container = document.getElementById("balloon-container");
  container.innerHTML = "";
  document.getElementById("next-to-cake").classList.add("hidden");

  const notes = [523.25, 659.25, 783.99];

  balloons.slice(0, 3).forEach((b, idx) => {
    const el = document.createElement("div");
    el.className = "balloon";
    el.style.backgroundColor = b.color;

    el.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      playMelodyNote(notes[idx % notes.length], "sine", 0.4);

      el.style.transform = "scale(0)";
      el.style.transition = "transform 0.15s ease-out";

      setTimeout(() => {
        el.style.visibility = "hidden";
        openScratchModal(b.image, b.caption);
        poppedBalloonsCount++;
        document.getElementById("balloon-progress").innerText = `Pop all 3 balloons (${poppedBalloonsCount}/3)`;

        if (poppedBalloonsCount >= 3) {
          document.getElementById("next-to-cake").classList.remove("hidden");
        }
      }, 150);
    });

    container.appendChild(el);
  });
}

// Fixed Scratch-Off Canvas System
function openScratchModal(imgSrc, captionText) {
  const modal = document.getElementById("scratch-modal");
  const canvas = document.getElementById("modal-scratch-canvas");
  const ctx = canvas.getContext("2d");
  const underImg = document.getElementById("modal-scratch-img");
  const caption = document.getElementById("modal-scratch-caption");
  const closeBtn = document.getElementById("modal-scratch-close");

  underImg.src = imgSrc;
  caption.innerText = "";
  closeBtn.classList.add("hidden");

  // Show modal first so dimensions are positive
  modal.classList.remove("hidden");

  // Paint the silver scratch coating
  ctx.globalCompositeOperation = "source-over";
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#b0b0b0");
  grad.addColorStop(0.5, "#e6e6e6");
  grad.addColorStop(1, "#999999");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎁 Scratch Here!", canvas.width / 2, canvas.height / 2 + 6);

  let isDrawing = false;
  let cleared = false;

  function scratch(e) {
    if (!isDrawing || cleared) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    checkPercentage();
  }

  function checkPercentage() {
    if (cleared) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    for (let i = 3; i < imgData.data.length; i += 16) {
      if (imgData.data[i] === 0) transparentPixels++;
    }

    // Auto-reveal when 30% cleared
    if (transparentPixels > (imgData.data.length / 16) * 0.3) {
      cleared = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      caption.innerText = captionText;
      closeBtn.classList.remove("hidden");
      playMelodyNote(880, "triangle", 0.4);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  }

  // Mouse & Touch bindings
  canvas.onmousedown = (e) => { isDrawing = true; scratch(e); };
  canvas.ontouchstart = (e) => { isDrawing = true; scratch(e); };
  window.onmouseup = () => (isDrawing = false);
  window.ontouchend = () => (isDrawing = false);
  canvas.onmousemove = scratch;
  canvas.ontouchmove = scratch;
}

document.getElementById("modal-scratch-close").addEventListener("click", () => {
  document.getElementById("scratch-modal").classList.add("hidden");
});

document.getElementById("next-to-cake").addEventListener("click", () => {
  goToStage("stage-cake");
});

// Stage 4: Candle blowing
document.querySelectorAll(".flame").forEach((flame, idx) => {
  flame.addEventListener("click", () => {
    if (!flame.classList.contains("out")) {
      if (navigator.vibrate) navigator.vibrate(40);
      playMelodyNote(440 + idx * 110, "sine", 0.3);
      flame.classList.add("out");
      extinguishedCandlesCount++;

      if (extinguishedCandlesCount >= 3) {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => goToStage("stage-video"), 900);
      }
    }
  });
});

// Stage 5: Video
function setupVideo(videoUrl) {
  const vid = document.getElementById("memory-video");
  document.getElementById("video-source").src = videoUrl;
  vid.load();
}

document.getElementById("next-to-letter").addEventListener("click", () => {
  const vid = document.getElementById("memory-video");
  vid.pause();
  goToStage("stage-letter");
});

// Stage 6: Final Letter
function setupLetter(msg) {
  document.getElementById("letter-title").innerText = msg.title;
  document.getElementById("letter-body").innerText = msg.body;
  document.getElementById("audio-source").src = msg.audioUrl;
  document.getElementById("audio-player").load();
}
