/** Spanish (es-ES) UI strings. Same shape as the Portuguese reference. */
import type { TargetLanguage } from "../languages";
import type { Dictionary } from "./pt";

/**
 * Language names in Spanish, keyed by code. Capitalized for labels (study card
 * faces); `inline()` gives the lowercase form used in running text.
 */
const languageNames = {
  pt: "Portugués",
  es: "Español",
  en: "Inglés",
};

const inline = (language: TargetLanguage) =>
  languageNames[language].toLowerCase();

const episodeCount = (n: number) =>
  `${n} ${n === 1 ? "episodio" : "episodios"}`;

export const es: Dictionary = {
  meta: {
    title: "CENA — Aprende español con la televisión",
    description:
      "Aprende español con frases extraídas de tus series favoritas. Explora, estudia con repetición espaciada y exporta a Anki.",
  },
  languageNames,
  nav: {
    library: "Biblioteca",
    toggleTheme: "Cambiar estilo visual",
    upload: "Subir subtítulos",
    login: "Entrar",
    signup: "Crear cuenta",
    languageSwitch: "Cambiar de idioma",
  },
  footer: {
    tagline: "Aprende español con la televisión",
    privacy: "Privacidad",
    terms: "Términos",
  },
  userMenu: {
    profile: "Perfil",
    upload: "Subir subtítulos",
    signOut: "Cerrar sesión",
  },
  watch: {
    on: (broadcaster: string) => `Ver en ${broadcaster}`,
    onSeason: (broadcaster: string, season: number) =>
      `Ver en ${broadcaster} · T${season}`,
    original: "Ver original",
  },
  common: {
    loading: "Cargando…",
    retry: "Reintentar",
    close: "Cerrar",
    edit: "Editar",
    unknownError: "Error desconocido",
    backToLibrary: "Volver a la biblioteca",
    phraseNoun: (n: number) => (n === 1 ? "frase" : "frases"),
    phraseCount: (n: number) => `${n} ${n === 1 ? "frase" : "frases"}`,
    extractionNoun: (n: number) => (n === 1 ? "extracción" : "extracciones"),
    episodeCount,
    season: (n: number) => `Temporada ${n}`,
    avatarAlt: (email: string) => `Avatar de ${email}`,
  },
  auth: {
    email: "Correo electrónico",
    password: "Contraseña",
    submitting: "Cargando…",
    toSignup: "¿Aún no tienes cuenta? Crea una",
    toLogin: "¿Ya tienes cuenta? Entra",
    checkEmail: "Revisa tu correo: te hemos enviado un enlace de confirmación.",
    unexpectedError: "Se ha producido un error inesperado",
  },
  home: {
    loading: "Cargando series…",
    loadError: (message: string) =>
      `No se han podido cargar las series: ${message}`,
    emptyTitle: "Todavía no hay series",
    emptyBody: "Sube subtítulos para empezar a crear tu biblioteca.",
    featured: "Destacado",
    studyNow: "Estudiar ahora",
    rows: {
      recentTitle: "Añadido recientemente",
      recentNote: "Actualizado esta semana",
      mostPhrases: "Más frases para estudiar",
    },
  },
  show: {
    premiere: (year: string | number) => `Estreno ${year}`,
    studyFirstEpisode: "Estudiar el primer episodio",
    episodesHeading: "Episodios",
    clickEpisodeHint: "Haz clic en un episodio para ver las frases",
    emptyTitle: "Sin episodios",
    emptyBody: "Esta serie todavía no tiene episodios con frases extraídas.",
    episodeFallback: (n?: number) => (n != null ? `Episodio ${n}` : "Episodio"),
    notFound: {
      title: "Serie no encontrada",
      body: "La serie que buscas no existe o se ha eliminado.",
    },
    meta: {
      title: (show: string, language: TargetLanguage) =>
        `${show} — Frases en ${inline(language)}`,
      description: (show: string, language: TargetLanguage, episodes: number) =>
        `Aprende ${inline(language)} con frases de ${show}. ${episodeCount(
          episodes
        )} ${
          episodes === 1 ? "disponible" : "disponibles"
        } con frases extraídas para estudiar.`,
      ogDescription: (
        show: string,
        language: TargetLanguage,
        episodes: number
      ) =>
        `Aprende ${inline(language)} con frases de ${show}. ${episodeCount(
          episodes
        )} ${episodes === 1 ? "disponible" : "disponibles"}.`,
    },
  },
  episode: {
    seasonEpisode: (season: number, episode: number) =>
      `Temporada ${season}, episodio ${episode}`,
    startStudy: "Empezar a estudiar",
    editEpisode: "Editar episodio",
    phrasesHeading: "Frases",
    gridView: "Cuadrícula",
    listView: "Lista",
    noFavorites:
      "Todavía no hay frases favoritas. ¡Marca algunas con el corazón!",
    noMatches: "Ninguna frase coincide con los filtros.",
    emptyTitle: "Sin frases",
    emptyBody: "Este episodio todavía no tiene frases extraídas.",
    notFound: {
      title: "Episodio no encontrado",
      body: "El episodio que buscas no existe o se ha eliminado.",
    },
    meta: {
      title: (show: string, code: string, language: TargetLanguage) =>
        `${show} ${code} — Frases en ${inline(language)}`,
      description: ({
        show,
        language,
        season,
        episode,
        title,
      }: {
        show: string;
        language: TargetLanguage;
        season?: number;
        episode?: number;
        title?: string;
      }) =>
        `Aprende frases en ${inline(language)} de ${show}, temporada ${season}, episodio ${episode}${
          title ? ` — ${title}` : ""
        }. Tarjetas interactivas y repetición espaciada.`,
      ogTitle: (show: string, code: string, language: TargetLanguage) =>
        `${show} ${code} — Aprende ${inline(language)}`,
      ogDescription: (show: string, code: string, language: TargetLanguage) =>
        `Frases en ${inline(language)} de ${show} ${code}`,
    },
  },
  phrase: {
    sortLabel: "Ordenar",
    sort: {
      none: "Orden original",
      alphabetical: "A-Z",
      reverseAlphabetical: "Z-A",
      progressHigh: "Más progreso",
      progressLow: "Menos progreso",
    },
    filterAll: "Todas",
    filterFavorites: "Favoritas",
    addFavorite: "Añadir a favoritos",
    removeFavorite: "Quitar de favoritos",
  },
  anki: {
    exportButton: "Exportar a Anki",
    title: "Exportar frases",
    selectedOf: (selected: number, total: number) =>
      `${selected} de ${total} seleccionadas`,
    selectAll: "Seleccionar todas",
    clear: "Limpiar",
    toAnki: "Para Anki (.txt)",
    asCsv: "Como CSV",
    empty: "Selecciona frases para exportar",
    filePrefix: "frases",
  },
  study: {
    loading: "Cargando tarjetas…",
    noCardsTitle: "No hay tarjetas disponibles",
    noCards: "No hay tarjetas para estudiar en este momento.",
    loadFailed: "No se han podido cargar las tarjetas. Inténtalo de nuevo.",
    retry: "Volver a intentarlo",
    completeTitle: "¡Sesión completada!",
    goodJob: (episode: string) => `Buen trabajo con ${episode}`,
    statCards: "tarjetas",
    statAccuracy: "precisión",
    statDuration: "duración",
    saveProgressStrong: "Inicia sesión para guardar tu progreso",
    saveProgressRest: "y tener una programación de repaso personalizada.",
    studyAgain: "Estudiar de nuevo",
    sessionTitle: "Sesión de estudio",
    switchDirection: "Cambiar dirección (R)",
    guestFooter:
      "Inicia sesión para guardar el progreso y tener repetición espaciada personalizada.",
    cardOf: (n: number, total: number) => `Tarjeta ${n} de ${total}`,
    revealHint: "Haz clic para ver la traducción",
    howDidItGo: "¿Qué tal te ha ido con esta frase?",
    ratings: {
      again: { label: "Otra vez", hint: "La he olvidado por completo" },
      hard: { label: "Difícil", hint: "Me ha costado recordarla" },
      good: { label: "Bien", hint: "La he recordado con esfuerzo" },
      easy: { label: "Fácil", hint: "La he recordado enseguida" },
    },
    keyHintBefore: "Pulsa",
    spaceKey: "Espacio",
    keyHintAfter: "o haz clic en la tarjeta para ver la respuesta",
    progress: "Progreso",
    correct: "Correctas",
    wrong: "Incorrectas",
    accuracy: "Precisión",
    states: {
      new: "Nueva",
      learning: "Aprendiendo",
      review: "Repaso",
      relearning: "Reaprendiendo",
      mastered: "Dominada",
    },
  },
  essentials: {
    button: "Esenciales",
    buttonHint: "Las expresiones que necesitas para seguir este episodio",
    readiness: (known: number, total: number) => `${known}/${total} sabidas`,
    ready: "Listo para verlo",
    sessionTitle: "Esenciales del episodio",
    heardIn: "Se oye en",
    revealHint: "Haz clic para ver el significado",
    howDidItGo: "¿Te la sabías?",
    again: { label: "Otra vez", hint: "Vuelve en un momento" },
    gotIt: { label: "Me la sé", hint: "Cuenta como sabida" },
    remaining: (n: number) => (n === 1 ? "Queda 1" : `Quedan ${n}`),
    alreadyKnown: (n: number) => (n === 1 ? "1 ya sabida" : `${n} ya sabidas`),
    completeTitle: "¡Listo para verlo!",
    completeBody: (episode: string) => `Te sabes todos los esenciales de ${episode}.`,
    allKnownTitle: "Ya te lo sabes todo",
    allKnownBody: "Ya te sabes todos los esenciales de este episodio. ¿Quieres practicarlos otra vez?",
    practiceAll: "Practicar todos",
    statEssentials: "esenciales",
    statFirstTry: "a la primera",
  },
  profile: {
    title: "Perfil",
    signInTitle: "Inicia sesión para ver tu perfil",
    signInBody: "Sigue tu progreso y consulta estadísticas detalladas.",
    signInHint: "Usa el menú de navegación para iniciar sesión.",
    meta: {
      title: "Perfil — CENA",
      description: "Perfil y estadísticas de aprendizaje",
    },
    stats: {
      heading: "Estadísticas de aprendizaje",
      loadError: "No se han podido cargar las estadísticas",
      emptyTitle: "Todavía no has empezado a estudiar ninguna frase.",
      emptyHint: (button: string) =>
        `¡Abre un episodio y pulsa «${button}» para empezar!`,
      cards: {
        total: { title: "Total de tarjetas", description: "Frases estudiadas" },
        new: { title: "Nuevas", description: "Por aprender" },
        learning: { title: "Aprendiendo", description: "En aprendizaje" },
        review: { title: "Repaso", description: "Listas para repasar" },
        relearning: {
          title: "Reaprendiendo",
          description: "Necesitan práctica",
        },
        accuracy: { title: "Precisión", description: "Tasa de aciertos" },
      },
      studyProgress: "Progreso de estudio",
      totalReviews: { title: "Total de repasos", description: "Veces estudiadas" },
      lapses: { title: "Lapsos", description: "Tarjetas olvidadas" },
      readyTitle: "¡Listo para estudiar!",
      readyBefore: "Tienes",
      readyAfter: (n: number) =>
        n === 1 ? "tarjeta para repasar." : "tarjetas para repasar.",
      readyHint: "Abre cualquier episodio para seguir aprendiendo.",
    },
  },
};
