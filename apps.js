const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

function vibrate(style = "light") {
  if (tg && tg.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(style);
  }
}

function speakRussian(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  utter.rate = 0.92;
  window.speechSynthesis.speak(utter);
}

const STORAGE_KEY = "lingua50_state_v1";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) {}
  return {
    xp: 0,
    hp: 5,
    streak: 1,
    currentNode: 0,
    learnedIds: [],
    wordIndex: 0,
    quizIndex: 0
  };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function bump(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

// Sahifalar almashuvi
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

function openView(viewName) {
  vibrate("light");
  navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === viewName));
  views.forEach((v) => v.classList.toggle("is-active", v.id === "view-" + viewName));
  if (viewName === "words") renderWordCard();
  if (viewName === "quiz") renderQuiz();
  if (viewName === "path") renderPath();
  if (viewName === "results") renderResults();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => openView(btn.dataset.view));
});

// Piko interaktivligi
const pikoBtn = document.getElementById("pikoBtn");
const pikoText = document.getElementById("pikoText");
const pikoPhrases = [
  "Bugun 50 ta soʻz yoʻlini boshlaymizmi?",
  "Har kuni bitta bosqich — zoʻr natija!",
  "Ruscha soʻzni eshitish uchun 🔊 tugmani bos!",
  "Xato qilsang ham davom et, men yoningdaman!"
];
let pikoIdx = 0;

pikoBtn.addEventListener("click", () => {
  vibrate("medium");
  pikoBtn.classList.remove("bounce");
  void pikoBtn.offsetWidth;
  pikoBtn.classList.add("bounce");
  pikoIdx = (pikoIdx + 1) % pikoPhrases.length;
  pikoText.textContent = pikoPhrases[pikoIdx];
});

