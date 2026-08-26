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
  row.classList.add("row", "g-4");

  articles.slice(0, 12).forEach((noticia) => {
    const col = document.createElement("div");
    col.classList.add("col-12", "col-md-6", "col-lg-4", "d-flex", "align-items-stretch");

    const card = document.createElement("div");
    card.classList.add(
      "card",
      "h-100",
      "w-100",
      "main__noticia-card",
      "animate__animated",
      "animate__fadeInUp"
    );

    const img = document.createElement("img");
    img.src = noticia.image || "./images/placeholder.jpg";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    img.classList.add("card-img-top", "main__noticia-imagen");
    img.alt = noticia.title || "Noticia de Pandemonium";
    img.style.objectFit = "cover";
    img.style.height = "200px";

    // Fallback de imagen si la URL remota falla al cargar
    img.onerror = function () {
      this.onerror = null;
      this.src = "./images/placeholder.jpg";
    };

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

// Fallback cliente vía RSS-to-JSON
async function fetchRemoteFallbackNoticias() {
  const rssUrl = "https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419";
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error("Fallback RSS response not OK");
  const data = await res.json();
  if (!data.items || !Array.isArray(data.items)) return [];

  return data.items.map((item) => ({
    title: item.title,
    description: item.description ? item.description.replace(/<[^>]*>?/gm, "").trim() : item.title,
    url: item.link,
    image: item.thumbnail || null,
    publishedAt: item.pubDate || new Date().toISOString()
  }));
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

