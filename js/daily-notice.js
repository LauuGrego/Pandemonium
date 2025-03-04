// Reemplaza estas claves con las tuyas
const apiKeyGNews = '5b2a14b929e141abc003c8744ac61723'; // Tu API key de GNews
const apiKeyNewsAPI = '6e2795d88a584b7e9a9f1e6533b85cc4';
const apiKeyCurrents = 'Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG';

// Contenedor donde se mostrarán las noticias
const noticiasContainer = document.getElementById('noticias-container');

// Función para renderizar las noticias
function renderNoticias(articles) {
  noticiasContainer.innerHTML = ''; // Limpiar el contenedor
  articles.forEach(noticia => {
    const noticiaItem = document.createElement('a');
    noticiaItem.classList.add('main__noticia-item', 'animate__animated', 'animate__fadeInRight');
    noticiaItem.href = noticia.url;
    noticiaItem.target = "_blank";
    noticiaItem.innerHTML = `
      <div class="main__noticia-imagen" style="background-image: url('${noticia.image || './images/placeholder.jpg'}');"></div>
      <div class="main__noticia-contenido">
        <h3 class="main__noticia-titulo">${noticia.title}</h3>
        <p class="main__noticia-descripcion">${noticia.description || 'Descripción no disponible.'}</p>
      </div>
    `;
    noticiasContainer.appendChild(noticiaItem);
  });
}

/* Funciones para cada API */

// 1. NewsAPI
async function fetchNoticiasNewsAPI() {
  // Filtramos por país: puedes omitir 'country' para noticias globales, pero al filtrar por idioma se obtienen artículos en español.
  const url = `https://newsapi.org/v2/top-headlines?language=es&pageSize=10&apiKey=${apiKeyNewsAPI}`;
  console.log("Solicitando noticias desde NewsAPI...");
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error en NewsAPI:", errorData);
    throw new Error(`NewsAPI: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  // Adaptamos la respuesta
  const articles = data.articles.map(article => ({
    title: article.title,
    description: article.description,
    url: article.url,
    image: article.urlToImage
  }));
  return articles;
}

// 2. GNews API
async function fetchNoticiasGNews() {
  // GNews permite filtrar por idioma con lang=es y no se define país, por lo que serán noticias globales en español.
  const url = `https://gnews.io/api/v4/top-headlines?lang=es&max=10&token=${apiKeyGNews}`;
  console.log("Solicitando noticias desde GNews...");
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error en GNews:", errorData);
    throw new Error(`GNews: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  // La estructura de GNews ya contiene las propiedades necesarias
  return data.articles;
}

// 3. Currents API
async function fetchNoticiasCurrents() {
  // Endpoint de Currents API para noticias recientes; se filtra por idioma (language=es)
  const url = `https://api.currentsapi.services/v1/latest-news?apiKey=${apiKeyCurrents}&language=es&limit=10`;
  console.log("Solicitando noticias desde Currents API...");
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error en Currents API:", errorData);
    throw new Error(`Currents API: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  // Adaptamos la respuesta al formato común
  const articles = data.news.map(article => ({
    title: article.title,
    description: article.description,
    url: article.url,
    image: article.image
  }));
  return articles;
}

// Función principal que recorre las APIs en orden hasta obtener resultados
async function fetchNoticias() {
  const apis = [
    { name: 'NewsAPI',   fetchFn: fetchNoticiasNewsAPI },
    { name: 'GNews',     fetchFn: fetchNoticiasGNews },
    { name: 'Currents',  fetchFn: fetchNoticiasCurrents }
  ];

  for (let i = 0; i < apis.length; i++) {
    const { name, fetchFn } = apis[i];
    try {
      console.log(`Intentando obtener noticias desde ${name}...`);
      const articles = await fetchFn();
      if (articles && articles.length > 0) {
        console.log(`Noticias obtenidas desde ${name}:`, articles);
        renderNoticias(articles);
        return; // Salimos si obtenemos noticias
      } else {
        console.warn(`No se encontraron noticias en ${name}.`);
      }
    } catch (error) {
      console.error(`Error al obtener noticias desde ${name}:`, error);
    }
  }
  // Si ninguna API devolvió resultados:
  noticiasContainer.innerHTML = '<p class="main__text">No se pudieron cargar las noticias. Inténtalo de nuevo más tarde.</p>';
}

// Cargar noticias al cargar la página
fetchNoticias();
