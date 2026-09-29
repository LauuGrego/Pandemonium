const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { filterRelevantNews, removeDuplicates } = require("../js/filter.js");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// SerpApi Google News Integration (si se dispone de API Key)
async function fetchSerpApiGoogleNews() {
  const apiKey = process.env.SERPAPI_KEY || process.env.SERAPI_KEY;
  if (!apiKey) {
    console.info("[INFO] SERPAPI_KEY no configurada. Usando fuentes RSS directas con imágenes.");
    return [];
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_news&q=Argentina+noticias&gl=ar&hl=es&api_key=${apiKey}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": USER_AGENT }
    });
    
    const newsResults = response.data.news_results || [];
    const articles = [];

    const processItem = (item) => {
      if (item.title && item.link) {
        // Solo tomar item.thumbnail si es una imagen real; nunca el icon/logo del medio
        const image = (item.thumbnail && typeof item.thumbnail === "string" && item.thumbnail.startsWith("http"))
          ? item.thumbnail
          : null;

        articles.push({
          title: item.title,
          description: item.snippet || item.title,
          url: item.link,
          image: image,
          publishedAt: parseDateString(item.date),
        });
      }
    };

    newsResults.forEach((item) => {
      processItem(item);
      if (Array.isArray(item.stories)) {
        item.stories.forEach(processItem);
      }
    });

    console.log(`[INFO] Se obtuvieron ${articles.length} artículos desde SerpApi.`);
    return articles;
  } catch (error) {
    console.error("[ERROR] SerpApi falló:", error.message);
    return [];
  }
}

// Extraer URL de imagen válida desde un elemento XML RSS
function extractImageFromXmlItem($, el) {
  let img = $(el).find("enclosure[url]").attr("url") ||
            $(el).find("media\\:content[url]").attr("url") ||
            $(el).find("content[url]").attr("url") ||
            $(el).find("media\\:thumbnail[url]").attr("url") ||
            $(el).find("thumbnail[url]").attr("url");

  if (!img) {
    const descRaw = $(el).find("description").text() || "";
    if (descRaw.includes("<img")) {
      const $desc = cheerio.load(descRaw);
      img = $desc("img").attr("src");
    }
  }

  if (!img) {
    const encoded = $(el).find("content\\:encoded").text() || "";
    if (encoded.includes("<img")) {
      const $enc = cheerio.load(encoded);
      img = $enc("img").attr("src");
    }
  }

  if (img && typeof img === "string") {
    img = img.trim().replace(/&amp;/g, "&");
    if (img.startsWith("http://") || img.startsWith("https://")) {
      return img;
    }
  }

  return null;
}

// Feeds RSS directos de principales medios argentinos con imágenes de alta calidad
async function fetchArgentineMediaRss() {
  const feeds = [
    { name: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml" },
    { name: "La Nacion", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
    { name: "Clarin Lo Ultimo", url: "https://www.clarin.com/rss/lo-ultimo/" },
    { name: "Clarin Politica", url: "https://www.clarin.com/rss/politica/" },
    { name: "Clarin Sociedad", url: "https://www.clarin.com/rss/sociedad/" },
    { name: "Clarin Economia", url: "https://www.clarin.com/rss/economia/" },
    { name: "Perfil", url: "https://www.perfil.com/feed" },
    { name: "El Cronista", url: "https://www.cronista.com/files/rss/news.xml" },
    { name: "Ole", url: "https://www.ole.com.ar/rss/ultimas-noticias/" },
  ];

  const articles = [];

  for (const feed of feeds) {
    try {
      const response = await axios.get(feed.url, {
        timeout: 8000,
        headers: { "User-Agent": USER_AGENT }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      let feedItemCount = 0;

      $("item").each((_, el) => {
        const title = $(el).find("title").text().trim();
        const link = $(el).find("link").text().trim();
        const pubDate = $(el).find("pubDate").text().trim() || $(el).find("dc\\:date").text().trim();
        
        let description = $(el).find("description").text().trim();
        if (description.includes("<")) {
          const $desc = cheerio.load(description);
          description = $desc.text().trim();
        }

        const image = extractImageFromXmlItem($, el);

        if (title && link) {
          articles.push({
            title: title,
            description: description || title,
            url: link,
            image: image,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          });
          feedItemCount++;
        }
      });

      console.log(`[INFO] ${feed.name}: ${feedItemCount} artículos cargados.`);
    } catch (err) {
      console.warn(`[WARN] Error obteniendo RSS de ${feed.name}:`, err.message);
    }
  }

  return articles;
}

function parseDateString(dateStr) {
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

function sortByDate(articles) {
  return articles.sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}

// Función principal
async function generateNews() {
  console.log("Iniciando recolección de noticias...");
  let allNews = [];

  // 1. Intentar SerpApi si está disponible
  const serpNews = await fetchSerpApiGoogleNews();
  if (serpNews.length > 0) {
    allNews.push(...serpNews);
  }

  // 2. Fuentes RSS directas argentinas con imágenes de las noticias
  const mediaNews = await fetchArgentineMediaRss();
  allNews.push(...mediaNews);

  console.log(`[INFO] Total bruto recopilado: ${allNews.length} artículos.`);

  // 3. Filtrar relevancia y eliminar duplicados
  const filteredNews = filterRelevantNews(allNews);
  const uniqueNews = removeDuplicates(filteredNews);
  const sortedNews = sortByDate(uniqueNews);

  // 4. Asegurar que las noticias tengan su imagen real correspondiente
  const newsWithImages = sortedNews.filter(
    (article) => article.image && typeof article.image === "string" && article.image.startsWith("http")
  );

  console.log(`[INFO] Artículos relevantes únicos con imagen real: ${newsWithImages.length} de ${sortedNews.length}.`);

  const finalNews = newsWithImages.length >= 12 ? newsWithImages : sortedNews;

  const outputPath = path.join(__dirname, "..", "news.json");
  fs.writeFileSync(outputPath, JSON.stringify(finalNews, null, 2));
  console.log(`News generated successfully at ${outputPath} (${finalNews.length} articles with real images)`);
}

generateNews();


