// Claves de API
const apiKeyGNews = '5b2a14b929e141abc003c8744ac61723';
const apiKeyNewsAPI = '6e2795d88a584b7e9a9f1e6533b85cc4';
const apiKeyCurrents = 'Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG'; // API de Currents

// Contenedor de noticias
const noticiasContainer = document.getElementById('noticias-container');

// Lista de palabras clave para filtrar noticias relevantes
const palabrasClave = ["Argentina", "Mundial", "Crisis", "Economía", "Guerra", "Tecnología", "Fútbol", "Copa", "EE.UU", "Europa"];
const paisesNoDeseados = ["Perú", "Ecuador", "Bolivia", "Venezuela", "Guatemala", "Honduras","Lima"];

// Función para filtrar noticias relevantes
function filtrarNoticias(articles) {
  return articles.filter(article => {
    const texto = `${article.title} ${article.description}`.toLowerCase();
    return palabrasClave.some(palabra => texto.includes(palabra.toLowerCase())) &&
           !paisesNoDeseados.some(pais => texto.includes(pais.toLowerCase()));
  });
}

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

// 1. NewsAPI
async function fetchNoticiasNewsAPI() {
  const url = `https://newsapi.org/v2/top-headlines?language=es&pageSize=10&apiKey=${apiKeyNewsAPI}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return filtrarNoticias(data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage
    })));
  } catch (error) {
    console.error("Error en NewsAPI:", error);
    return [];
  }
}

// 2. GNews API
async function fetchNoticiasGNews() {
  const url = `https://gnews.io/api/v4/top-headlines?lang=es&max=10&token=${apiKeyGNews}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return filtrarNoticias(data.articles);
  } catch (error) {
    console.error("Error en GNews:", error);
    return [];
  }
}

// 3. Currents API
async function fetchNoticiasCurrents() {
  const url = `https://api.currentsapi.services/v1/latest-news?apiKey=${apiKeyCurrents}&language=es&limit=10`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return filtrarNoticias(data.news.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image
    })));
  } catch (error) {
    console.error("Error en Currents API:", error);
    return [];
  }
}

// Función principal que obtiene noticias de las APIs
async function fetchNoticias() {
  const noticias = await Promise.all([
    fetchNoticiasNewsAPI(),
    fetchNoticiasGNews(),
    fetchNoticiasCurrents()
  ]);

  const noticiasFiltradas = noticias.flat(); // Unir resultados
  if (noticiasFiltradas.length > 0) {
    renderNoticias(noticiasFiltradas);
  } else {
    noticiasContainer.innerHTML = '<p class="main__text">No se encontraron noticias relevantes.</p>';
  }
}

// Cargar noticias al iniciar
fetchNoticias();
