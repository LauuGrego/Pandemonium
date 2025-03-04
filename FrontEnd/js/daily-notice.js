const apiKey = '5b2a14b929e141abc003c8744ac61723'; // Reemplaza con tu clave de API de GNews
const noticiasContainer = document.getElementById('noticias-container');

// Función para obtener y mostrar noticias argentinas
async function fetchNoticias() {
    const url = `https://gnews.io/api/v4/top-headlines?country=ar&lang=es&max=10&token=${apiKey}`;

    try {
        console.log("Haciendo solicitud a GNews...");
        const response = await fetch(url);

        if (!response.ok) {
            console.error("Error en la respuesta de GNews:", await response.json());
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Noticias obtenidas:", data);

        if (data.articles.length > 0) {
            noticiasContainer.innerHTML = ''; // Limpiar el contenedor antes de agregar nuevas noticias

            data.articles.forEach(noticia => {
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
        } else {
            console.warn("No se encontraron noticias.");
            noticiasContainer.innerHTML = '<p class="main__text">No se encontraron noticias.</p>';
        }
    } catch (error) {
        console.error('Error al obtener las noticias:', error);
        noticiasContainer.innerHTML = '<p class="main__text">No se pudieron cargar las noticias. Inténtalo de nuevo más tarde.</p>';
    }
}

// Cargar noticias al cargar la página
fetchNoticias();
