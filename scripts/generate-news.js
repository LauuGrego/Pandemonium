const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { filterRelevantNews, removeDuplicates } = require("../js/filter.js");

// SerpApi Google News Integration
async function fetchSerpApiGoogleNews() {
  const apiKey = process.env.SERPAPI_KEY || process.env.SERAPI_KEY;
  if (!apiKey) {
    console.warn("[INFO] SERPAPI_KEY no enviada en variables de entorno. Omitiendo SerpApi.");
    return [];
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_news&q=Argentina+noticias&gl=ar&hl=es&api_key=${apiKey}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    const newsResults = response.data.news_results || [];
    const articles = [];

    newsResults.forEach((item) => {
      if (item.title && item.link) {
        articles.push({
          title: item.title,
          description: item.snippet || item.title,
          url: item.link,
          image: item.thumbnail || (item.source && item.source.icon) || null,
          publishedAt: parseSerpApiDate(item.date),
        });
      }

      if (Array.isArray(item.stories)) {
        item.stories.forEach((sub) => {
          if (sub.title && sub.link) {
            articles.push({
              title: sub.title,
              description: sub.snippet || sub.title,
              url: sub.link,
              image: sub.thumbnail || (sub.source && sub.source.icon) || null,
              publishedAt: parseSerpApiDate(sub.date),
            });
          }
        });
      }
    });

    console.log(`[INFO] Successfully fetched ${articles.length} articles from SerpApi Google News.`);
    return articles;
  } catch (error) {
    console.error("[ERROR] Fetching news from SerpApi failed:", error.message);
    return [];
  }
}

// Google News RSS Fallback (Gratuito sin API Key)
async function fetchGoogleNewsRss() {
  const rssUrls = [
    "https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419",
    "https://news.google.com/rss/search?q=Argentina+noticias&hl=es-419&gl=AR&ceid=AR:es-419"
  ];
  
  const articles = [];

  for (const url of rssUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      $("item").each((_, el) => {
        const title = $(el).find("title").text().trim();
        const link = $(el).find("link").text().trim();
        const pubDate = $(el).find("pubDate").text().trim();
        const descriptionRaw = $(el).find("description").text();
        const sourceName = $(el).find("source").text().trim();

        let description = "";
        if (descriptionRaw) {
          const $desc = cheerio.load(descriptionRaw);
          description = $desc.text().trim();
        }
        if (!description || description === title) {
          description = sourceName ? `Noticias de ${sourceName}` : "Noticias de Argentina en vivo.";
        }

        if (title && link) {
          articles.push({
            title: title,
            description: description,
            url: link,
            image: null,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.warn(`[WARN] Error obteniendo RSS de ${url}:`, err.message);
    }
  }

  console.log(`[INFO] Se obtuvieron ${articles.length} artículos vía Google News RSS.`);
  return articles;
}

function parseSerpApiDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  
  const now = new Date();
  const lower = dateStr.toLowerCase();
  if (lower.includes("min") || lower.includes("muto")) {
    const mins = parseInt(lower) || 10;
    return new Date(now.getTime() - mins * 60 * 1000).toISOString();
  }
  if (lower.includes("hour") || lower.includes("hora")) {
    const hours = parseInt(lower) || 1;
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  }
  if (lower.includes("day") || lower.includes("dia")) {
    const days = parseInt(lower) || 1;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  }
  return now.toISOString();
}

// Ordenar por fecha
function sortByDate(articles) {
  return articles.sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

// Función principal
async function generateNews() {
  console.log("Fetching news from SerpApi...");
  let allNews = await fetchSerpApiGoogleNews();
  
  if (allNews.length === 0) {
    console.log("SerpApi no devolvió artículos. Ejecutando fallback de Google News RSS...");
    allNews = await fetchGoogleNewsRss();
  }

  const filteredNews = filterRelevantNews(allNews);
  const uniqueNews = removeDuplicates(filteredNews);
  const sortedNews = sortByDate(uniqueNews);

  const outputPath = path.join(__dirname, "..", "news.json");
  fs.writeFileSync(outputPath, JSON.stringify(sortedNews, null, 2));
  console.log(`News generated successfully at ${outputPath} (${sortedNews.length} articles)`);
}

generateNews();

