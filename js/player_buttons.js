const STREAM_URL = "https://stream.zeno.fm/9kymcedhbbrtv";

// DOM Elements
const radio = document.getElementById("radio");
const playButton = document.getElementById("play-button");
const playIcon = document.getElementById("play-icon");
const stopButton = document.getElementById("stop-button");
const playerContainer = document.querySelector(".player-container");
const playerStatus = document.getElementById("player-status");
const statusText = document.getElementById("status-text");
const statusSpinner = document.querySelector(".status-spinner");
const muteButton = document.getElementById("mute-button");
const volumeIcon = document.getElementById("volume-icon");
const volumeSlider = document.getElementById("volume-slider");

// State variables
let currentState = "stopped"; // stopped | connecting | playing | error
let userWantsToPlay = false;
let reconnectTimer = null;
let backoffDelay = 1000; // Starting backoff: 1s up to 60s
let lastVolume = 1;

// ----------------------------------------------------
// 1. State Machine Management
// ----------------------------------------------------
function setPlayerState(state) {
  currentState = state;
  playerContainer.classList.remove("is-stopped", "is-connecting", "is-playing", "is-error");

  switch (state) {
    case "stopped":
      playerContainer.classList.add("is-stopped");
      if (statusText) statusText.textContent = "Detenido";
      if (statusSpinner) statusSpinner.classList.add("d-none");
      updatePlayButtonUI(false);
      break;

    case "connecting":
      playerContainer.classList.add("is-connecting");
      if (statusText) statusText.textContent = "Conectando…";
      if (statusSpinner) statusSpinner.classList.remove("d-none");
      updatePlayButtonUI(true);
      break;

    case "playing":
      playerContainer.classList.add("is-playing");
      if (statusText) statusText.textContent = "En vivo";
      if (statusSpinner) statusSpinner.classList.add("d-none");
      updatePlayButtonUI(true);
      break;

    case "error":
      playerContainer.classList.add("is-error");
      if (statusText) statusText.textContent = "Sin conexión";
      if (statusSpinner) statusSpinner.classList.remove("d-none");
      updatePlayButtonUI(false);
      break;
  }
}

function updatePlayButtonUI(isPlayingOrConnecting) {
  if (isPlayingOrConnecting) {
    playIcon.className = "fas fa-pause player__icon";
    playButton.setAttribute("aria-label", "Pausar");
    playButton.setAttribute("aria-pressed", "true");
  } else {
    playIcon.className = "fas fa-play player__icon";
    playButton.setAttribute("aria-label", "Reproducir");
    playButton.setAttribute("aria-pressed", "false");
  }
}

// ----------------------------------------------------
// 2. Play / Pause & Pre-warm Logic
// ----------------------------------------------------
function prewarmStream() {
  if (!radio.src || radio.src !== STREAM_URL) {
    radio.src = STREAM_URL;
    radio.load();
  }
}

function togglePlayPause() {
  if (currentState === "playing" || currentState === "connecting") {
    // User requested Pause
    userWantsToPlay = false;
    clearReconnectTimer();
    radio.pause();
    setPlayerState("stopped");
  } else {
    // User requested Play
    userWantsToPlay = true;
    clearReconnectTimer();
    prewarmStream();
    setPlayerState("connecting");

    radio.play().catch((err) => {
      console.warn("Error al reproducir audio:", err);
      if (userWantsToPlay) {
        scheduleReconnect();
      }
    });
  }
}

function stopAudio() {
  userWantsToPlay = false;
  clearReconnectTimer();
  radio.pause();
  radio.removeAttribute("src"); // Libera el socket y ahorra datos/buffer
  radio.load();
  setPlayerState("stopped");
}

// Pre-warm de la conexión ~100-200ms antes del clic al hacer pointerdown
playButton.addEventListener("pointerdown", () => {
  if (currentState === "stopped" || currentState === "error") {
    prewarmStream();
  }
});

playButton.addEventListener("click", togglePlayPause);
stopButton.addEventListener("click", stopAudio);

// ----------------------------------------------------
// 3. Audio Events & Exponential Backoff Reconnection
// ----------------------------------------------------
radio.addEventListener("playing", () => {
  setPlayerState("playing");
  clearReconnectTimer();
  backoffDelay = 1000; // Reset backoff delay on success
});

