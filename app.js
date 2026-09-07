let appData = null;
let activeMember = null;
let poppedBalloonsCount = 0;
let extinguishedCandlesCount = 0;

// --- 1. Web Audio Chimes (No external audio files needed for chimes) ---
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
    // Audio fallback if muted or blocked
  }
}

// --- 2. Interactive Sparkle Particles on Finger Touch ---
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

// --- 3. Load Data from data.json ---
fetch("./data.json")
  .then((res) => res.json())
  .then((data) => {
    appData = data;
    if (data.trioTitle) {
      document.getElementById("trio-title").innerText = data.trioTitle;
    }
    renderTrioCards(data.members);
  })
  .catch((err) => console.error("Error loading birthday data:", err));

function goToStage(stageId) {
  document.querySelectorAll(".stage").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(stageId);
  if (target) target.classList.add("active");
}

// --- Stage 1: Tap to Open Gift ---
document.getElementById("gift-box").addEventListener("click", () => {
  if (navigator.vibrate) navigator.vibrate(60);
  playMelodyNote(523.25, "triangle", 0.35); // C5
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  setTimeout(() => goToStage("stage-select"), 600);
});

// --- Stage 2: Sibling Hub Cards ---
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
      playMelodyNote(587.33, "triangle", 0.3); // D5
      loadMemberSurprise(member);
    });

    container.appendChild(card);
  });
}

function loadMemberSurprise(member) {
  activeMember = member;
  poppedBalloonsCount = 0;
  extinguishedCandlesCount = 0;

  // Reset candle flames
  document.querySelectorAll(".flame").forEach((f) => f.classList.remove("out"));
  
  document.getElementById("balloon-header").innerText = `Tap to pop ${member.relation}'s balloons! 🎈`;
  document.getElementById("balloon-progress").innerText = `Pop all 3 balloons (0/3)`;

  initBalloons(member.balloons);
  setupVideo(member.videoUrl);
  setupLetter(member.message);
  goToStage("stage-balloons");
}

// --- Stage 3: Pop Balloons with Scratch-off Modal ---
function initBalloons(balloons) {
  const container = document.getElementById("balloon-container");
  container.innerHTML = "";
  document.getElementById("next-to-cake").classList.add("hidden");

  const notes = [523.25, 659.25, 783.99]; // Triad: C5, E5, G5

  balloons.forEach((b, idx) => {
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

// --- Scratch-Off Card Modal Logic ---
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

  // Paint the golden/silver scratch-off layer
  ctx.globalCompositeOperation = "source-over";
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#d4af37");
  grad.addColorStop(0.5, "#f7e7a9");
  grad.addColorStop(1, "#c59b27");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card instructions
  ctx.fillStyle = "#4a3c00";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎁 Scratch Here!", canvas.width / 2, canvas.height / 2 + 6);

  let isDrawing = false;
  let cleared = false;

  function scratch(e) {
    if (!isDrawing || cleared) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
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

    // Auto-reveal when 35% is cleared
    if (transparentPixels > (imgData.data.length / 16) * 0.35) {
      cleared = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      caption.innerText = captionText;
      closeBtn.classList.remove("hidden");
      playMelodyNote(880, "triangle", 0.4);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  }

  canvas.onmousedown = (e) => { isDrawing = true; scratch(e); };
  canvas.ontouchstart = (e) => { isDrawing = true; scratch(e); };
  window.onmouseup = () => (isDrawing = false);
  window.ontouchend = () => (isDrawing = false);
  canvas.onmousemove = scratch;
  canvas.ontouchmove = scratch;

  modal.classList.remove("hidden");
}

document.getElementById("modal-scratch-close").addEventListener("click", () => {
  document.getElementById("scratch-modal").classList.add("hidden");
});

document.getElementById("next-to-cake").addEventListener("click", () => {
  goToStage("stage-cake");
});

// --- Stage 4: Candle Blowing ---
document.querySelectorAll(".flame").forEach((flame, idx) => {
  flame.addEventListener("click", () => {
    if (!flame.classList.contains("out")) {
      if (navigator.vibrate) navigator.vibrate(40);
      playMelodyNote(440 + idx * 110, "sine", 0.3);
      flame.classList.add("out");
      extinguishedCandlesCount++;

      // When all 3 candles are extinguished
      if (extinguishedCandlesCount >= 3) {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => goToStage("stage-video"), 900);
      }
    }
  });
});

// --- Stage 5: Memory Video ---
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

// --- Stage 6: Final Letter & Voice Player ---
function setupLetter(msg) {
  document.getElementById("letter-title").innerText = msg.title;
  document.getElementById("letter-body").innerText = msg.body;
  document.getElementById("audio-source").src = msg.audioUrl;
  document.getElementById("audio-player").load();
}

// Return to Sibling Select Screen
document.getElementById("replay-btn").addEventListener("click", () => {
  goToStage("stage-select");
});
