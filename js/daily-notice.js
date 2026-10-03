// Contenedor de noticias
const noticiasContainer = document.getElementById("noticias-container");

// Utilidades de filtrado compartidas desde js/filter.js
function getFilterFunctions() {
  if (typeof NewsFilter !== "undefined") {
    return NewsFilter;
  }
  return {
    filterRelevantNews: (articles) => articles,
    removeDuplicates: (articles) => articles
  };
}

// Colores distintivos para cada categoría de Infobae
const CATEGORY_COLORS = {
  "Política": "#3b82f6",
  "Sociedad": "#f59e0b",
  "Economía": "#10b981",
  "Deportes": "#ef4444",
  "Tecno": "#8b5cf6",
  "Teleshow": "#ec4899",
  "Salud": "#06b6d4",
  "Policiales": "#f97316",
  "Cultura": "#a855f7",
  "General": "#d4af37"
};

// Formateador de tiempo relativo
function formatTimeAgo(isoDate) {
  if (!isoDate) return "";
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `Hace ${Math.max(1, diffMins)}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  } catch (e) {
    return "";
  }
}

// Estado en memoria para filtrado
let currentNewsArticles = [];
let currentCategoryFilter = "Todas";

// Función para renderizar el estado "No hay noticias"
function renderEmptyState() {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = `
    <div class="text-center py-5 animate__animated animate__fadeIn">
      <i class="fas fa-newspaper fa-3x text-muted mb-3"></i>
      <p class="main__text mb-3">No hay noticias disponibles de Infobae en este momento.</p>
      <button class="btn btn-outline-warning" id="refresh-news-btn">
        <i class="fas fa-sync-alt me-2"></i>Actualizar
      </button>
    </div>
  `;
  attachRefreshListener();
}

// Función para renderizar el estado de Error
function renderErrorState() {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = `
    <div class="text-center py-5 animate__animated animate__fadeIn">
      <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
      <p class="main__text text-danger mb-3">Error al cargar las noticias. Por favor, reintenta.</p>
      <button class="btn btn-outline-warning" id="refresh-news-btn">
        <i class="fas fa-sync-alt me-2"></i>Reintentar
      </button>
    </div>
  `;
  attachRefreshListener();
}

function attachRefreshListener() {
  const btn = document.getElementById("refresh-news-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cargando...';
      fetchNoticias();
    });
  }
}

// Función para renderizar las noticias en 7 filas de 2 columnas (14 noticias en total)
function renderNoticias(articles, activeCategory = currentCategoryFilter) {
  if (!noticiasContainer) return;
  currentNewsArticles = articles;
  currentCategoryFilter = activeCategory;
  noticiasContainer.innerHTML = "";

  // Priorizar noticias con imagen real
  const articlesWithImages = articles.filter(
    (n) => n.image && typeof n.image === "string" && n.image.startsWith("http")
  );
  const pool = articlesWithImages.length >= 6 ? articlesWithImages : articles;

  // Extraer lista de categorías únicas disponibles
  const availableCategories = ["Todas"];
  pool.forEach((a) => {
    if (a.category && !availableCategories.includes(a.category)) {
      availableCategories.push(a.category);
    }
  });

  // Pestañas / Filtros por categoría
  if (availableCategories.length > 2) {
    const filterNav = document.createElement("div");
    filterNav.classList.add("news-filter-nav", "d-flex", "justify-content-center", "flex-wrap", "gap-2", "mb-4");

    availableCategories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.classList.add("btn", "news-filter-btn");
      if (cat === activeCategory) {
        btn.classList.add("active");
      }

      const count = cat === "Todas" ? pool.length : pool.filter((a) => a.category === cat).length;
      btn.innerHTML = `${cat} <span class="badge rounded-pill bg-dark ms-1 opacity-75">${count}</span>`;
      btn.setAttribute("aria-label", `Filtrar noticias por ${cat}`);

      btn.addEventListener("click", () => {
        renderNoticias(articles, cat);
      });

      filterNav.appendChild(btn);
    });

    noticiasContainer.appendChild(filterNav);
  }

  // Filtrar según categoría seleccionada
  const filteredList = activeCategory === "Todas"
    ? pool
    : pool.filter((a) => a.category === activeCategory);

  // Exactamente hasta 14 noticias (7 filas x 2 columnas)
  const listToRender = filteredList.slice(0, 14);

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "g-sm-3", "g-md-4");

  listToRender.forEach((noticia) => {
    // 2 columnas siempre (col-6 en mobile, col-md-6 en tablet/desktop)
    const col = document.createElement("div");
    col.classList.add("col-6", "col-md-6", "d-flex", "align-items-stretch");

    const card = document.createElement("div");
    card.classList.add(
      "card",
      "h-100",
      "w-100",
      "main__noticia-card",
      "animate__animated",
      "animate__fadeInUp"
    );

    const imgWrap = document.createElement("div");
    imgWrap.classList.add("main__noticia-img-wrap");

    // Badge flotante de categoría con color distintivo
    const categoryName = noticia.category || "Infobae";
    const accentColor = CATEGORY_COLORS[categoryName] || "#d4af37";

    const badge = document.createElement("span");
    badge.classList.add("main__noticia-category-badge");
    badge.innerHTML = `<span class="main__noticia-dot" style="background-color: ${accentColor}"></span>${categoryName}`;
    imgWrap.appendChild(badge);

    const img = document.createElement("img");
    img.src = (noticia.image && noticia.image.startsWith("http")) ? noticia.image : "./images/placeholder.jpg";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    img.setAttribute("referrerpolicy", "no-referrer");
    img.referrerPolicy = "no-referrer";
    img.classList.add("card-img-top", "main__noticia-imagen");
    img.alt = noticia.title || "Noticia de Infobae";

    // Fallback si la URL remota de la imagen falla al cargar
    img.onerror = function () {
      this.onerror = null;
      this.src = "./images/placeholder.jpg";
    };

    imgWrap.appendChild(img);

    const cardBody = document.createElement("div");
    cardBody.classList.add("card-body", "d-flex", "flex-column");

    // Metadatos: Fuente Infobae y tiempo de publicación
    const metaWrap = document.createElement("div");
    metaWrap.classList.add("main__noticia-meta", "d-flex", "justify-content-between", "align-items-center", "mb-1", "mb-md-2");

    const sourceTag = document.createElement("span");
    sourceTag.classList.add("main__noticia-source-tag");
    sourceTag.innerHTML = `<i class="fas fa-bolt me-1 text-warning"></i>Infobae`;

    const timeTag = document.createElement("span");
    timeTag.classList.add("main__noticia-time");
    const timeAgoStr = formatTimeAgo(noticia.publishedAt);
    if (timeAgoStr) {
      timeTag.innerHTML = `<i class="far fa-clock me-1"></i>${timeAgoStr}`;
    }

    metaWrap.appendChild(sourceTag);
    if (timeAgoStr) metaWrap.appendChild(timeTag);
    cardBody.appendChild(metaWrap);

    const title = document.createElement("h5");
    title.classList.add("card-title", "main__noticia-titulo");
    title.textContent = noticia.title;

    const description = document.createElement("p");
    description.classList.add(
      "card-text",
      "main__noticia-descripcion",
      "flex-grow-1"
    );
    description.textContent =
      noticia.description || "Descripción no disponible.";

    const link = document.createElement("a");
    link.href = noticia.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.classList.add("btn", "btn-outline-warning", "mt-auto", "w-100", "main__noticia-btn");
    link.innerHTML = `Leer más <i class="fas fa-external-link-alt ms-1 small"></i>`;

    cardBody.appendChild(title);
    cardBody.appendChild(description);
    cardBody.appendChild(link);

    card.appendChild(imgWrap);
    card.appendChild(cardBody);
    col.appendChild(card);
    row.appendChild(col);
  });

  noticiasContainer.appendChild(row);
}

// Fallback cliente vía RSS-to-JSON con fuentes de Infobae por categoría
async function fetchRemoteFallbackNoticias() {
  const fallbackFeeds = [
    { category: "Política", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml", count: 3 },
    { category: "Sociedad", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/?outputType=xml", count: 3 },
    { category: "Economía", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml", count: 2 },
    { category: "Deportes", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml", count: 2 },
    { category: "Tecno", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml", count: 2 },
    { category: "Teleshow", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/teleshow/?outputType=xml", count: 2 },
  ];

  const allFallbackArticles = [];

  for (const feed of fallbackFeeds) {
    try {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.items || !Array.isArray(data.items)) continue;

      const items = data.items
        .map((item) => {
          let image = (item.enclosure && item.enclosure.link) || item.thumbnail || null;
          if (!image && item.description && item.description.includes("<img")) {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) image = match[1];
          }
          return {
            title: item.title,
            description: item.description ? item.description.replace(/<[^>]*>?/gm, "").trim() : item.title,
            url: item.link,
            image: image,
            category: feed.category,
            publishedAt: item.pubDate || new Date().toISOString()
          };
        })
        .filter((article) => article.title && article.url && article.url.includes("infobae.com"));

      allFallbackArticles.push(...items.slice(0, feed.count));
      if (allFallbackArticles.length >= 14) break;
    } catch (e) {
      console.warn(`Fallo fallback de Infobae [${feed.category}]:`, e);
    }
  }

  return allFallbackArticles;
}

// Función principal para obtener noticias desde news.json
async function fetchNoticias() {
  if (!noticiasContainer) return;

  try {
    if (noticiasContainer.children.length === 0 || !noticiasContainer.querySelector(".row")) {
      noticiasContainer.innerHTML =
        '<p class="main__text text-center py-5"><i class="fas fa-spinner fa-spin me-2"></i>Cargando noticias de Infobae...</p>';
    }

    let rawArticles = [];

    try {
      // Petición al archivo estático news.json (generado por CI / script)
      const response = await fetch("news.json?t=" + Date.now(), { cache: "no-cache" });
      if (response.ok) {
        rawArticles = await response.json();
      }
    } catch (e) {
      console.warn("Fallo lectura de news.json local, ejecutando fallback remoto...", e);
    }

    const { filterRelevantNews, removeDuplicates } = getFilterFunctions();

    // Solo conservar noticias que pertenezcan a Infobae
    const infobaeOnly = rawArticles.filter(
      (a) => a.url && a.url.includes("infobae.com")
    );

    let uniqueArticles = removeDuplicates(infobaeOnly.length > 0 ? infobaeOnly : rawArticles);
    let filteredArticles = filterRelevantNews(uniqueArticles);

    // Si news.json devolvió 0 artículos, intentamos el fallback remoto de Infobae
    if (filteredArticles.length === 0) {
      try {
        const fallbackArticles = await fetchRemoteFallbackNoticias();
        uniqueArticles = removeDuplicates(fallbackArticles);
        filteredArticles = filterRelevantNews(uniqueArticles);
      } catch (fallbackErr) {
        console.warn("Fallo el fallback remoto RSS:", fallbackErr);
      }
    }

    // Asegurar completar hasta 14 noticias si el filtro fue muy estricto
    if (filteredArticles.length < 14 && uniqueArticles.length >= 14) {
      for (const article of uniqueArticles) {
        if (!filteredArticles.includes(article)) {
          filteredArticles.push(article);
        }
        if (filteredArticles.length >= 14) break;
      }
    }

    if (filteredArticles.length > 0) {
      renderNoticias(filteredArticles);
    } else {
      renderEmptyState();
    }
  } catch (error) {
    console.error("Error al cargar noticias:", error);
    renderErrorState();
  }
}

// Carga inicial
fetchNoticias();

// Actualización periódica cada 10 minutos (600.000 ms)
setInterval(fetchNoticias, 600000);
