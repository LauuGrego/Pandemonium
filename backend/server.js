const express = require('express');
const cors = require('cors');
const { fetchAndProcessNews } = require('./news-scraper'); // Correct function imported

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/news', async (req, res) => {
  try {
    const news = await fetchAndProcessNews(); // Use the correct function
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Error fetching news' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
