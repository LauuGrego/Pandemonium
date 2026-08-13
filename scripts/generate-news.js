const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { filterRelevantNews, removeDuplicates } = require("../js/filter.js");

// API keys
const apiKeyGNews = "5b2a14b929e141abc003c8744ac61723";
const apiKeyNewsAPI = "6e2795d88a584b7e9a9f1e6533b85cc4";
const apiKeyCurrents = "Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG";

// List of websites to scrape
const newsSources = [
  {
    name: "BBC",
    url: "https://www.bbc.com/mundo",
    articleSelector: ".gs-c-promo-heading",
    titleSelector: ".gs-c-promo-heading__title",
    linkAttribute: "href",
    baseUrl: "https://www.bbc.com",
  },
  {
    name: "El País",
    url: "https://elpais.com/",
    articleSelector: ".c_t",
    titleSelector: ".c_t",
    linkAttribute: "href",
    baseUrl: "https://elpais.com/internacional/",
  },
];

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

// GNews
async function fetchGNews() {
  try {
    const response = await axios.get(
      `https://gnews.io/api/v4/top-headlines?token=${apiKeyGNews}&lang=es`
    );
    return response.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      publishedAt: article.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching news from GNews:", error.message);
    return [];
  }
}

// NewsAPI
async function fetchNewsAPI() {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?apiKey=${apiKeyNewsAPI}&language=es`
    );
    return response.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching news from NewsAPI:", error.message);
    return [];
  }
}

// CurrentsAPI
async function fetchCurrentsAPI() {
  try {
    const response = await axios.get(
      `https://api.currentsapi.services/v1/latest-news?apiKey=${apiKeyCurrents}&language=es`
    );
    return response.data.news.map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      publishedAt: article.published,
    }));
  } catch (error) {
    console.error("Error fetching news from Currents API:", error.message);
    return [];
  }
}

// Scraping individual source
async function scrapeNews(source) {
  try {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
      }
    });

    if (response.status !== 200) {
      console.warn(`[WARNING] Failed to scrape ${source.name} - Status code: ${response.status}`);
      return [];
    }

    const $ = cheerio.load(response.data);
    const articles = [];

    $(source.articleSelector).each((_, element) => {
      const title = $(element).find(source.titleSelector).text().trim();
      const link = $(element).attr(source.linkAttribute);
      if (title && link) {
        articles.push({
          title,
          description: "Noticia de portada seleccionada.",
          url: source.baseUrl ? `${source.baseUrl}${link}` : link,
          image: null,
          publishedAt: new Date().toISOString()
        });
      }
    });

    console.log(`[INFO] Successfully scraped ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`[ERROR] Scraping ${source.name} failed:`, error.message);
    return [];
  }
}

// All sources
async function fetchAllNews() {
  const scrapingPromises = newsSources.map((source) => scrapeNews(source));
  
  const results = await Promise.allSettled([
    ...scrapingPromises,
    fetchGNews(),
    fetchNewsAPI(),
    fetchCurrentsAPI(),
    fetchSerpApiGoogleNews()
  ]);

  const allArticles = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    } else {
      console.error(`[ERROR] A data source failed at index ${index}:`, result.reason);
    }
  });

  return allArticles;
}

// Ordenar por fecha
function sortByDate(articles) {
  return articles.sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

// Función principal
async function generateNews() {
  console.log("Fetching news...");
  const allNews = await fetchAllNews();
  const filteredNews = filterRelevantNews(allNews);
  const uniqueNews = removeDuplicates(filteredNews);
  const sortedNews = sortByDate(uniqueNews);

  const outputPath = path.join(__dirname, "..", "news.json");
  fs.writeFileSync(outputPath, JSON.stringify(sortedNews, null, 2));
  console.log(`News generated successfully at ${outputPath}`);
}

generateNews();
