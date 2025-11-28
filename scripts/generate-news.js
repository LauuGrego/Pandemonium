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
    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);
    const articles = [];

    $(source.articleSelector).each((_, element) => {
      const title = $(element).find(source.titleSelector).text().trim();
      const link = $(element).attr(source.linkAttribute);
      if (title && link) {
        articles.push({
          title,
          url: source.baseUrl ? `${source.baseUrl}${link}` : link,
        });
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error);
    return [];
  }
}

// All sources
async function fetchAllNews() {
  const scrapedNews = await Promise.all(
    newsSources.map((source) => scrapeNews(source))
  );
  const gNews = await fetchGNews();
  const newsAPI = await fetchNewsAPI();
  const currentsAPI = await fetchCurrentsAPI();

  return [...scrapedNews.flat(), ...gNews, ...newsAPI, ...currentsAPI];
}

// Filtro de keywords + solo internacional excepto Argentina
function filterNewsByKeywords(articles) {
  const keywords = [
    "Argentina",
    "Mundial",
    "Crisis",
    "Economía",
    "Guerra",
    "Tecnología",
    "Fútbol",
    "Copa",
    "EE.UU",
    "Europa",
    "Medicina",
    "Innovación",
    "Covid",
    "Vacuna",
    "Pandemia",
    "Coronavirus",
    "Vacunación",
    "Salud",
    "Ciencia",
    "Investigación",
    "Cultura",
    "Arte",
    "Música",
    "Cine",
    "Literatura",
    "Teatro",
    "Deporte",
    "Juegos",
    "Olimpiadas",
    "Atletismo",
    "Natación",
    "Tenis",
    "Baloncesto",
    "Ciclismo",
    "Voleibol",
    "Golf",
    "Rugby",
    "Boxeo",
    "Automovilismo",
    "Fórmula 1",
    "MotoGP",
    "Informática",
    "Internet",
    "Redes",
    "Programación",
    "Desarrollo",
    "Software",
    "Hardware",
    "Videojuegos",
    "Consolas",
    "Móviles",
    "Aplicaciones",
    "Sistemas",
    "Ciberseguridad",
    "Hacking",
    "Finanzas",
    "Bolsa",
    "Mercados",
    "Inversión",
    "Empresas",
    "Negocios",
  ];

  return articles.filter((article) => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();
    const url = article.url?.toLowerCase() || "";

    const isArgentinian =
      url.includes("clarin") ||
      url.includes("lanacion") ||
      url.includes("pagina12") ||
      url.includes("infobae.com/argentina") ||
      url.includes(".ar");

    const mentionsArgentina = text.includes("argentina");

    const isInternational =
      !url.includes(".ar") && !isArgentinian && !mentionsArgentina;

    return (
      keywords.some((keyword) => text.includes(keyword.toLowerCase())) &&
      (isInternational || isArgentinian || mentionsArgentina)
    );
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
  const filteredNews = filterNewsByKeywords(allNews);
  const uniqueNews = removeDuplicates(filteredNews);
  const sortedNews = sortByDate(uniqueNews);

  const outputPath = path.join(__dirname, "..", "news.json");
  fs.writeFileSync(outputPath, JSON.stringify(sortedNews, null, 2));
  console.log(`News generated successfully at ${outputPath}`);
}

generateNews();
