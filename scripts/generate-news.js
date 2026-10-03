const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { filterRelevantNews, removeDuplicates } = require("../js/filter.js");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Categorías de Infobae con cuota de 2 o 3 noticias cada una (Total = 14 noticias para 7 filas x 2 columnas)
const INFOBAE_CATEGORIES = [
  { name: "Política", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml", targetCount: 3 },
  { name: "Sociedad", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/?outputType=xml", targetCount: 3 },
  { name: "Economía", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml", targetCount: 2 },
  { name: "Deportes", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml", targetCount: 2 },
  { name: "Tecno", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml", targetCount: 2 },
  { name: "Teleshow", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/teleshow/?outputType=xml", targetCount: 2 },
];

// Fuentes de respaldo exclusivas de Infobae en caso de que alguna categoría principal tenga pocas noticias
const BACKUP_INFOBAE_FEEDS = [
  { name: "Salud", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/salud/?outputType=xml" },
  { name: "Policiales", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/policiales/?outputType=xml" },
  { name: "Cultura", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/cultura/?outputType=xml" },
  { name: "General", url: "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml" }
];

const TOTAL_TARGET_NEWS = 14; // 7 filas x 2 columnas

// Extraer URL de imagen válida desde un elemento XML RSS de Infobae
function extractImageFromXmlItem($, el) {
  let img = $(el).find("media\\:content[url]").attr("url") ||
            $(el).find("enclosure[url]").attr("url") ||
            $(el).find("content[url]").attr("url") ||
            $(el).find("media\\:thumbnail[url]").attr("url") ||
            $(el).find("thumbnail[url]").attr("url");

  if (!img) {
    const descRaw = $(el).find("description").text() || "";
    if (descRaw.includes("<img")) {
      const match = descRaw.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) img = match[1];
    }
  }

  if (!img) {
    const encoded = $(el).find("content\\:encoded").text() || "";
    if (encoded.includes("<img")) {
      const match = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) img = match[1];
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

// Limpiar descripción de etiquetas HTML o entidades
function cleanDescription(rawDesc) {
  if (!rawDesc) return "";
  let text = rawDesc;
  if (text.includes("<")) {
    const $d = cheerio.load(text);
    text = $d.text();
  }
  return text.trim().replace(/\s+/g, " ");
}

// Obtener y parsear artículos de un feed RSS de Infobae
async function fetchInfobaeFeed(categoryName, feedUrl) {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 8000,
      headers: { "User-Agent": USER_AGENT }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const articles = [];

    $("item").each((_, el) => {
      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim();
      const pubDate = $(el).find("pubDate").text().trim() || $(el).find("dc\\:date").text().trim();
      const rawDesc = $(el).find("description").text().trim();
      const description = cleanDescription(rawDesc);
      const image = extractImageFromXmlItem($, el);

      // Infobae: solo agregar noticias válidas con enlace e imagen
      if (title && link && link.includes("infobae.com")) {
        articles.push({
          title,
          description: description || title,
          url: link,
          image: image || null,
          category: categoryName,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
        });
      }
    });

    return articles;
  } catch (err) {
    console.warn(`[WARN] Error obteniendo RSS de Infobae [${categoryName}]:`, err.message);
    return [];
  }
}

// Función principal
async function generateNews() {
  console.log("Iniciando recolección de noticias exclusivas de Infobae...");
  const selectedNews = [];
  const leftoverNews = [];

  // 1. Recolectar noticias por categoría principal (2 o 3 por cada una)
  for (const cat of INFOBAE_CATEGORIES) {
    console.log(`[INFO] Consultando Infobae ${cat.name} (Meta: ${cat.targetCount})...`);
    const rawArticles = await fetchInfobaeFeed(cat.name, cat.url);

    // Filtrar relevancia geográfica y duplicados
    const filtered = filterRelevantNews(rawArticles);
    const unique = removeDuplicates(filtered);

    // Priorizar aquellas con imagen real
    const withImage = unique.filter(
      (a) => a.image && typeof a.image === "string" && a.image.startsWith("http")
    );
    const candidates = withImage.length >= cat.targetCount ? withImage : unique;

    // Ordenar por fecha descendente
    candidates.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const picked = candidates.slice(0, cat.targetCount);
    selectedNews.push(...picked);

    // Guardar sobrantes por si necesitamos rellenar
    const leftovers = candidates.slice(cat.targetCount);
    leftoverNews.push(...leftovers);

    console.log(`[INFO] Infobae ${cat.name}: ${picked.length} seleccionadas de ${rawArticles.length} disponibles.`);
  }

  // 2. Si alguna categoría tuvo menos noticias de las requeridas, completar hasta 14
  if (selectedNews.length < TOTAL_TARGET_NEWS && leftoverNews.length > 0) {
    console.log(`[INFO] Rellenando desde noticias sobrantes para alcanzar ${TOTAL_TARGET_NEWS}...`);
    for (const item of leftoverNews) {
      if (selectedNews.length >= TOTAL_TARGET_NEWS) break;
      if (!selectedNews.some((a) => a.url === item.url)) {
        selectedNews.push(item);
      }
    }
  }

  // 3. Si aún faltan para alcanzar 14, consultar feeds de respaldo de Infobae
  if (selectedNews.length < TOTAL_TARGET_NEWS) {
    console.log(`[INFO] Consultando feeds de respaldo de Infobae...`);
    for (const backup of BACKUP_INFOBAE_FEEDS) {
      if (selectedNews.length >= TOTAL_TARGET_NEWS) break;
      const backupArticles = await fetchInfobaeFeed(backup.name, backup.url);
      const filteredBackup = filterRelevantNews(backupArticles);
      const uniqueBackup = removeDuplicates(filteredBackup);

      for (const item of uniqueBackup) {
        if (selectedNews.length >= TOTAL_TARGET_NEWS) break;
        if (!selectedNews.some((a) => a.url === item.url)) {
          selectedNews.push(item);
        }
      }
    }
  }

  // 4. Asegurar exactamente 14 noticias (7 filas x 2 columnas)
  const finalNews = selectedNews.slice(0, TOTAL_TARGET_NEWS);

  console.log(`\n======================================================`);
  console.log(`[ÉXITO] Total de noticias recopiladas de Infobae: ${finalNews.length}`);
  console.log(`Estructura: 7 filas de 2 columnas`);
  console.log(`======================================================`);
  finalNews.forEach((a, i) => {
    console.log(`${(i + 1).toString().padStart(2, " ")}. [${a.category.padEnd(9, " ")}] ${a.title.substring(0, 70)}...`);
  });

  const outputPath = path.join(__dirname, "..", "news.json");
  fs.writeFileSync(outputPath, JSON.stringify(finalNews, null, 2), "utf-8");
  console.log(`\nArchivo guardado en: ${outputPath}`);
}

generateNews();
