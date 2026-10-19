/**
 * PANDEMONIUM RADIO — MÓDULO DE NOTICIAS DE INFOBAE
 * Renderizado de noticias mediante grilla responsiva pura de Bootstrap 5.3:
 * row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4
 * Filtrado dinámico, sanitización, manejo de errores y estados de carga.
 */

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
  "General": "#F04B35"
};

// Formateador de tiempo relativo seguro
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

// Estado en memoria
let currentNewsArticles = [];
let currentCategoryFilter = "Todas";

// Estado Vacío (Sin noticias)
function renderEmptyState() {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "text-center py-5";

  const icon = document.createElement("i");
  icon.className = "fas fa-newspaper fa-3x text-muted mb-3";
  icon.setAttribute("aria-hidden", "true");

  const msg = document.createElement("p");
  msg.className = "text-muted mb-3";
  msg.textContent = "No hay noticias disponibles en esta sección en este momento.";

  const btn = document.createElement("button");
  btn.className = "btn news-filter-btn active";
  btn.id = "refresh-news-btn";
  btn.innerHTML = '<i class="fas fa-sync-alt me-2" aria-hidden="true"></i>Actualizar';
  btn.addEventListener("click", () => fetchNoticias());

  wrap.appendChild(icon);
  wrap.appendChild(msg);
  wrap.appendChild(btn);
  noticiasContainer.appendChild(wrap);
}

// Estado de Error
function renderErrorState() {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "text-center py-5";

  const icon = document.createElement("i");
  icon.className = "fas fa-exclamation-triangle fa-3x text-danger mb-3";
  icon.setAttribute("aria-hidden", "true");

  const msg = document.createElement("p");
  msg.className = "text-danger mb-3";
  msg.textContent = "No se pudieron sincronizar las noticias en este momento.";

  const btn = document.createElement("button");
  btn.className = "btn news-filter-btn active";
  btn.id = "retry-news-btn";
  btn.innerHTML = '<i class="fas fa-sync-alt me-2" aria-hidden="true"></i>Reintentar';
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2" aria-hidden="true"></i>Reintentando...';
    fetchNoticias();
  });

  wrap.appendChild(icon);
  wrap.appendChild(msg);
  wrap.appendChild(btn);
  noticiasContainer.appendChild(wrap);
}

// Renderizado de Noticias con Grid de Bootstrap 5.3
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

  // Extraer categorías únicas disponibles
  const availableCategories = ["Todas"];
  pool.forEach((a) => {
    if (a.category && !availableCategories.includes(a.category)) {
      availableCategories.push(a.category);
    }
  });

  // Filtros de Categoría con Píldoras Accesibles
  if (availableCategories.length > 2) {
    const filterNav = document.createElement("nav");
    filterNav.className = "news-filter-nav mb-4";
    filterNav.setAttribute("aria-label", "Filtro de categorías de noticias");

    availableCategories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "news-filter-btn";
      if (cat === activeCategory) {
        btn.classList.add("active");
        btn.setAttribute("aria-current", "page");
      }

      const count = cat === "Todas" ? pool.length : pool.filter((a) => a.category === cat).length;
      btn.textContent = `${cat} `;

      const badge = document.createElement("span");
      badge.className = "news-category-count-badge ms-1";
      badge.textContent = count;
      btn.appendChild(badge);

      btn.setAttribute("aria-label", `Mostrar ${count} noticias de ${cat}`);

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

  if (filteredList.length === 0) {
    renderEmptyState();
    return;
  }

  // Límite de noticias por página
  const listToRender = filteredList.slice(0, 15);

  // Grilla de Bootstrap requerida: 1 columna en móvil, 2 en tablet, 3 en escritorio
  const row = document.createElement("div");
  row.className = "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4";

  listToRender.forEach((noticia) => {
    const col = document.createElement("div");
    col.className = "col d-flex align-items-stretch";

    const card = document.createElement("article");
    card.className = "main__noticia-card w-100 d-flex flex-column";

    // Contenedor de Imagen y Badge de Categoría
    const imgWrap = document.createElement("div");
    imgWrap.className = "main__noticia-img-wrap";

    const categoryName = noticia.category || "Infobae";
    const accentColor = CATEGORY_COLORS[categoryName] || "#F04B35";

    const badge = document.createElement("span");
    badge.className = "main__noticia-category-badge";
    const dot = document.createElement("span");
    dot.className = "main__noticia-dot";
    dot.style.backgroundColor = accentColor;
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(categoryName));
    imgWrap.appendChild(badge);

    const img = document.createElement("img");
    img.src = (noticia.image && noticia.image.startsWith("http")) ? noticia.image : "./images/placeholder.jpg";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    img.setAttribute("referrerpolicy", "no-referrer");
    img.referrerPolicy = "no-referrer";
    img.className = "img-fluid main__noticia-imagen";
    img.alt = noticia.title ? noticia.title : "Noticia de actualidad";

    // Fallback si la imagen falla al cargar
    img.onerror = function () {
      this.onerror = null;
      this.src = "./images/placeholder.jpg";
    };

    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    // Cuerpo de la Tarjeta
    const cardBody = document.createElement("div");
    cardBody.className = "p-3 d-flex flex-column flex-grow-1";

    // Metadatos: Fuente + Tiempo relativo
    const metaWrap = document.createElement("div");
    metaWrap.className = "main__noticia-meta d-flex justify-content-between align-items-center mb-2";

    const sourceTag = document.createElement("span");
    sourceTag.className = "main__noticia-source-tag";
    sourceTag.innerHTML = '<i class="fas fa-bolt me-1 text-danger" aria-hidden="true"></i>Infobae';
    metaWrap.appendChild(sourceTag);

    const timeAgoStr = formatTimeAgo(noticia.publishedAt);
    if (timeAgoStr) {
      const timeTag = document.createElement("span");
      timeTag.className = "main__noticia-time";
      timeTag.textContent = timeAgoStr;
      metaWrap.appendChild(timeTag);
    }
    cardBody.appendChild(metaWrap);

    // Título seguro mediante textContent
    const title = document.createElement("h3");
    title.className = "main__noticia-titulo";
    title.textContent = noticia.title || "Sin título";
    cardBody.appendChild(title);

    // Resumen / Descripción segura mediante textContent
    const description = document.createElement("p");
    description.className = "main__noticia-descripcion flex-grow-1";
    description.textContent = noticia.description || "Hacé clic en el enlace para leer el artículo completo.";
    cardBody.appendChild(description);

    // Enlace con target seguro
    const link = document.createElement("a");
    link.href = noticia.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "main__noticia-btn text-center mt-auto w-100";
    link.innerHTML = 'Leer nota completa <i class="fas fa-arrow-up-right-from-square ms-1 small" aria-hidden="true"></i>';
    link.setAttribute("aria-label", `Leer nota completa: ${noticia.title || ''}`);
    cardBody.appendChild(link);

    card.appendChild(cardBody);
    col.appendChild(card);
    row.appendChild(col);
  });

  noticiasContainer.appendChild(row);
}

