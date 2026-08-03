const STREAM_URL = "https://stream.zeno.fm/9kymcedhbbrtv";
const radio = document.getElementById("radio");

// Forzamos la precarga del audio al cargar la página
window.addEventListener("load", () => {
  radio.src = STREAM_URL;
  radio.load(); // Inicia la precarga del stream
  // Initially stopped
  document.querySelector(".player-container").classList.add("is-stopped");
});

// Al hacer clic en "Play" se inicia la reproducción
document.getElementById("play-button").addEventListener("click", function () {
  // Si el src fue removido (por Stop), lo reasignamos para conectarnos al en vivo
  if (radio.src !== STREAM_URL) {
    radio.src = STREAM_URL;
    radio.load();
  }
  radio.play().catch((error) => console.error("Error al reproducir:", error));
  document.querySelector(".player-container").classList.remove("is-stopped");
});

// Al hacer clic en "Stop" se pausa, se detiene la descarga de datos y se libera la conexión
document.getElementById("stop-button").addEventListener("click", function () {
  radio.pause();
  radio.removeAttribute("src"); // Vaciamos la fuente para cerrar el socket y ahorrar datos/búfer
  radio.load(); // Aplica el cambio y limpia los buffers internos
  document.querySelector(".player-container").classList.add("is-stopped");
});