radio.addEventListener("waiting", () => {
  if (userWantsToPlay && currentState !== "playing") {
    setPlayerState("connecting");
  }
});

radio.addEventListener("stalled", () => {
  if (userWantsToPlay) {
    setPlayerState("connecting");
  }
});

radio.addEventListener("error", () => {
  if (userWantsToPlay) {
    scheduleReconnect();
  } else {
    setPlayerState("error");
  }
});

function scheduleReconnect() {
  setPlayerState("error");
  clearReconnectTimer();

  console.log(`Reintentando conexión en ${backoffDelay / 1000}s...`);

  reconnectTimer = setTimeout(() => {
    if (userWantsToPlay) {
      setPlayerState("connecting");
      radio.src = STREAM_URL;
      radio.load();
      radio.play().catch((err) => {
        console.warn("Reintento de reproducción fallido:", err);
        scheduleReconnect();
      });
    }
  }, backoffDelay);

  // Exponential backoff increment up to 60s max
  backoffDelay = Math.min(backoffDelay * 2, 60000);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// ----------------------------------------------------
// 4. Volume & Mute Controls with Persistence
// ----------------------------------------------------
function initVolumeControl() {
  const savedVolume = localStorage.getItem("pandemonium_volume");
  if (savedVolume !== null) {
    const vol = parseFloat(savedVolume);
    radio.volume = vol;
    volumeSlider.value = vol;
  } else {
    radio.volume = 1;
    volumeSlider.value = 1;
  }
  updateVolumeIcon(radio.volume);

  volumeSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    radio.volume = val;
    localStorage.setItem("pandemonium_volume", val);
    updateVolumeIcon(val);
    if (val > 0) {
      lastVolume = val;
      muteButton.setAttribute("aria-pressed", "false");
    }
  });

  muteButton.addEventListener("click", () => {
    if (radio.volume > 0) {
      lastVolume = radio.volume;
      radio.volume = 0;
      volumeSlider.value = 0;
      localStorage.setItem("pandemonium_volume", 0);
      muteButton.setAttribute("aria-pressed", "true");
    } else {
      radio.volume = lastVolume || 1;
      volumeSlider.value = radio.volume;
      localStorage.setItem("pandemonium_volume", radio.volume);
      muteButton.setAttribute("aria-pressed", "false");
    }
    updateVolumeIcon(radio.volume);
  });
}

function updateVolumeIcon(vol) {
  if (vol === 0) {
    volumeIcon.className = "fas fa-volume-mute player__icon";
    muteButton.setAttribute("aria-label", "Desactivar silencio");
  } else if (vol < 0.5) {
    volumeIcon.className = "fas fa-volume-down player__icon";
    muteButton.setAttribute("aria-label", "Silenciar");
  } else {
    volumeIcon.className = "fas fa-volume-up player__icon";
    muteButton.setAttribute("aria-label", "Silenciar");
  }
}

// ----------------------------------------------------
// 5. Media Session API Integration
// ----------------------------------------------------
function setupMediaSession() {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Pandemonium",
      artist: "En Vivo",
      album: "La Mejor Radio Online",
      artwork: [
        { src: "./images/logo-pandemonium.png", sizes: "96x96", type: "image/png" },
        { src: "./images/logo-pandemonium.png", sizes: "128x128", type: "image/png" },
        { src: "./images/logo-pandemonium.png", sizes: "192x192", type: "image/png" },
        { src: "./images/logo-pandemonium.png", sizes: "512x512", type: "image/png" }
      ]
    });

    navigator.mediaSession.setActionHandler("play", () => {
      if (currentState !== "playing") {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (currentState === "playing" || currentState === "connecting") {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler("stop", () => {
      stopAudio();
    });
  }
}

// ----------------------------------------------------
// 6. Keyboard Shortcuts & Accessibility
// ----------------------------------------------------
document.addEventListener("keydown", (e) => {
  const activeEl = document.activeElement;
  const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);
  
  if (e.code === "Space" && !isInput) {
    e.preventDefault(); // Previene el scroll hacia abajo
    togglePlayPause();
  }
});

// Init on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  setPlayerState("stopped");
  initVolumeControl();
  setupMediaSession();
});