// Path render
function renderPath() {
  const container = document.getElementById("pathContainer");
  container.innerHTML = "";

  WORDS.forEach((item, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "node-wrap";

    if (idx === state.currentNode) {
      const tag = document.createElement("div");
      tag.className = "start-tag";
      tag.textContent = "BOSHLASH";
      wrap.appendChild(tag);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "node-btn";

    const isDone = state.learnedIds.includes(idx);
    const isCurrent = idx === state.currentNode;

    if (isDone) {
      btn.classList.add("done");
      btn.textContent = "✓";
    } else if (isCurrent) {
      btn.classList.add("current");
      btn.textContent = "★";
    } else {
      btn.classList.add("locked");
      btn.textContent = "🔒";
    }

    btn.addEventListener("click", () => {
      if (!isDone && !isCurrent) {
        vibrate("light");
        pikoText.textContent = "Avval joriy bosqichni tugataylik!";
        return;
      }
      vibrate("medium");
      state.wordIndex = idx;
      saveState();
      openView("words");
      speakRussian(item.ru);
    });

    const label = document.createElement("div");
    label.className = "node-label";
    label.textContent = ${idx + 1}. ${item.ru};

    wrap.appendChild(btn);
    wrap.appendChild(label);
    container.appendChild(wrap);
  });

  document.getElementById("learnedCountBadge").textContent = ${state.learnedIds.length} / ${WORDS.length};
}
document.getElementById("pathStartBtn").addEventListener("click", () => {
  vibrate("medium");
  state.wordIndex = Math.min(state.currentNode, WORDS.length - 1);
  saveState();
  openView("words");
  speakRussian(WORDS[state.wordIndex].ru);
});

// So'z kartochkasi
function renderWordCard() {
  const item = WORDS[state.wordIndex] || WORDS[0];
  const total = WORDS.length;
  document.getElementById("wordProgressText").textContent = ${state.wordIndex + 1} / ${total};
  document.getElementById("wordProgressFill").style.width = ${Math.round(((state.wordIndex + 1) / total) * 100)}%;
  document.getElementById("wordTag").textContent = item.tag;
  document.getElementById("wordStatus").textContent = state.learnedIds.includes(state.wordIndex)
    ? "Yodlangan ✓"
    : "Yangi soʻz";
  document.getElementById("ruWord").textContent = item.ru;
  document.getElementById("uzWord").textContent = item.uz;
  document.getElementById("exRu").textContent = item.exRu;
  document.getElementById("exUz").textContent = item.exUz;
}

document.getElementById("speakBtn").addEventListener("click", () => {
  vibrate("light");
  speakRussian(WORDS[state.wordIndex].ru);
});

document.getElementById("nextWordBtn").addEventListener("click", () => {
  vibrate("medium");
  if (!state.learnedIds.includes(state.wordIndex)) {
    state.learnedIds.push(state.wordIndex);
    state.xp += 10;
    bump("xpPill");
  }
  if (state.currentNode === state.wordIndex && state.currentNode < WORDS.length - 1) {
    state.currentNode += 1;
  }
  if (state.wordIndex < WORDS.length - 1) {
    state.wordIndex += 1;
    saveState();
    renderWordCard();
    speakRussian(WORDS[state.wordIndex].ru);
  } else {
    saveState();
    openView("quiz");
  }
});

// Test bo'limi
let quizAnswered = false;

function renderQuiz() {
  quizAnswered = false;
  const idx = state.quizIndex % WORDS.length;
  const item = WORDS[idx];
  document.getElementById("quizCounter").textContent = Savol ${idx + 1} / ${WORDS.length};
  document.getElementById("quizFill").style.width = ${Math.round(((idx + 1) / WORDS.length) * 100)}%;
  document.getElementById("quizRuWord").textContent = item.ru;
  document.getElementById("quizFeedback").textContent = "";
  document.getElementById("nextQuizBtn").style.display = "none";

  const choices = [item.uz, ...item.wrong].sort(() => Math.random() - 0.5);
  const box = document.getElementById("quizOptions");
  box.innerHTML = "";

  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opt-btn";
    btn.textContent = choice;
    btn.addEventListener("click", () => {
      if (quizAnswered) return;
      quizAnswered = true;
      const fb = document.getElementById("quizFeedback");

      if (choice === item.uz) {
        btn.classList.add("correct");
        fb.style.color = "var(--green)";
        fb.textContent = "Zoʻr! Toʻgʻri javob (+15 XP)";
        state.xp += 15;
        bump("xpPill");
        vibrate("medium");
      } else {
        btn.classList.add("wrong");
        state.hp = Math.max(1, state.hp - 1);
        bump("hpPill");
        fb.style.color = "var(--red)";
        fb.textContent = Xato! Toʻgʻri javob: ${item.uz};
        vibrate("heavy");
        [...box.children].forEach((b) => {
          if (b.textContent === item.uz) b.classList.add("correct");
        });
      }

      saveState();
      document.getElementById("nextQuizBtn").style.display = "block";
    });
    box.appendChild(btn);
  });
}

document.getElementById("quizSpeakBtn").addEventListener("click", () => {
  vibrate("light");
  speakRussian(WORDS[state.quizIndex % WORDS.length].ru);
});

document.getElementById("nextQuizBtn").addEventListener("click", () => {
  vibrate("light");
  state.quizIndex = (state.quizIndex + 1) % WORDS.length;
  saveState();
  renderQuiz();
});
function renderResults() {
  document.getElementById("resXp").textContent = state.xp;
  document.getElementById("resHp").textContent = state.hp;
  document.getElementById("resStreak").textContent = state.streak;
  document.getElementById("resLearned").textContent = state.learnedIds.length;
}

document.getElementById("resetProgressBtn").addEventListener("click", () => {
  vibrate("medium");
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  saveState();
  openView("path");
});

function renderAll() {
  document.getElementById("xpVal").textContent = state.xp;
  document.getElementById("hpVal").textContent = state.hp;
  document.getElementById("streakVal").textContent = state.streak;
  renderPath();
  renderResults();
}

renderAll();
