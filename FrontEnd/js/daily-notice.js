const apiKey = '6e2795d88a584b7e9a9f1e6533b85cc4'; // Reemplaza con tu clave de API
const noticiasContainer = document.getElementById('noticias-container');

// Función para obtener y mostrar noticias en español
async function fetchNoticias() {
    // Modificamos la URL para buscar noticias en español de varios temas
    const url = `https://newsapi.org/v2/everything?q=musica&q=deporte&q=tecnologia&q=politica&language=es&pageSize=10&sortBy=publishedAt&apiKey=${apiKey}&_=${Date.now()}`;

    try {
        console.log("Haciendo solicitud a la API...");
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error en la respuesta de la API:", errorData);
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Respuesta de la API:", data);

        if (data.status === "ok" && data.articles.length > 0) {
            noticiasContainer.innerHTML = ''; // Limpiar el contenedor

            // Mostrar las noticias más recientes
            data.articles.forEach(noticia => {
                const noticiaItem = document.createElement('a');
                noticiaItem.classList.add('main__noticia-item', 'animate__animated', 'animate__fadeInRight');
                noticiaItem.href = noticia.url;
                noticiaItem.target = "_blank";
                noticiaItem.innerHTML = `
                    <div class="main__noticia-imagen" style="background-image: url('${noticia.urlToImage || './images/placeholder.jpg'}');"></div>
                    <div class="main__noticia-contenido">
                        <h3 class="main__noticia-titulo">${noticia.title}</h3>
                        <p class="main__noticia-descripcion">${noticia.description || 'Descripción no disponible.'}</p>
                    </div>
                `;
                noticiasContainer.appendChild(noticiaItem);
            });
        } else {
            console.error("No se encontraron noticias.");
            noticiasContainer.innerHTML = '<p class="main__text">No se encontraron noticias.</p>';
        }
    } catch (error) {
        console.error('Error al obtener las noticias:', error);
        noticiasContainer.innerHTML = '<p class="main__text">No se pudieron cargar las noticias. Inténtalo de nuevo más tarde.</p>';
    }
}

// Cargar noticias al cargar la página
fetchNoticias();
