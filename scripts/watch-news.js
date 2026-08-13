const { exec } = require('child_process');
const path = require('path');

const generateScript = path.join(__dirname, 'generate-news.js');
const INTERVAL = 12 * 60 * 60 * 1000; // 12 horas (2 veces al día)

function runGeneration() {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando generación de noticias...`);
  exec(`node "${generateScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
    console.log(`[${new Date().toLocaleTimeString()}] Generación completada. Próxima actualización en 12 horas.`);
  });
}

// Ejecutar de inmediato
runGeneration();

// Ejecutar cada 12 horas (a las 00:00 y 12:00 aprox)
setInterval(runGeneration, INTERVAL);
