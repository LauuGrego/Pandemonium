// Claves de API (usados directamente en frontend)
const apiKeyGNews = "5b2a14b929e141abc003c8744ac61723";
const apiKeyNewsAPI = "6e2795d88a584b7e9a9f1e6533b85cc4";
const apiKeyCurrents = "Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG";

// Contenedor de noticias
const noticiasContainer = document.getElementById("noticias-container");

// Filtro de noticias globales y de Argentina (excluyendo noticias locales de otros países)
function filterRelevantNews(articles) {
  const excludedKeywords = [
    "perú",
    "peru",
    "peruano",
    "peruana",
    "lima",
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
    "la paz",
    "paraguay",
    "paraguayo",
    "paraguaya",
    "asunción",
    "asuncion",
    "uruguay",
    "uruguayo",
    "uruguaya",
    "montevideo",
    "venezuela",
    "venezolano",
    "venezolana",
    "caracas",
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
    const mentionsExcludedCountry = excludedKeywords.some((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      return regex.test(text);
    });

    if (hasExcludedDomain || mentionsExcludedCountry) return false;
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

// APIs
async function fetchGNews() {
  try {
    const response = await fetch(
      `https://gnews.io/api/v4/top-headlines?token=${apiKeyGNews}&lang=es`,
    );
    const data = await response.json();
    return (data.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      publishedAt: article.publishedAt,
    }));
  } catch (error) {
    console.error("Error GNews:", error);
    return [];
  }
}

async function fetchNewsAPI() {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?apiKey=${apiKeyNewsAPI}&language=es`,
    );
    const data = await response.json();
    return (data.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
    }));
  } catch (error) {
    console.error("Error NewsAPI:", error);
    return [];
  }
}

async function fetchCurrentsAPI() {
  try {
    const response = await fetch(
      `https://api.currentsapi.services/v1/latest-news?apiKey=${apiKeyCurrents}&language=es`,
    );
    const data = await response.json();
    return (data.news || []).map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      publishedAt: article.published,
    }));
  } catch (error) {
    console.error("Error CurrentsAPI:", error);
    return [];
  }
}

async function fetchNoticias() {
  try {
    // Show a loading state
    if (noticiasContainer.innerHTML.trim() === "") {
      noticiasContainer.innerHTML =
        '<p class="main__text text-center"><i class="fas fa-spinner fa-spin"></i> Cargando noticias...</p>';
    }

    const [gNews, newsApi, currentsApi] = await Promise.all([
      fetchGNews(),
      fetchNewsAPI(),
      fetchCurrentsAPI(),
    ]);

    let allArticles = [...gNews, ...newsApi, ...currentsApi];
    allArticles = filterRelevantNews(allArticles);
    allArticles = removeDuplicates(allArticles);
    allArticles.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );

    if (allArticles.length > 0) {
      renderNoticias(allArticles);
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

// Cargar noticias al iniciar
fetchNoticias();

// Actualizar cada 10 minutos (600,000 ms)
setInterval(fetchNoticias, 600000);
