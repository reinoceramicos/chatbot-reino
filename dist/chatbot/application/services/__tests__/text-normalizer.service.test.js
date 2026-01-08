"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const text_normalizer_service_1 = require("../text-normalizer.service");
describe("TextNormalizerService", () => {
    let normalizer;
    beforeEach(() => {
        normalizer = new text_normalizer_service_1.TextNormalizerService();
    });
    describe("normalize", () => {
        it("should convert to lowercase", () => {
            expect(normalizer.normalize("HOLA MUNDO")).toBe("hola mundo");
        });
        it("should trim whitespace", () => {
            expect(normalizer.normalize("  hola  ")).toBe("hola");
        });
        it("should remove accents", () => {
            expect(normalizer.normalize("áéíóú")).toBe("aeiou");
            expect(normalizer.normalize("cotización")).toBe("cotizacion");
        });
        it("should expand common contractions", () => {
            expect(normalizer.normalize("q tal")).toBe("que tal");
            expect(normalizer.normalize("xq no")).toBe("porque no");
        });
        it("should apply synonyms", () => {
            expect(normalizer.normalize("cuanta plata")).toContain("precio");
            expect(normalizer.normalize("wenas")).toContain("buenas");
        });
        it("should remove special characters", () => {
            expect(normalizer.normalize("hola!!??")).toBe("hola");
            expect(normalizer.normalize("precio???")).toBe("precio");
        });
        it("should normalize multiple spaces", () => {
            expect(normalizer.normalize("hola    mundo")).toBe("hola mundo");
        });
    });
    describe("removeAccents", () => {
        it("should remove all Spanish accents", () => {
            expect(normalizer.removeAccents("áéíóúü")).toBe("aeiouu");
            expect(normalizer.removeAccents("ÁÉÍÓÚÜ")).toBe("aeiouu");
        });
        it("should handle ñ", () => {
            expect(normalizer.removeAccents("mañana")).toBe("manana");
        });
        it("should leave non-accented chars unchanged", () => {
            expect(normalizer.removeAccents("hello world")).toBe("hello world");
        });
    });
    describe("expandContractions", () => {
        it("should expand WhatsApp abbreviations", () => {
            expect(normalizer.expandContractions("q")).toBe("que");
            expect(normalizer.expandContractions("xq")).toBe("porque");
            expect(normalizer.expandContractions("tb")).toBe("también");
        });
        it("should handle multiple contractions", () => {
            expect(normalizer.expandContractions("q tal tb")).toBe("que tal también");
        });
        it("should leave unknown words unchanged", () => {
            expect(normalizer.expandContractions("hola mundo")).toBe("hola mundo");
        });
    });
    describe("applySynonyms", () => {
        it("should replace money-related words", () => {
            const result = normalizer.applySynonyms("cuanta plata");
            expect(result).toContain("precio");
        });
        it("should replace greeting variations", () => {
            const result = normalizer.applySynonyms("wenas");
            expect(result).toContain("buenas");
        });
        it("should replace affirmations", () => {
            const result = normalizer.applySynonyms("dale");
            expect(result).toBe("si");
        });
        it("should handle word boundaries correctly", () => {
            // "che" no debería reemplazar "hecho"
            const result = normalizer.applySynonyms("hecho");
            expect(result).toBe("hecho");
        });
    });
    describe("hasNegationBefore", () => {
        it("should detect simple negation", () => {
            expect(normalizer.hasNegationBefore("no quiero comprar", "comprar")).toBe(true);
        });
        it("should detect negation with no quiero", () => {
            expect(normalizer.hasNegationBefore("no quiero precio", "precio")).toBe(true);
        });
        it("should detect negation with no necesito", () => {
            expect(normalizer.hasNegationBefore("no necesito cotizar", "cotizar")).toBe(true);
        });
        it("should return false when no negation", () => {
            expect(normalizer.hasNegationBefore("quiero comprar", "comprar")).toBe(false);
        });
        it("should return false when keyword not present", () => {
            expect(normalizer.hasNegationBefore("no quiero", "precio")).toBe(false);
        });
    });
    describe("isNegation", () => {
        it("should detect simple no", () => {
            expect(normalizer.isNegation("no")).toBe(true);
            expect(normalizer.isNegation("no gracias")).toBe(true);
        });
        it("should detect colloquial negations", () => {
            expect(normalizer.isNegation("nop")).toBe(true);
            expect(normalizer.isNegation("nah")).toBe(true);
        });
        it("should detect temporal negations", () => {
            expect(normalizer.isNegation("ahora no")).toBe(true);
            expect(normalizer.isNegation("despues")).toBe(true);
            expect(normalizer.isNegation("mas tarde")).toBe(true);
        });
        it("should return false for positive messages", () => {
            expect(normalizer.isNegation("si quiero")).toBe(false);
            expect(normalizer.isNegation("dale")).toBe(false);
        });
    });
    describe("extractKeywords", () => {
        it("should extract meaningful words", () => {
            const keywords = normalizer.extractKeywords("quiero comprar ceramicos");
            expect(keywords).toContain("quiero");
            expect(keywords).toContain("comprar");
            expect(keywords).toContain("ceramicos");
        });
        it("should filter stopwords", () => {
            const keywords = normalizer.extractKeywords("el precio de los ceramicos");
            expect(keywords).not.toContain("el");
            expect(keywords).not.toContain("de");
            expect(keywords).not.toContain("los");
            expect(keywords).toContain("precio");
            expect(keywords).toContain("ceramicos");
        });
        it("should filter short words", () => {
            const keywords = normalizer.extractKeywords("a y o en");
            expect(keywords).toHaveLength(0);
        });
    });
    describe("stem", () => {
        it("should remove gerund endings", () => {
            expect(normalizer.stem("comprando")).toBe("compr");
            // "vendiendo" -> removes "iendo" = "vendi" (word is 9 chars, suffix is 5)
            expect(normalizer.stem("vendiendo")).toBe("vendi");
        });
        it("should remove diminutive endings", () => {
            expect(normalizer.stem("ceramiquito")).toBe("ceramiqu");
        });
        it("should remove plural endings", () => {
            // "ceramicos" -> removes "s" = "ceramico" (longer suffixes checked first but don't match)
            expect(normalizer.stem("ceramicos")).toBe("ceramico");
            expect(normalizer.stem("precios")).toBe("precio");
        });
        it("should not stem short words", () => {
            expect(normalizer.stem("dos")).toBe("dos");
        });
        it("should handle -ando gerund", () => {
            expect(normalizer.stem("trabajando")).toBe("trabaj");
        });
    });
});
