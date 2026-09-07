let appData = null;
let activeMember = null;
let poppedBalloonsCount = 0;
let extinguishedCandlesCount = 0;
let scratchCompleted = false;

// --- Web Audio Synthesizer (Zero assets needed for joyful chimes) ---
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
    // Audio fallback
  }
}

// Sparkle Particle Animation
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
  for (let i = 0; i < 4; i++) {
    sparkles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 5 + 3,
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

// --- Load Data ---
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

// Stage 1: Gift Box Open
document.getElementById("gift-box").addEventListener("click", () => {
  if (navigator.vibrate) navigator.vibrate(60);
  playMelodyNote(523.25, "triangle", 0.35); // C5
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
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
  scratchCompleted = false;

  document.querySelectorAll(".flame").forEach((f) => f.classList.remove("out"));
  document.getElementById("balloon-header").innerText = `Tap to pop ${member.relation}'s balloons! 🎈`;
  
  initBalloons(member.balloons);
  setupLetter(member.message);
  goToStage("stage-balloons");
}

// Stage 3: Balloons
function initBalloons(balloons) {
  const container = document.getElementById("balloon-container");
  container.innerHTML = "";
  document.getElementById("next-to-scratch").classList.add("hidden");

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C

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
        showPhotoModal(b.image, b.caption);
        poppedBalloonsCount++;

        if (poppedBalloonsCount >= balloons.length) {
          document.getElementById("next-to-scratch").classList.remove("hidden");
        }
      }, 150);
    });

    container.appendChild(el);
  });
}

function showPhotoModal(src, caption) {
  const modal = document.getElementById("photo-modal");
  document.getElementById("modal-img").src = src;
  document.getElementById("modal-caption").innerText = caption;
  modal.classList.remove("hidden");
}

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("photo-modal").classList.add("hidden");
});

document.getElementById("next-to-scratch").addEventListener("click", () => {
  initScratchCard(activeMember);
  goToStage("stage-scratch");
});

// Stage 4: Scratch-off interaction
function initScratchCard(member) {
  const canvas = document.getElementById("scratch-canvas");
  const ctx = canvas.getContext("2d");
  const img = document.getElementById("scratch-under-img");
  const caption = document.getElementById("scratch-caption");
  const nextBtn = document.getElementById("next-to-cake");

  img.src = member.scratchPhoto;
  caption.innerText = "";
  nextBtn.classList.add("hidden");
  scratchCompleted = false;

  // Draw silver cover
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#silver";
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#c0c0c0");
  grad.addColorStop(0.5, "#e0e0e0");
  grad.addColorStop(1, "#a8a8a8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Label on scratch card
  ctx.fillStyle = "#555";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎁 Scratch With Your Finger!", canvas.width / 2, canvas.height / 2 + 6);

  let isDrawing = false;

  function scratch(e) {
    if (!isDrawing || scratchCompleted) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkScratchPercentage();
  }

  function checkScratchPercentage() {
    if (scratchCompleted) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    for (let i = 3; i < imgData.data.length; i += 16) {
      if (imgData.data[i] === 0) cleared++;
    }

    // When 40% is scratched, automatically reveal everything smoothly
    if (cleared > (imgData.data.length / 16) * 0.4) {
      scratchCompleted = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      caption.innerText = member.scratchCaption;
      nextBtn.classList.remove("hidden");
      playMelodyNote(880, "triangle", 0.4);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
  }

  canvas.onmousedown = (e) => { isDrawing = true; scratch(e); };
  canvas.ontouchstart = (e) => { isDrawing = true; scratch(e); };
  window.onmouseup = () => (isDrawing = false);
  window.ontouchend = () => (isDrawing = false);
  canvas.onmousemove = scratch;
  canvas.ontouchmove = scratch;
}

document.getElementById("next-to-cake").addEventListener("click", () => {
  goToStage("stage-cake");
});

// Stage 5: Blowing out 3 Birthday Candles
document.querySelectorAll(".flame").forEach((flame, idx) => {
  flame.addEventListener("click", () => {
    if (!flame.classList.contains("out")) {
      if (navigator.vibrate) navigator.vibrate(40);
      playMelodyNote(440 + idx * 110, "sine", 0.3);
      flame.classList.add("out");
      extinguishedCandlesCount++;

      if (extinguishedCandlesCount >= 3) {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => goToStage("stage-letter"), 900);
      }
    }
  });
});

// Stage 6: Letter & Audio
function setupLetter(msg) {
  document.getElementById("letter-title").innerText = msg.title;
  document.getElementById("letter-body").innerText = msg.body;
  document.getElementById("audio-source").src = msg.audioUrl;
  document.getElementById("audio-player").load();
}

document.getElementById("replay-btn").addEventListener("click", () => {
  goToStage("stage-select");
});
