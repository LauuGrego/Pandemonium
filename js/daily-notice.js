// Claves de API
const apiKeyGNews = '5b2a14b929e141abc003c8744ac61723';
const apiKeyNewsAPI = '6e2795d88a584b7e9a9f1e6533b85cc4';
const apiKeyCurrents = 'Cf-8WHSYrw3I2JWGYfXff-HoS6z21uhy8U6NYuBLwA-OiSiG'; // API de Currents

// Contenedor de noticias
const noticiasContainer = document.getElementById('noticias-container');

// Función para renderizar las noticias
function renderNoticias(articles) {
  noticiasContainer.innerHTML = ''; // Limpiar el contenedor
  
  // Crear fila de Bootstrap
  const row = document.createElement('div');
  row.classList.add('row', 'g-4'); // g-4 para espaciado entre columnas

  articles.slice(0, 12).forEach(noticia => { // Mostrar hasta 12 noticias
    const col = document.createElement('div');
    col.classList.add('col-md-6', 'col-lg-4', 'd-flex', 'align-items-stretch'); // Responsive grid

    const card = document.createElement('div');
    card.classList.add('card', 'h-100', 'main__noticia-card', 'animate__animated', 'animate__fadeInUp');
    
    // Imagen
    const img = document.createElement('img');
    img.src = noticia.image || './images/placeholder.jpg';
    img.classList.add('card-img-top', 'main__noticia-imagen');
    img.alt = noticia.title;
    img.style.objectFit = 'cover';
    img.style.height = '200px';

    // Cuerpo de la tarjeta
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'd-flex', 'flex-column');

    const title = document.createElement('h5');
    title.classList.add('card-title', 'main__noticia-titulo');
    title.textContent = noticia.title;

    const description = document.createElement('p');
    description.classList.add('card-text', 'main__noticia-descripcion', 'flex-grow-1');
    description.textContent = noticia.description || 'Descripción no disponible.';

    const link = document.createElement('a');
    link.href = noticia.url;
    link.target = "_blank";
    link.classList.add('btn', 'btn-outline-warning', 'mt-3', 'w-100'); // Botón estilo Bootstrap
    link.textContent = 'Leer más';

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

// Simplify fetchNoticias
async function fetchNoticias() {
  try {
    const response = await fetch(`./news.json?t=${Date.now()}`);
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

// Actualizar cada 10 minutos (600,000 ms)
setInterval(fetchNoticias, 600000);
