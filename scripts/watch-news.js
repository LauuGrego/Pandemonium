const { exec } = require('child_process');
const path = require('path');

const generateScript = path.join(__dirname, 'generate-news.js');
const INTERVAL = 10 * 60 * 1000; // 10 minutes

function runGeneration() {
  console.log(`[${new Date().toLocaleTimeString()}] Starting news generation...`);
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
    console.log(`[${new Date().toLocaleTimeString()}] News generation complete. Waiting ${INTERVAL / 60000} minutes...`);
  });
}

// Run immediately
runGeneration();

// Run every 10 minutes
setInterval(runGeneration, INTERVAL);
