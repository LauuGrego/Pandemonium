const rssFeeds = [
  "https://feeds.bbci.co.uk/mundo/rss.xml", // BBC Mundo
  "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml", // Infobae
  "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" // El País
];

// Contenedor de noticias
const noticiasContainer = document.getElementById("noticias-container");

// Filtro de noticias globales y de Argentina (excluyendo noticias locales de otros países)
function filterRelevantNews(articles) {
  const excludedKeywords = [
    "perú",
    "peru",
    "peruano",
    "peruana",
    "chile",
    "chileno",
    "chilena",
    "santiago de chile",
    "colombia",
    "colombiano",
    "colombiana",
    "bogotá",
    "bogota",
    "méxico",
    "mexico",
    "mexicano",
    "mexicana",
    "ecuador",
    "ecuatoriano",
    "ecuatoriana",
    "quito",
    "bolivia",
    "boliviano",
    "boliviana",
    "paraguay",
    "paraguayo",
    "paraguaya",
    "uruguay",
    "uruguayo",
    "uruguaya",
    "montevideo",
    "venezuela",
    "venezolano",
    "venezolana",
    "caracas",
  ];

  const europeanCountries = [
    "españa", "espana", "español", "espanol", "española", "espanola", "madrid", "barcelona", "andalucía", "andalucia", "cataluña", "catalunya",
    "francia", "francés", "francesa", "parís", "paris",
    "alemania", "alemán", "alemana", "berlín", "berlin",
    "italia", "italiano", "italiana", "roma",
    "reino unido", "inglaterra", "británico", "británica", "londres",
    "portugal", "portugués", "portuguesa", "lisboa"
  ];

  const gossipKeywords = [
  ];

  const unwantedSections = [
    "/agencias/"
  ];

  const globalImpactKeywords = [
    "mundial", "global", "internacional", "guerra", "paz", "crisis",
    "pandemia", "virus", "oms", "onu", "otan", "eeuu", "estados unidos",
    "rusia", "putin", "china", "histórico", "alarma", "colapso",
    "mercado", "economía global", "cambio climático", "catástrofe",
    "atentado", "terrorismo"
  ];

  const excludedDomains = [
    ".pe",
    ".cl",
    ".co",
    ".mx",
    ".ec",
    ".bo",
    ".py",
    ".uy",
    ".ve",
  ];

  return articles.filter((article) => {
    const title = article.title ? article.title.trim() : "";
    const description = article.description ? article.description.trim() : "";

    if (!title || title.length < 5 || !article.url) return false;

    const text = `${title} ${description}`.toLowerCase();
    const url = article.url.toLowerCase();

    const hasExcludedDomain = excludedDomains.some(
      (domain) => url.includes(domain + "/") || url.endsWith(domain),
    );
    
    const isSpanishSectionURL = url.includes("/espana/") || url.includes("/espanya/") || url.includes("/espana");

    const isUnwantedSectionURL = unwantedSections.some(section => url.includes(section));

    const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const mentionsExcludedCountry = excludedKeywords.some((keyword) => {
      const kw = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(normalizedText) || regex.test(text);
    });

    const mentionsEuropeanCountry = europeanCountries.some((keyword) => {
      const kw = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(normalizedText) || regex.test(text);
    });

    const hasGlobalImpact = globalImpactKeywords.some((keyword) => {
      const kw = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(normalizedText) || regex.test(text);
    });

    const isGossip = gossipKeywords.some((keyword) => {
      const kw = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(normalizedText) || regex.test(text);
    });

    if (hasExcludedDomain || isSpanishSectionURL || isUnwantedSectionURL || isGossip || mentionsExcludedCountry) return false;
    
    if (mentionsEuropeanCountry && !hasGlobalImpact) return false;
    
    return true;
  });
}

// Eliminar duplicados por título
function removeDuplicates(articles) {
  const seenTitles = new Set();
  return articles.filter((article) => {
    if (seenTitles.has(article.title)) return false;
    seenTitles.add(article.title);
    return true;
  });
}

