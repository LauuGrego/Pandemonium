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

// Función para renderizar el estado "No hay noticias"
function renderEmptyState() {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = `
    <div class="text-center py-5 animate__animated animate__fadeIn">
      <i class="fas fa-newspaper fa-3x text-muted mb-3"></i>
      <p class="main__text mb-3">No hay noticias disponibles en este momento.</p>
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

// Función para renderizar las noticias
function renderNoticias(articles) {
  if (!noticiasContainer) return;
  noticiasContainer.innerHTML = "";

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "g-sm-3", "g-md-4");

  // Priorizar noticias con imagen real de la noticia
  const articlesWithImages = articles.filter(
    (n) => n.image && typeof n.image === "string" && n.image.startsWith("http")
  );
  const listToRender = articlesWithImages.length >= 6 ? articlesWithImages : articles;

  listToRender.slice(0, 12).forEach((noticia) => {
    const col = document.createElement("div");
    col.classList.add("col-6", "col-md-6", "col-lg-4", "d-flex", "align-items-stretch");

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

    const img = document.createElement("img");
    img.src = (noticia.image && noticia.image.startsWith("http")) ? noticia.image : "./images/placeholder.jpg";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    img.setAttribute("referrerpolicy", "no-referrer");
    img.referrerPolicy = "no-referrer";
    img.classList.add("card-img-top", "main__noticia-imagen");
    img.alt = noticia.title || "Noticia";

    // Fallback si la URL remota de la imagen falla al cargar
    img.onerror = function () {
      this.onerror = null;
      this.src = "./images/placeholder.jpg";
    };

    imgWrap.appendChild(img);

    const cardBody = document.createElement("div");
    cardBody.classList.add("card-body", "d-flex", "flex-column");

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
    link.textContent = "Leer más";

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

// Fallback cliente vía RSS-to-JSON con fuentes de noticias con imágenes
async function fetchRemoteFallbackNoticias() {
  const fallbackUrls = [
    "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml",
    "https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml"
  ];

  for (const rssUrl of fallbackUrls) {
    try {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
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
            publishedAt: item.pubDate || new Date().toISOString()
          };
        })
        .filter((article) => article.title && article.url && article.image);

      if (items.length > 0) {
        return items;
      }
    } catch (e) {
      console.warn("Fallo fallback de feed remoto:", e);
    }
  }

  return [];
}

// Función principal para obtener noticias desde news.json
async function fetchNoticias() {
  if (!noticiasContainer) return;

  try {
    if (noticiasContainer.children.length === 0 || !noticiasContainer.querySelector(".row")) {
      noticiasContainer.innerHTML =
        '<p class="main__text text-center py-5"><i class="fas fa-spinner fa-spin me-2"></i>Cargando noticias...</p>';
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

    let uniqueArticles = removeDuplicates(rawArticles);
    let filteredArticles = filterRelevantNews(uniqueArticles);

    // Si news.json devolvió 0 artículos, intentamos el fallback remoto directo
    if (filteredArticles.length === 0) {
      try {
        const fallbackArticles = await fetchRemoteFallbackNoticias();
        uniqueArticles = removeDuplicates(fallbackArticles);
        filteredArticles = filterRelevantNews(uniqueArticles);
      } catch (fallbackErr) {
        console.warn("Fallo el fallback remoto RSS:", fallbackErr);
      }
    }

    // Si el filtro es muy estricto y quedan pocas noticias, completamos con las generales
    if (filteredArticles.length < 3 && uniqueArticles.length >= 3) {
      for (const article of uniqueArticles) {
        if (!filteredArticles.includes(article)) {
          filteredArticles.push(article);
        }
        if (filteredArticles.length >= 3) break;
      }
    }

    filteredArticles.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

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

