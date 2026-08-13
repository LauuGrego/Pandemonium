(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.NewsFilter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Normaliza una cadena de texto: minusculas, quita tildes/acentos usando NFD.
   */
  function normalizeText(text) {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // Listas de palabras clave (en minuscula y sin acentos para comparacion uniforme)
  const excludedKeywords = [
    "peru", "peruano", "peruana", "lima", "nazca",
    "chile", "chileno", "chilena", "santiago de chile",
    "colombia", "colombiano", "colombiana", "bogota",
    "mexico", "mexicano", "mexicana",
    "ecuador", "ecuatoriano", "ecuatoriana", "quito",
    "bolivia", "boliviano", "boliviana", "la paz",
    "paraguay", "paraguayo", "paraguaya", "asuncion",
    "uruguay", "uruguayo", "uruguaya", "montevideo",
    "venezuela", "venezolano", "venezolana", "caracas"
  ];

  const europeanCountries = [
    "espana", "espanol", "espanola", "madrid", "barcelona", "andalucia", "cataluna", "catalunya",
    "francia", "frances", "francesa", "paris",
    "alemania", "aleman", "alemana", "berlin",
    "italia", "italiano", "italiana", "roma",
    "reino unido", "inglaterra", "britanico", "britanica", "londres",
    "portugal", "portugues", "portuguesa", "lisboa"
  ];

  const unwantedSections = [
    "/agencias/"
  ];

  const globalImpactKeywords = [
    "mundial", "global", "internacional", "guerra", "paz", "crisis",
    "pandemia", "virus", "oms", "onu", "otan", "eeuu", "estados unidos",
    "rusia", "putin", "china", "historico", "alarma", "colapso",
    "mercado", "economia global", "cambio climatico", "catastrofe",
    "atentado", "terrorismo"
  ];

  // Dominios y portales de noticias locales de otros paises
  const excludedDomains = [
    ".pe", ".cl", ".co", ".mx", ".ec", ".bo", ".py", ".uy", ".ve",
    "lacuarta.com", "latercera.com", "emol.com", "biobiochile.cl", "t13.cl", "lun.com",
    "elcomercio.pe", "rpp.pe", "larepublica.pe",
    "eltiempo.com", "elespectador.com", "caracol.com.co",
    "eluniversal.com.mx", "milenio.com", "excelsior.com.mx"
  ];

  /**
   * Filtra noticias irrelevantes o especificas de otros paises
   */
  function filterRelevantNews(articles) {
    if (!Array.isArray(articles)) return [];

    return articles.filter((article) => {
      const title = article.title ? article.title.trim() : "";
      const description = article.description ? article.description.trim() : "";

      if (!title || title.length < 5 || !article.url) return false;

      const rawText = `${title} ${description}`;
      const normalizedText = normalizeText(rawText);
      const url = article.url.toLowerCase();

      const hasExcludedDomain = excludedDomains.some((domain) => {
        return url.includes(domain + "/") || url.endsWith(domain) || url.includes("://" + domain) || url.includes("." + domain);
      });

      const isSpanishSectionURL = url.includes("/espana/") || url.includes("/espanya/") || url.includes("/espana");
      const isUnwantedSectionURL = unwantedSections.some((section) => url.includes(section));

      const mentionsExcludedCountry = excludedKeywords.some((keyword) => {
        const normalizedKw = normalizeText(keyword);
        const regex = new RegExp(`\\b${normalizedKw}\\b`, "i");
        return regex.test(normalizedText);
      });

      const mentionsEuropeanCountry = europeanCountries.some((keyword) => {
        const normalizedKw = normalizeText(keyword);
        const regex = new RegExp(`\\b${normalizedKw}\\b`, "i");
        return regex.test(normalizedText);
      });

      const hasGlobalImpact = globalImpactKeywords.some((keyword) => {
        const normalizedKw = normalizeText(keyword);
        const regex = new RegExp(`\\b${normalizedKw}\\b`, "i");
        return regex.test(normalizedText);
      });

      if (hasExcludedDomain || isSpanishSectionURL || isUnwantedSectionURL || mentionsExcludedCountry) {
        return false;
      }

      if (mentionsEuropeanCountry && !hasGlobalImpact) {
        return false;
      }

      return true;
    });
  }

  /**
   * Elimina noticias duplicadas basadas en el titulo normalizado
   */
  function removeDuplicates(articles) {
    if (!Array.isArray(articles)) return [];
    const seenTitles = new Set();
    return articles.filter((article) => {
      if (!article.title) return false;
      const normalizedTitle = normalizeText(article.title);
      if (seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    });
  }

  return {
    normalizeText,
    filterRelevantNews,
    removeDuplicates
  };
}));
