/**
 * PANDEMONIUM RADIO — CONTROLADOR DE AUDIO UNIFICADO
 * Gestión de stream, reconexión con espera exponencial, sincronización
 * del reproductor principal y mini-reproductor persistente, MediaSession y volumen.
 */

const STREAM_URL = "https://stream.zeno.fm/9kymcedhbbrtv";

// Elementos DOM del Reproductor Principal
const radio = document.getElementById("radio");
const mainPlayerContainer = document.getElementById("main-player-container");
const playButton = document.getElementById("play-button");
const playIcon = document.getElementById("play-icon");
const stopButton = document.getElementById("stop-button");
const statusText = document.getElementById("status-text");
const statusSpinner = document.getElementById("status-spinner");
const transmissionPill = document.getElementById("transmission-pill");
const transmissionStatusText = document.getElementById("transmission-status-text");
const liveDot = document.getElementById("live-dot");
const vinylRecord = document.getElementById("vinyl-record");
const volumeSlider = document.getElementById("volume-slider");
const muteButton = document.getElementById("mute-button");
const volumeIcon = document.getElementById("volume-icon");

// Elementos DOM del Mini-Reproductor Persistente
const miniPlayer = document.getElementById("mini-player");
const miniPlayButton = document.getElementById("mini-play-button");
const miniPlayIcon = document.getElementById("mini-play-icon");
const miniLiveDot = document.getElementById("mini-live-dot");
const miniStatusText = document.getElementById("mini-status-text");
const miniVolumeSlider = document.getElementById("mini-volume-slider");
const miniMuteButton = document.getElementById("mini-mute-button");
const miniVolumeIcon = document.getElementById("mini-volume-icon");

// Variables de Estado
let currentState = "stopped"; // 'stopped' | 'connecting' | 'playing' | 'paused' | 'reconnecting' | 'error'
let userWantsToPlay = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 8;
let backoffDelay = 1500; // Inicio en 1.5s
let lastVolume = 1;

// --------------------------------------------------------------------------
// 1. Máquina de Estados Unificada (Hero Player + Mini Player)
// --------------------------------------------------------------------------
function setPlayerState(state) {
  currentState = state;

  // Clases de estado en contenedores
  const stateClasses = ["is-stopped", "is-connecting", "is-playing", "is-paused", "is-error"];
  
  if (mainPlayerContainer) {
    mainPlayerContainer.classList.remove(...stateClasses);
    mainPlayerContainer.classList.add(`is-${state === "reconnecting" ? "connecting" : state}`);
  }

  if (miniPlayer) {
    miniPlayer.classList.remove(...stateClasses);
    miniPlayer.classList.add(`is-${state === "reconnecting" ? "connecting" : state}`);
  }

  if (document.body) {
    document.body.classList.remove(...stateClasses);
    document.body.classList.add(`is-${state === "reconnecting" ? "connecting" : state}`);
  }

  switch (state) {
    case "stopped":
      updateStatusDisplay("DETENIDO", false);
      updatePlayButtonsUI(false);
      break;

    case "connecting":
      updateStatusDisplay("CONECTANDO…", true);
      updatePlayButtonsUI(true);
      break;

    case "playing":
      updateStatusDisplay("EN VIVO", false);
      updatePlayButtonsUI(true);
      break;

    case "paused":
      updateStatusDisplay("EN PAUSA", false);
      updatePlayButtonsUI(false);
      break;

    case "reconnecting":
      updateStatusDisplay(`RECONECTANDO (${reconnectAttempts})…`, true);
      updatePlayButtonsUI(true);
      break;

    case "error":
      updateStatusDisplay("SIN CONEXIÓN", false);
      updatePlayButtonsUI(false);
      break;
  }
}

function updateStatusDisplay(text, showSpinner) {
  if (statusText) statusText.textContent = text;
  if (miniStatusText) miniStatusText.textContent = text;
  if (transmissionStatusText) {
    if (currentState === "connecting" || currentState === "reconnecting") {
      transmissionStatusText.textContent = "CONECTANDO…";
    } else if (currentState === "error") {
      transmissionStatusText.textContent = "SIN CONEXIÓN";
    } else {
      transmissionStatusText.textContent = "ESCUCHÁ EN VIVO";
    }
  }

  if (statusSpinner) {
    if (showSpinner) {
      statusSpinner.classList.remove("d-none");
    } else {
      statusSpinner.classList.add("d-none");
    }
  }
}

