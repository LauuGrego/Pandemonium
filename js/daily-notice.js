// Claves de API
const apiKeyGNews = '5b2a14b929e141abc003c8744ac61723';
const apiKeyNewsAPI = '6e2795d88a584b7e9a9f1e6533b85cc4';
const apiKeyCurrents = 'Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG'; // API de Currents

// Contenedor de noticias
const noticiasContainer = document.getElementById('noticias-container');

// Función para renderizar las noticias
function renderNoticias(articles) {
  noticiasContainer.innerHTML = ''; // Limpiar el contenedor
  articles.slice(0, 10).forEach(noticia => { // Mostrar hasta 10 noticias
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

// Simplify fetchNoticias
async function fetchNoticias() {
  try {
    const response = await fetch('https://pandemonium-yl6h.onrender.com/news');
    if (!response.ok) throw new Error('Error fetching news from backend');
    const noticias = await response.json();

    if (noticias.length > 0) {
      renderNoticias(noticias); // Render processed news directly
    } else {
      noticiasContainer.innerHTML = '<p class="main__text">No se encontraron noticias relevantes.</p>';
    }
  } catch (error) {
    console.error('Error fetching noticias:', error);
    noticiasContainer.innerHTML = '<p class="main__text">Error al cargar noticias.</p>';
  }
}

// Cargar noticias al iniciar
fetchNoticias();
