import { describe, expect, it } from "vitest";
import { extractHomeworkFromMessage } from "./index";

describe("homework extraction", () => {
  it("keeps a fraction bounds exercise separate from the submitted answer", () => {
    expect(extractHomeworkFromMessage("encadrer 7/3 entre 2 entiers. ma reponse 2 et 3")).toEqual({
      question: "encadrer 7/3 entre 2 entiers.",
      answer: "2 et 3",
    });
  });

  it("extracts a French response label with punctuation", () => {
    expect(extractHomeworkFromMessage("Encadrer 7/3 entre 2 fractions. Réponse : 7/2 et 7/3.")).toEqual({
      question: "Encadrer 7/3 entre 2 fractions.",
      answer: "7/2 et 7/3.",
    });
  });

  it("does not invent a simplification answer for an ambiguous fraction", () => {
    expect(extractHomeworkFromMessage("Que vaut 7/3 ?")).toEqual({
      question: "Que vaut 7/3 ?",
      answer: "",
    });
  });
});