function updatePlayButtonsUI(isPlayingOrLoading) {
  const iconClass = isPlayingOrLoading ? "fas fa-pause" : "fas fa-play";
  const ariaLabel = isPlayingOrLoading ? "Pausar transmisión de radio" : "Reproducir transmisión de radio";
  const ariaPressed = isPlayingOrLoading ? "true" : "false";

  if (playIcon) playIcon.className = iconClass;
  if (playButton) {
    playButton.setAttribute("aria-label", ariaLabel);
    playButton.setAttribute("aria-pressed", ariaPressed);
  }

  if (miniPlayIcon) miniPlayIcon.className = iconClass;
  if (miniPlayButton) {
    miniPlayButton.setAttribute("aria-label", ariaLabel);
    miniPlayButton.setAttribute("aria-pressed", ariaPressed);
  }
}

// --------------------------------------------------------------------------
// 2. Lógica de Reproducción y Pre-conexión
// --------------------------------------------------------------------------
function prewarmStream() {
  if (!radio.src || radio.src !== STREAM_URL) {
    radio.src = STREAM_URL;
    radio.load();
  }
}

function togglePlayPause() {
  if (currentState === "playing" || currentState === "connecting" || currentState === "reconnecting") {
    // Usuario solicita pausar
    userWantsToPlay = false;
    clearReconnectTimer();
    radio.pause();
    setPlayerState("paused");
  } else {
    // Usuario solicita reproducir
    userWantsToPlay = true;
    clearReconnectTimer();
    reconnectAttempts = 0;
    backoffDelay = 1500;
    prewarmStream();
    setPlayerState("connecting");

    const playPromise = radio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Aviso al iniciar audio:", err);
        if (userWantsToPlay) {
          scheduleReconnect();
        }
      });
    }
  }
}

function stopAudio() {
  userWantsToPlay = false;
  clearReconnectTimer();
  reconnectAttempts = 0;
  radio.pause();
  radio.removeAttribute("src"); // Libera socket de audio y ahorra datos de conexión
  radio.load();
  setPlayerState("stopped");
}

// Event Listeners de los botones de reproducción
if (playButton) {
  playButton.addEventListener("click", togglePlayPause);
  playButton.addEventListener("pointerdown", () => {
    if (currentState === "stopped" || currentState === "error" || currentState === "paused") {
      prewarmStream();
    }
  });
}

if (stopButton) {
  stopButton.addEventListener("click", stopAudio);
}

if (miniPlayButton) {
  miniPlayButton.addEventListener("click", togglePlayPause);
}

// --------------------------------------------------------------------------
// 3. Eventos del Elemento Audio Nativo & Reconexión
// --------------------------------------------------------------------------
radio.addEventListener("playing", () => {
  setPlayerState("playing");
  clearReconnectTimer();
  reconnectAttempts = 0;
  backoffDelay = 1500;
});

radio.addEventListener("waiting", () => {
  if (userWantsToPlay && currentState !== "playing") {
    setPlayerState("connecting");
  }
});

radio.addEventListener("stalled", () => {
  if (userWantsToPlay && currentState === "playing") {
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

radio.addEventListener("pause", () => {
  if (!userWantsToPlay && currentState !== "stopped") {
    setPlayerState("paused");
  }
});

function scheduleReconnect() {
  if (!userWantsToPlay) return;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("Límite máximo de reconexiones alcanzado.");
    userWantsToPlay = false;
    clearReconnectTimer();
    setPlayerState("error");
    return;
  }

  reconnectAttempts++;
  setPlayerState("reconnecting");
  clearReconnectTimer();

  reconnectTimer = setTimeout(() => {
    if (userWantsToPlay) {
      setPlayerState("connecting");
      radio.src = STREAM_URL;
      radio.load();
      radio.play().catch((err) => {
        console.warn(`Reintento ${reconnectAttempts} fallido:`, err);
        scheduleReconnect();
      });
    }
  }, backoffDelay);

  // Espera progresiva exponencial hasta 60s
  backoffDelay = Math.min(backoffDelay * 2, 60000);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// --------------------------------------------------------------------------
// 4. Control de Volumen Sincronizado (Hero + Mini)
// --------------------------------------------------------------------------
function initVolumeControls() {
  const savedVolume = localStorage.getItem("pandemonium_volume");
  let currentVol = 1;

  if (savedVolume !== null) {
    const parsed = parseFloat(savedVolume);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      currentVol = parsed;
    }
  }

  radio.volume = currentVol;
  lastVolume = currentVol > 0 ? currentVol : 1;
  applyVolumeToUI(currentVol);

  // Slider Principal
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
    });
  }

  // Slider Mini-Player
  if (miniVolumeSlider) {
    miniVolumeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
    });
  }

  // Botón Mute Principal
  if (muteButton) {
    muteButton.addEventListener("click", toggleMute);
  }

  // Botón Mute Mini-Player
  if (miniMuteButton) {
    miniMuteButton.addEventListener("click", toggleMute);
  }
}

