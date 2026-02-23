// Forzamos la precarga del audio al cargar la página
window.addEventListener("load", () => {
  const radio = document.getElementById("radio");
  radio.load(); // Inicia la precarga del stream
  // Initially stopped
  document.querySelector(".player-container").classList.add("is-stopped");
});

// Obtener el elemento de audio
const radio = document.getElementById("radio");

// Al hacer clic en "Play" se inicia la reproducción
document.getElementById("play-button").addEventListener("click", function () {
  radio.play().catch((error) => console.error("Error al reproducir:", error));
  document.querySelector(".player-container").classList.remove("is-stopped");
});

// Al hacer clic en "Stop" se pausa y reinicia el audio
document.getElementById("stop-button").addEventListener("click", function () {
  radio.pause();
  radio.currentTime = 0;
  document.querySelector(".player-container").classList.add("is-stopped");
});