// Fallback remoto en caso de que news.json local no esté disponible
async function fetchRemoteFallbackNoticias() {
  const fallbackFeeds = [
    { category: "Política", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml", count: 3 },
    { category: "Sociedad", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/sociedad/?outputType=xml", count: 3 },
    { category: "Economía", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml", count: 3 },
    { category: "Deportes", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/?outputType=xml", count: 3 },
    { category: "Tecno", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml", count: 3 }
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
      if (allFallbackArticles.length >= 15) break;
    } catch (e) {
      console.warn(`Aviso en fallback de Infobae [${feed.category}]:`, e);
    }
  }

  return allFallbackArticles;
}

// Carga principal de noticias
async function fetchNoticias() {
  if (!noticiasContainer) return;

  try {
    if (noticiasContainer.children.length === 0 || !noticiasContainer.querySelector(".row")) {
      noticiasContainer.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-danger mb-3" role="status" aria-hidden="true"></div>
          <p class="text-muted">Cargando noticias de Infobae en vivo...</p>
        </div>
      `;
    }

    const GITHUB_RAW_URL = "https://raw.githubusercontent.com/LauuGrego/Pandemonium/main/news.json?t=" + Date.now();
    const LOCAL_URL = "news.json?t=" + Date.now();

    try {
      // Priorizar la fuente directa de GitHub donde la Action actualiza 2 veces al día
      let response = await fetch(GITHUB_RAW_URL, { cache: "no-cache" });
      if (!response.ok) {
        // Fallback a archivo local si GitHub Raw no responde
        response = await fetch(LOCAL_URL, { cache: "no-cache" });
      }
      if (response.ok) {
        rawArticles = await response.json();
      }
    } catch (e) {
      try {
        const localResp = await fetch(LOCAL_URL, { cache: "no-cache" });
        if (localResp.ok) {
          rawArticles = await localResp.json();
        }
      } catch (errLocal) {
        console.warn("Fallo lectura de news.json remoto y local, recurriendo a fallback RSS:", errLocal);
      }
    }

    const { filterRelevantNews, removeDuplicates } = getFilterFunctions();

    const infobaeOnly = rawArticles.filter(
      (a) => a.url && a.url.includes("infobae.com")
    );

    let uniqueArticles = removeDuplicates(infobaeOnly.length > 0 ? infobaeOnly : rawArticles);
    let filteredArticles = filterRelevantNews(uniqueArticles);

    if (filteredArticles.length === 0) {
      try {
        const fallbackArticles = await fetchRemoteFallbackNoticias();
        uniqueArticles = removeDuplicates(fallbackArticles);
        filteredArticles = filterRelevantNews(uniqueArticles);
      } catch (fallbackErr) {
        console.warn("Fallback remoto no disponible:", fallbackErr);
      }
    }

    if (filteredArticles.length < 15 && uniqueArticles.length >= 15) {
      for (const article of uniqueArticles) {
        if (!filteredArticles.includes(article)) {
          filteredArticles.push(article);
        }
        if (filteredArticles.length >= 15) break;
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

// Actualización cada 10 minutos
setInterval(fetchNoticias, 600000);