function setVolume(val) {
  radio.volume = val;
  if (val > 0) lastVolume = val;
  localStorage.setItem("pandemonium_volume", val);
  applyVolumeToUI(val);
}

function toggleMute() {
  if (radio.volume > 0) {
    lastVolume = radio.volume;
    setVolume(0);
  } else {
    setVolume(lastVolume > 0 ? lastVolume : 1);
  }
}

function applyVolumeToUI(val) {
  if (volumeSlider) volumeSlider.value = val;
  if (miniVolumeSlider) miniVolumeSlider.value = val;

  const isMuted = val === 0;
  const iconClass = isMuted 
    ? "fas fa-volume-mute" 
    : val < 0.5 
      ? "fas fa-volume-down" 
      : "fas fa-volume-up";

  const muteLabel = isMuted ? "Activar sonido" : "Silenciar";
  const mutePressed = isMuted ? "true" : "false";

  if (volumeIcon) volumeIcon.className = iconClass;
  if (miniVolumeIcon) miniVolumeIcon.className = iconClass;

  if (muteButton) {
    muteButton.setAttribute("aria-label", muteLabel);
    muteButton.setAttribute("aria-pressed", mutePressed);
  }
  if (miniMuteButton) {
    miniMuteButton.setAttribute("aria-label", muteLabel);
    miniMuteButton.setAttribute("aria-pressed", mutePressed);
  }
}

// --------------------------------------------------------------------------
// 5. Mini-Reproductor Persistente con IntersectionObserver
// --------------------------------------------------------------------------
function initPersistentMiniPlayer() {
  if (!miniPlayer || !mainPlayerContainer) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Si el reproductor del hero no es visible, mostrar el mini reproductor
          if (entry.isIntersecting) {
            miniPlayer.classList.remove("is-visible");
          } else {
            miniPlayer.classList.add("is-visible");
          }
        });
      },
      {
        root: null,
        threshold: 0.1
      }
    );

    observer.observe(mainPlayerContainer);
  }
}

// --------------------------------------------------------------------------
// 6. Integración con MediaSession API (Controles del SO / Notificaciones)
// --------------------------------------------------------------------------
function setupMediaSession() {
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Pandemonium Radio",
        artist: "La Música Que El Algoritmo Te Esconde",
        album: "Rock · Indie · Metal · Reggae",
        artwork: [
          { src: "./images/logo-pandemonium.png", sizes: "96x96", type: "image/png" },
          { src: "./images/logo-pandemonium.png", sizes: "128x128", type: "image/png" },
          { src: "./images/logo-pandemonium.png", sizes: "192x192", type: "image/png" },
          { src: "./images/logo-pandemonium.png", sizes: "512x512", type: "image/png" },
          { src: "./images/vinyl-record.jpg", sizes: "1024x1024", type: "image/jpeg" }
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
    } catch (e) {
      console.warn("MediaSession no soportado o limitado:", e);
    }
  }
}

// --------------------------------------------------------------------------
// 7. Accesibilidad por Teclado (Barra espaciadora para reproducir/pausar)
// --------------------------------------------------------------------------
document.addEventListener("keydown", (e) => {
  const activeEl = document.activeElement;
  const isInput = activeEl && (
    activeEl.tagName === "INPUT" || 
    activeEl.tagName === "TEXTAREA" || 
    activeEl.isContentEditable
  );

  if (e.code === "Space" && !isInput) {
    e.preventDefault();
    togglePlayPause();
  }
});

// Inicialización cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
  setPlayerState("stopped");
  initVolumeControls();
  initPersistentMiniPlayer();
  setupMediaSession();
});
