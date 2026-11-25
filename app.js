const PAGES = [
  { src: "01_pencils_length.png", alt: "長顏色筆和短顏色筆", text: "長顏色筆；短顏色筆" },
  { src: "02_spoons_length.png", alt: "長匙羹和短匙羹", text: "長匙羹；短匙羹" },
  { src: "03_toothbrushes_length.png", alt: "長牙刷和短牙刷", text: "長牙刷；短牙刷" },
  { src: "04_straws_length.png", alt: "長飲管和短飲管", text: "長飲管；短飲管" },
  { src: "05_crayons_length.png", alt: "長蠟筆和短蠟筆", text: "長蠟筆；短蠟筆" }
];

const reader = document.getElementById("reader");
const pageImage = document.getElementById("pageImage");
const caption = document.getElementById("caption");
const pageIndicator = document.getElementById("pageIndicator");
const stopBtn = document.getElementById("stopBtn");
const restartBtn = document.getElementById("restartBtn");
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");

let currentIndex = 0;
let speechToken = 0;
let speechState = "idle";
let hasStarted = false;
let activeTouchId = null;
let touchStart = null;

function isLastPage() {
  return currentIndex === PAGES.length - 1;
}

function updateControls() {
  stopBtn.disabled = speechState !== "speaking";
  restartBtn.classList.toggle("hidden", !isLastPage());
  pageIndicator.textContent = `${currentIndex + 1} / ${PAGES.length}`;
}

function setSpeechState(state) {
  speechState = state;
  updateControls();
}

function stopSpeech() {
  speechToken += 1;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function pickVoice() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const preferredLangs = ["zh-HK", "zh-TW", "zh-CN", "zh"];
  for (const lang of preferredLangs) {
    const exact = voices.find((voice) => voice.lang === lang);
    if (exact) return exact;
    const prefix = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (prefix) return prefix;
  }
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) || null;
}

function speakCurrentPage() {
  const page = PAGES[currentIndex];
  caption.textContent = page.text;
  stopSpeech();

  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
    setSpeechState("finished");
    return;
  }

  const token = ++speechToken;
  const utterance = new SpeechSynthesisUtterance(page.text);
  const voice = pickVoice();
  utterance.lang = voice ? voice.lang : "zh-HK";
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  utterance.onstart = () => {
    if (token !== speechToken) return;
    hasStarted = true;
    startOverlay.classList.add("hidden");
    setSpeechState("speaking");
  };

  utterance.onend = () => {
    if (token !== speechToken) return;
    setSpeechState("finished");
  };

  utterance.onerror = () => {
    if (token !== speechToken) return;
    setSpeechState("finished");
    if (!hasStarted) {
      startOverlay.classList.remove("hidden");
    }
  };

  setSpeechState("pending");
  window.speechSynthesis.speak(utterance);
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

function showPage(index, autoplay = true) {
  currentIndex = Math.max(0, Math.min(index, PAGES.length - 1));
  const page = PAGES[currentIndex];
  pageImage.src = page.src;
  pageImage.alt = page.alt;
  caption.textContent = page.text;
  updateControls();

  if (autoplay && hasStarted) {
    speakCurrentPage();
  } else if (autoplay) {
    startOverlay.classList.remove("hidden");
    setSpeechState("idle");
  } else {
    setSpeechState("idle");
  }
}

function nextPage() {
  if (isLastPage()) return;
  showPage(currentIndex + 1, true);
}

function restartBook() {
  showPage(0, true);
}

function handleSwipeGesture() {
  if (!hasStarted) {
    return;
  }

  if (speechState === "speaking" || speechState === "pending") {
    stopSpeech();
    setSpeechState("finished");
    if (!isLastPage()) {
      nextPage();
    }
    return;
  }

  if (speechState === "stopped") {
    speakCurrentPage();
    return;
  }

  if (speechState === "finished") {
    nextPage();
  }
}

function isControlTarget(target) {
  return Boolean(target.closest("button"));
}

stopBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (speechState !== "speaking") return;
  stopSpeech();
  setSpeechState("stopped");
});

restartBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  hasStarted = true;
  startOverlay.classList.add("hidden");
  restartBook();
});

startBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  hasStarted = true;
  startOverlay.classList.add("hidden");
  speakCurrentPage();
});

reader.addEventListener("touchstart", (event) => {
  if (isControlTarget(event.target)) return;
  if (event.touches.length < 1 || event.touches.length > 3) return;
  const touch = event.touches[0];
  activeTouchId = touch.identifier;
  touchStart = {
    x: touch.clientX,
    y: touch.clientY,
    count: event.touches.length,
    moved: false
  };
}, { passive: true });

reader.addEventListener("touchmove", (event) => {
  if (!touchStart) return;
  const touch = Array.from(event.touches).find((item) => item.identifier === activeTouchId);
  if (!touch) return;
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    touchStart.moved = true;
  }
}, { passive: true });

reader.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const ended = Array.from(event.changedTouches).some((item) => item.identifier === activeTouchId);
  if (!ended) return;

  const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
  const dx = touch ? touch.clientX - touchStart.x : 0;
  const dy = touch ? touch.clientY - touchStart.y : 0;
  const distance = Math.hypot(dx, dy);
  const fingerCount = touchStart.count;

  touchStart = null;
  activeTouchId = null;

  if (fingerCount < 1 || fingerCount > 3) return;
  if (distance < 30) return;

  handleSwipeGesture();
}, { passive: true });

reader.addEventListener("touchcancel", () => {
  touchStart = null;
  activeTouchId = null;
}, { passive: true });

window.addEventListener("load", () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  showPage(0, true);

  const tryAutoplay = () => {
    if (hasStarted) return;
    speakCurrentPage();
  };

  tryAutoplay();
  window.setTimeout(() => {
    if (!hasStarted && speechState !== "speaking" && speechState !== "finished") {
      startOverlay.classList.remove("hidden");
    }
  }, 1200);
});

window.addEventListener("beforeunload", () => {
  stopSpeech();
});
