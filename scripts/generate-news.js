const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

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
    console.error("Error fetching news from GNews:", error);
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
    console.error("Error fetching news from NewsAPI:", error);
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
    console.error("Error fetching news from Currents API:", error);
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
    fetchCurrentsAPI()
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

// Filtro de noticias globales y de Argentina (excluyendo noticias locales de otros países)
function filterRelevantNews(articles) {
  // Palabras y dominios a excluir (noticias locales de otros países)
  const excludedKeywords = [
    "perú", "peru", "peruano", "peruana", "lima",
    "chile", "chileno", "chilena", "santiago de chile",
    "colombia", "colombiano", "colombiana", "bogotá", "bogota",
    "méxico", "mexico", "mexicano", "mexicana",
    "ecuador", "ecuatoriano", "ecuatoriana", "quito",
    "bolivia", "boliviano", "boliviana", "la paz",
    "paraguay", "paraguayo", "paraguaya", "asunción", "asuncion",
    "uruguay", "uruguayo", "uruguaya", "montevideo",
    "venezuela", "venezolano", "venezolana", "caracas"
  ];
  
  const excludedDomains = [".pe", ".cl", ".co", ".mx", ".ec", ".bo", ".py", ".uy", ".ve"];

  return articles.filter((article) => {
    // Sanitizar texto
    const title = article.title ? article.title.trim() : "";
    const description = article.description ? article.description.trim() : "";
    
    // Ignoramos articulos sin título o sin URL
    if (!title || title.length < 5 || !article.url) return false;

    const text = `${title} ${description}`.toLowerCase();
    const url = article.url.toLowerCase();

    // Comprobar si proviene de un dominio excluido (ej. peru.com, elcomercio.pe)
    const hasExcludedDomain = excludedDomains.some(domain => url.includes(domain + "/") || url.endsWith(domain));
    
    // Comprobar si menciona países excluidos como tema principal
    // Usamos límites de palabra (\b) para no excluir palabras que contengan esas letras por accidente
    const mentionsExcludedCountry = excludedKeywords.some(keyword => {
      // Regex que busca la palabra exacta
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      return regex.test(text);
    });

    if (hasExcludedDomain || mentionsExcludedCountry) {
      return false; // Se descarta la noticia
    }

    // Conservamos el resto (Mundial y Argentina)
    return true;
  });
}

// Eliminar duplicados por título
function removeDuplicates(articles) {
  const seenTitles = new Set();
  return articles.filter((article) => {
    if (seenTitles.has(article.title)) {
      return false;
    }
    seenTitles.add(article.title);
    return true;
  });
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