// Función para renderizar las noticias
function renderNoticias(articles) {
  noticiasContainer.innerHTML = "";
  const row = document.createElement("div");
  row.classList.add("row", "g-4");

  articles.slice(0, 12).forEach((noticia) => {
    const col = document.createElement("div");
    col.classList.add("col-md-6", "col-lg-4", "d-flex", "align-items-stretch");

    const card = document.createElement("div");
    card.classList.add(
      "card",
      "h-100",
      "main__noticia-card",
      "animate__animated",
      "animate__fadeInUp",
    );

    const img = document.createElement("img");
    img.src = noticia.image || "./images/placeholder.jpg";
    img.classList.add("card-img-top", "main__noticia-imagen");
    img.alt = noticia.title;
    img.style.objectFit = "cover";
    img.style.height = "200px";

    const cardBody = document.createElement("div");
    cardBody.classList.add("card-body", "d-flex", "flex-column");

    const title = document.createElement("h5");
    title.classList.add("card-title", "main__noticia-titulo");
    title.textContent = noticia.title;

    const description = document.createElement("p");
    description.classList.add(
      "card-text",
      "main__noticia-descripcion",
      "flex-grow-1",
    );
    description.textContent =
      noticia.description || "Descripción no disponible.";

    const link = document.createElement("a");
    link.href = noticia.url;
    link.target = "_blank";
    link.classList.add("btn", "btn-outline-warning", "mt-3", "w-100");
    link.textContent = "Leer más";

    cardBody.appendChild(title);
    cardBody.appendChild(description);
    cardBody.appendChild(link);

    card.appendChild(img);
    card.appendChild(cardBody);
    col.appendChild(card);
    row.appendChild(col);
  });

  noticiasContainer.appendChild(row);
}

// Función estandarizada para leer un feed RSS y convertirlo a JSON
async function fetchRSS(rssUrl) {
  try {
    // Usamos rss2json, una API pública y gratuita que no requiere keys
    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    );
    const data = await response.json();
    
    if (data.status !== "ok") return [];

    return (data.items || []).map((item) => {
      let cleanDescription = (item.description || "").replace(/(<([^>]+)>)/gi, "").trim();
      if (cleanDescription.length > 250) {
        cleanDescription = cleanDescription.substring(0, 247) + "...";
      }

      return {
        title: item.title,
        description: cleanDescription,
        url: item.link,
        image: item.thumbnail || (item.enclosure && item.enclosure.link) || null,
        publishedAt: item.pubDate,
      };
    });
  } catch (error) {
    console.error("Error fetching RSS:", rssUrl, error);
    return [];
  }
}

async function fetchNoticias() {
  try {
    if (noticiasContainer.innerHTML.trim() === "") {
      noticiasContainer.innerHTML =
        '<p class="main__text text-center"><i class="fas fa-spinner fa-spin"></i> Cargando noticias...</p>';
    }

    const feedPromises = rssFeeds.map(url => fetchRSS(url));
    const results = await Promise.all(feedPromises);

    let allArticles = results.flat();
    allArticles = removeDuplicates(allArticles);
    
    let filteredArticles = filterRelevantNews(allArticles);
    
    if (filteredArticles.length < 3) {
      for (const article of allArticles) {
        if (!filteredArticles.includes(article)) {
          filteredArticles.push(article);
        }
        if (filteredArticles.length >= 3) break;
      }
    }
    
    filteredArticles.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );

    if (filteredArticles.length > 0) {
      renderNoticias(filteredArticles);
    } else {
      noticiasContainer.innerHTML =
        '<p class="main__text text-center">No se encontraron noticias relevantes.</p>';
    }
  } catch (error) {
    console.error("Error fetching noticias:", error);
    noticiasContainer.innerHTML =
      '<p class="main__text text-center text-danger">Error al cargar noticias de los servidores.</p>';
  }
}

fetchNoticias();

// Actualizar cada 10 minutos (600,000 ms)
setInterval(fetchNoticias, 600000);
