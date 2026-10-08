import type { TargetLanguage } from "../languages";

/**
 * Language names in Portuguese, keyed by code. Capitalized for labels (study
 * card faces); `inline()` gives the lowercase form used in running text.
 */
const languageNames = {
  pt: "Português",
  es: "Espanhol",
  en: "Inglês",
};

const inline = (language: TargetLanguage) =>
  languageNames[language].toLowerCase();

const episodeCount = (n: number) =>
  `${n} ${n === 1 ? "episódio" : "episódios"}`;

/**
 * Portuguese (pt-PT) UI strings — the reference dictionary. Its shape defines
 * `Dictionary`; every other language must provide the same keys (enforced by
 * the type checker). Functions are allowed for interpolation/plurals because
 * dictionaries are imported directly (never passed as server→client props).
 */
export const pt = {
  meta: {
    title: "CENA — Aprende português com televisão",
    description:
      "Aprende português através de frases extraídas das tuas séries favoritas. Explora, estuda com repetição espaçada e exporta para Anki.",
  },
  /** Names of the content languages (a show's language, and English). */
  languageNames,
  nav: {
    library: "Biblioteca",
    toggleTheme: "Alternar direção visual",
    upload: "Carregar legendas",
    login: "Entrar",
    signup: "Criar conta",
    languageSwitch: "Mudar de língua",
  },
  footer: {
    tagline: "Aprende português com televisão",
    privacy: "Privacidade",
    terms: "Termos",
  },
  userMenu: {
    profile: "Perfil",
    upload: "Carregar legendas",
    signOut: "Terminar sessão",
  },
  watch: {
    on: (broadcaster: string) => `Ver no ${broadcaster}`,
    onSeason: (broadcaster: string, season: number) =>
      `Ver no ${broadcaster} · T${season}`,
    original: "Ver original",
  },
  common: {
    loading: "A carregar…",
    retry: "Tentar novamente",
    close: "Fechar",
    edit: "Editar",
    unknownError: "Erro desconhecido",
    backToLibrary: "Voltar à biblioteca",
    /** Noun only, for a label next to/under a number. */
    phraseNoun: (n: number): string => (n === 1 ? "frase" : "frases"),
    phraseCount: (n: number) => `${n} ${n === 1 ? "frase" : "frases"}`,
    extractionNoun: (n: number): string =>
      n === 1 ? "extração" : "extrações",
    episodeCount,
    season: (n: number) => `Temporada ${n}`,
    avatarAlt: (email: string) => `Avatar de ${email}`,
  },
  auth: {
    email: "Email",
    password: "Palavra-passe",
    submitting: "A carregar...",
    toSignup: "Ainda não tens conta? Cria uma",
    toLogin: "Já tens conta? Entra",
    checkEmail: "Verifica o teu email: enviámos-te um link de confirmação.",
    unexpectedError: "Ocorreu um erro inesperado",
  },
  home: {
    loading: "A carregar séries…",
    loadError: (message: string) =>
      `Não foi possível carregar as séries: ${message}`,
    emptyTitle: "Ainda não há séries",
    emptyBody: "Carrega legendas para começar a criar a tua biblioteca.",
    featured: "Em destaque",
    studyNow: "Estudar agora",
    rows: {
      recentTitle: "Adicionado recentemente",
      recentNote: "Atualizado esta semana",
      mostPhrases: "Mais frases para estudar",
    },
  },
  show: {
    premiere: (year: string | number) => `Estreia ${year}`,
    studyFirstEpisode: "Estudar primeiro episódio",
    episodesHeading: "Episódios",
    clickEpisodeHint: "Clica num episódio para ver as frases",
    emptyTitle: "Sem episódios",
    emptyBody: "Esta série ainda não tem episódios com frases extraídas.",
    episodeFallback: (n?: number): string =>
      n != null ? `Episódio ${n}` : "Episódio",
    notFound: {
      title: "Série não encontrada",
      body: "A série que procuras não existe ou foi removida.",
    },
    meta: {
      title: (show: string, language: TargetLanguage) =>
        `${show} — Frases em ${inline(language)}`,
      description: (show: string, language: TargetLanguage, episodes: number) =>
        `Aprende ${inline(language)} com frases de ${show}. ${episodeCount(
          episodes
        )} ${
          episodes === 1 ? "disponível" : "disponíveis"
        } com frases extraídas para estudar.`,
      ogDescription: (
        show: string,
        language: TargetLanguage,
        episodes: number
      ) =>
        `Aprende ${inline(language)} com frases de ${show}. ${episodeCount(
          episodes
        )} ${episodes === 1 ? "disponível" : "disponíveis"}.`,
    },
  },
  episode: {
    seasonEpisode: (season: number, episode: number) =>
      `Temporada ${season}, Episódio ${episode}`,
    startStudy: "Iniciar estudo",
    editEpisode: "Editar episódio",
    phrasesHeading: "Frases",
    gridView: "Grelha",
    listView: "Lista",
    noFavorites: "Ainda não há frases favoritas. Marca algumas com o coração!",
    noMatches: "Nenhuma frase corresponde aos filtros.",
    emptyTitle: "Sem frases",
    emptyBody: "Este episódio ainda não tem frases extraídas.",
    notFound: {
      title: "Episódio não encontrado",
      body: "O episódio que procuras não existe ou foi removido.",
    },
    meta: {
      title: (show: string, code: string, language: TargetLanguage) =>
        `${show} ${code} — Frases em ${inline(language)}`,
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
        `Aprende frases em ${inline(language)} de ${show}, temporada ${season}, episódio ${episode}${
          title ? ` — ${title}` : ""
        }. Cartões interativos e repetição espaçada.`,
      ogTitle: (show: string, code: string, language: TargetLanguage) =>
        `${show} ${code} — Aprende ${inline(language)}`,
      ogDescription: (show: string, code: string, language: TargetLanguage) =>
        `Frases em ${inline(language)} de ${show} ${code}`,
    },
  },
  phrase: {
    sortLabel: "Ordenar",
    sort: {
      none: "Ordem original",
      alphabetical: "A-Z",
      reverseAlphabetical: "Z-A",
      progressHigh: "Mais progresso",
      progressLow: "Menos progresso",
    },
    filterAll: "Todas",
    filterFavorites: "Favoritas",
    addFavorite: "Adicionar aos favoritos",
    removeFavorite: "Remover dos favoritos",
  },
  anki: {
    exportButton: "Exportar Anki",
    title: "Exportar frases",
    selectedOf: (selected: number, total: number) =>
      `${selected} de ${total} selecionadas`,
    selectAll: "Selecionar todas",
    clear: "Limpar",
    toAnki: "Para Anki (.txt)",
    asCsv: "Como CSV",
    empty: "Seleciona frases para exportar",
    /** Download filename prefix, followed by the phrases' language. */
    filePrefix: "frases",
  },
  study: {
    loading: "A carregar cartões…",
    noCardsTitle: "Sem cartões disponíveis",
    noCards: "Não há cartões para estudar neste momento.",
    loadFailed: "Não foi possível carregar os cartões. Tenta novamente.",
    retry: "Tentar de novo",
    completeTitle: "Sessão concluída!",
    goodJob: (episode: string) => `Bom trabalho com ${episode}`,
    statCards: "cartões",
    statAccuracy: "precisão",
    statDuration: "duração",
    saveProgressStrong: "Inicia sessão para guardar o teu progresso",
    saveProgressRest: "e obter um agendamento de repetição personalizado.",
    studyAgain: "Estudar de novo",
    sessionTitle: "Sessão de estudo",
    switchDirection: "Trocar direção (R)",
    guestFooter:
      "Inicia sessão para guardar o progresso e teres repetição espaçada personalizada.",
    cardOf: (n: number, total: number) => `Cartão ${n} de ${total}`,
    revealHint: "Clica para revelar a tradução",
    howDidItGo: "Como correu esta frase?",
    ratings: {
      again: { label: "Outra vez", hint: "Esqueci por completo" },
      hard: { label: "Difícil", hint: "Custou a lembrar" },
      good: { label: "Bom", hint: "Lembrei com esforço" },
      easy: { label: "Fácil", hint: "Lembrei logo" },
    },
    keyHintBefore: "Carrega",
    spaceKey: "Espaço",
    keyHintAfter: "ou clica no cartão para ver a resposta",
    progress: "Progresso",
    correct: "Certas",
    wrong: "Erradas",
    accuracy: "Precisão",
    /** FSRS learning states, as shown on study cards and phrase cards. */
    states: {
      new: "Nova",
      learning: "A aprender",
      review: "Revisão",
      relearning: "Reaprender",
      mastered: "Dominada",
    },
  },
  profile: {
    title: "Perfil",
    signInTitle: "Inicia sessão para ver o teu perfil",
    signInBody: "Acompanha o teu progresso e vê estatísticas detalhadas.",
    signInHint: "Usa o menu de navegação para iniciar sessão.",
    meta: {
      title: "Perfil — CENA",
      description: "Perfil e estatísticas de aprendizagem",
    },
    stats: {
      heading: "Estatísticas de aprendizagem",
      loadError: "Não foi possível carregar as estatísticas",
      emptyTitle: "Ainda não começaste a estudar nenhuma frase.",
      emptyHint: (button: string) =>
        `Abre um episódio e carrega em "${button}" para começar!`,
      cards: {
        total: { title: "Total de cartões", description: "Frases estudadas" },
        new: { title: "Novas", description: "Ainda por aprender" },
        learning: { title: "A aprender", description: "Em aprendizagem" },
        review: { title: "Revisão", description: "Prontas para rever" },
        relearning: { title: "Reaprender", description: "Precisam de prática" },
        accuracy: { title: "Precisão", description: "Taxa de acerto" },
      },
      studyProgress: "Progresso de estudo",
      totalReviews: { title: "Total de revisões", description: "Vezes estudadas" },
      lapses: { title: "Lapsos", description: "Cartões esquecidos" },
      readyTitle: "Pronto para estudar!",
      readyBefore: "Tens",
      readyAfter: (n: number): string =>
        n === 1 ? "cartão para rever." : "cartões para rever.",
      readyHint: "Abre qualquer episódio para continuar a tua aprendizagem.",
    },
  },
};

export type Dictionary = typeof pt;
