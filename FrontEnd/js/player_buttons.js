document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const audio = new Audio('./audio/sample.mp3'); // Ruta del archivo de audio

    playButton.addEventListener('click', function() {
        audio.play();
    });

    pauseButton.addEventListener('click', function() {
        audio.pause();
    });
});