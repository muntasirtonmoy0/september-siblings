let appData = null;
let activeMember = null;
let poppedBalloonsCount = 0;
let extinguishedCandlesCount = 0;

// Load the updated JSON config
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

// Stage 1 -> Opens Sibling Select Screen
document.getElementById("gift-box").addEventListener("click", () => {
  if (navigator.vibrate) navigator.vibrate(60);
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  setTimeout(() => goToStage("stage-select"), 600);
});

// Render the 3 Sibling Hub Cards
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
      loadMemberSurprise(member);
    });

    container.appendChild(card);
  });
}

// Prepare custom flow for the chosen sibling
function loadMemberSurprise(member) {
  activeMember = member;
  poppedBalloonsCount = 0;
  extinguishedCandlesCount = 0;

  // Reset candle flames
  document.querySelectorAll(".flame").forEach((f) => f.classList.remove("out"));

  document.getElementById("balloon-header").innerText = `Tap to pop ${member.relation}'s balloons! 🎈`;
  initBalloons(member.balloons);
  setupLetter(member.message);
  goToStage("stage-balloons");
}

// Generate Balloons
function initBalloons(balloons) {
  const container = document.getElementById("balloon-container");
  container.innerHTML = "";
  document.getElementById("next-to-cake").classList.add("hidden");

  balloons.forEach((b) => {
    const el = document.createElement("div");
    el.className = "balloon";
    el.style.backgroundColor = b.color;

    el.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      el.style.transform = "scale(0)";
      el.style.transition = "transform 0.15s ease-out";

      setTimeout(() => {
        el.style.visibility = "hidden";
        showPhotoModal(b.image, b.caption);
        poppedBalloonsCount++;

        if (poppedBalloonsCount >= balloons.length) {
          document.getElementById("next-to-cake").classList.remove("hidden");
        }
      }, 150);
    });

    container.appendChild(el);
  });
}

// Modal handling
function showPhotoModal(src, caption) {
  const modal = document.getElementById("photo-modal");
  document.getElementById("modal-img").src = src;
  document.getElementById("modal-caption").innerText = caption;
  modal.classList.remove("hidden");
}

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("photo-modal").classList.add("hidden");
});

document.getElementById("next-to-cake").addEventListener("click", () => {
  goToStage("stage-cake");
});

// Candle blowing (3 candles = 15th, 17th, 19th)
document.querySelectorAll(".flame").forEach((flame) => {
  flame.addEventListener("click", () => {
    if (!flame.classList.contains("out")) {
      if (navigator.vibrate) navigator.vibrate(40);
      flame.classList.add("out");
      extinguishedCandlesCount++;

      if (extinguishedCandlesCount >= 3) {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
        setTimeout(() => goToStage("stage-letter"), 900);
      }
    }
  });
});

// Setup letter card with custom audio
function setupLetter(msg) {
  document.getElementById("letter-title").innerText = msg.title;
  document.getElementById("letter-body").innerText = msg.body;
  document.getElementById("audio-source").src = msg.audioUrl;
  document.getElementById("audio-player").load();
}

// Go back to select another sibling
document.getElementById("replay-btn").addEventListener("click", () => {
  goToStage("stage-select");
});
