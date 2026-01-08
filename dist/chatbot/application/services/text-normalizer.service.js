"use strict";
// Servicio de normalización de texto para español argentino
// Prepara el texto para mejor detección de intenciones
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextNormalizerService = void 0;
// Contracciones y abreviaturas comunes en español/WhatsApp
const CONTRACTIONS = {
    // Abreviaturas de WhatsApp
    q: "que",
    xq: "porque",
    pq: "porque",
    x: "por",
    d: "de",
    k: "que",
    tb: "también",
    tmb: "también",
    tbn: "también",
    xfa: "por favor",
    pf: "por favor",
    ntp: "no te preocupes",
    tkm: "te quiero mucho",
    "c/u": "cada uno",
    info: "información",
    tel: "teléfono",
    cel: "celular",
    fds: "fin de semana",
    lpm: "", // filtrar
    // Números escritos
    "1": "uno",
    "2": "dos",
    "3": "tres",
};
// Mapa de acentos a letras sin acento
const ACCENT_MAP = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ü: "u",
    ñ: "n", // Normalizar ñ para matching (opcional, se puede quitar)
    Á: "a",
    É: "e",
    Í: "i",
    Ó: "o",
    Ú: "u",
    Ü: "u",
    Ñ: "n",
};
// Sinónimos argentinos/coloquiales -> español estándar
const SYNONYMS = {
    // Dinero
    plata: "precio",
    guita: "precio",
    mango: "precio",
    mangos: "precio",
    luca: "mil",
    lucas: "mil",
    // Saludos
    "che": "hola",
    "wenas": "buenas",
    "bnas": "buenas",
    "ktal": "que tal",
    // Afirmaciones
    dale: "si",
    "d acuerdo": "si",
    obvio: "si",
    claro: "si",
    "ya fue": "si",
    joya: "si",
    genial: "si",
    piola: "bien",
    copado: "bien",
    // Negaciones
    nah: "no",
    na: "no",
    nel: "no",
    nop: "no",
    // Acciones
    mandar: "enviar",
    tirar: "enviar",
    pasar: "enviar",
    // Productos (específico del negocio)
    piso: "ceramico",
    pisos: "ceramicos",
    baldosa: "ceramico",
    baldosas: "ceramicos",
    azulejo: "ceramico",
    azulejos: "ceramicos",
    porcelanato: "ceramico",
    // Consultas
    onda: "como",
    labura: "trabaja",
    laburo: "trabajo",
    // Ubicación
    "por donde": "donde",
    "en donde": "donde",
};
// Sufijos comunes en español para stemming básico
const SUFFIXES = [
    "ando",
    "endo",
    "iendo", // gerundios
    "amos",
    "emos",
    "imos", // primera persona plural
    "aban",
    "ían", // imperfecto
    "ción",
    "sión", // sustantivos
    "mente", // adverbios
    "ito",
    "ita",
    "itos",
    "itas", // diminutivos
    "azo",
    "aza", // aumentativos
    "es",
    "s", // plurales (al final para no interferir con otros)
];
class TextNormalizerService {
    /**
     * Normaliza el texto completo para análisis de intención
     */
    normalize(text) {
        let normalized = text.toLowerCase().trim();
        // 1. Remover acentos
        normalized = this.removeAccents(normalized);
        // 2. Expandir contracciones
        normalized = this.expandContractions(normalized);
        // 3. Aplicar sinónimos
        normalized = this.applySynonyms(normalized);
        // 4. Remover caracteres especiales (excepto espacios)
        normalized = this.removeSpecialChars(normalized);
        // 5. Normalizar espacios múltiples
        normalized = normalized.replace(/\s+/g, " ").trim();
        return normalized;
    }
    /**
     * Remueve acentos del texto
     */
    removeAccents(text) {
        return text
            .split("")
            .map((char) => ACCENT_MAP[char] || char)
            .join("");
    }
    /**
     * Expande contracciones y abreviaturas
     */
    expandContractions(text) {
        const words = text.split(/\s+/);
        return words
            .map((word) => CONTRACTIONS[word] || word)
            .filter((word) => word.length > 0)
            .join(" ");
    }
    /**
     * Aplica sinónimos para normalizar vocabulario
     */
    applySynonyms(text) {
        let result = text;
        // Ordenar por longitud (más largo primero) para evitar reemplazos parciales
        const sortedSynonyms = Object.entries(SYNONYMS).sort((a, b) => b[0].length - a[0].length);
        for (const [colloquial, standard] of sortedSynonyms) {
            // Usar word boundaries para evitar reemplazos parciales
            const regex = new RegExp(`\\b${this.escapeRegex(colloquial)}\\b`, "gi");
            result = result.replace(regex, standard);
        }
        return result;
    }
    /**
     * Remueve caracteres especiales manteniendo letras y espacios
     */
    removeSpecialChars(text) {
        // Mantener letras, números y espacios
        return text.replace(/[^a-z0-9\s]/g, "");
    }
    /**
     * Stemming básico: reduce palabras a su raíz aproximada
     * Útil para matching de palabras con variaciones
     */
    stem(word) {
        let stemmed = word.toLowerCase();
        for (const suffix of SUFFIXES) {
            if (stemmed.endsWith(suffix) && stemmed.length > suffix.length + 2) {
                return stemmed.slice(0, -suffix.length);
            }
        }
        return stemmed;
    }
    /**
     * Detecta si hay negación antes de una palabra clave
     */
    hasNegationBefore(text, keyword) {
        const negationPatterns = [
            `no ${keyword}`,
            `no quiero ${keyword}`,
            `no necesito ${keyword}`,
            `no me interesa ${keyword}`,
            `sin ${keyword}`,
            `tampoco ${keyword}`,
            `nunca ${keyword}`,
            `jamas ${keyword}`,
            `nada de ${keyword}`,
        ];
        const normalizedText = this.normalize(text);
        return negationPatterns.some((pattern) => normalizedText.includes(pattern));
    }
    /**
     * Detecta si el mensaje es una negación general
     */
    isNegation(text) {
        const normalizedText = this.normalize(text);
        const negationStarters = [
            "no ",
            "no,",
            "nop",
            "nah",
            "nel",
            "no gracias",
            "no quiero",
            "no necesito",
            "no me interesa",
            "no por ahora",
            "ahora no",
            "despues",
            "mas tarde",
            "otro dia",
        ];
        return negationStarters.some((starter) => normalizedText.startsWith(starter) || normalizedText === "no");
    }
    /**
     * Extrae palabras clave del texto normalizado
     */
    extractKeywords(text) {
        const normalized = this.normalize(text);
        const words = normalized.split(/\s+/);
        // Filtrar stopwords muy comunes
        const stopwords = new Set([
            "el",
            "la",
            "los",
            "las",
            "un",
            "una",
            "unos",
            "unas",
            "de",
            "del",
            "al",
            "a",
            "en",
            "con",
            "por",
            "para",
            "y",
            "o",
            "que",
            "se",
            "es",
            "son",
            "fue",
            "ser",
            "estar",
            "me",
            "te",
            "le",
            "lo",
            "mi",
            "tu",
            "su",
        ]);
        return words.filter((word) => word.length > 2 && !stopwords.has(word));
    }
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
exports.TextNormalizerService = TextNormalizerService;
