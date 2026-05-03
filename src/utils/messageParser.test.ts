import { describe, expect, it } from "vitest";
import { parseUserMessage } from "./messageParser";

describe("parseUserMessage", () => {
  it("parses French PPCM statement with explicit answer", () => {
    const parsed = parseUserMessage("calcul le ppcm de 30 et 12 est 30");
    expect(parsed.question).toBe("calcul le ppcm de 30 et 12");
    expect(parsed.answer).toBe("30");
    expect(parsed.hasAnswer).toBe(true);
  });

  it("parses alternative PPCM answer", () => {
    const parsed = parseUserMessage("ppcm de 30 et 12 est 60");
    expect(parsed.question).toBe("ppcm de 30 et 12");
    expect(parsed.answer).toBe("60");
    expect(parsed.hasAnswer).toBe(true);
  });

  it("handles simple arithmetic statement", () => {
    const parsed = parseUserMessage("2+2 est 4");
    expect(parsed.question).toBe("2+2");
    expect(parsed.answer).toBe("4");
    expect(parsed.hasAnswer).toBe(true);
  });

  it("handles PGCD statement", () => {
    const parsed = parseUserMessage("calcul le pgcd de 12 et 8 est 4");
    expect(parsed.question).toBe("calcul le pgcd de 12 et 8");
    expect(parsed.answer).toBe("4");
    expect(parsed.hasAnswer).toBe(true);
  });

  it("handles question without explicit answer", () => {
    const parsed = parseUserMessage("What is 2+2?");
    expect(parsed.question).toBe("What is 2+2?");
    expect(parsed.answer).toBe("");
    expect(parsed.hasAnswer).toBe(false);
  });

  it("handles French PPCM question without answer", () => {
    const parsed = parseUserMessage("calcul le ppcm de 30 et 12");
    expect(parsed.question).toBe("calcul le ppcm de 30 et 12");
    expect(parsed.answer).toBe("");
    expect(parsed.hasAnswer).toBe(false);
  });

  it("does not parse true/false assertions as simple answers", () => {
    const parsed = parseUserMessage("Affirmation A : La moyenne des prix est 11,40 €.");
    expect(parsed.question).toBe("Affirmation A : La moyenne des prix est 11,40 €.");
    expect(parsed.answer).toBe("");
    expect(parsed.hasAnswer).toBe(false);
  });

  it("does not parse grouped true/false text because it contains fractions or est", () => {
    const parsed = parseUserMessage(`
Pour chaque affirmation, dire si elle est vraie ou fausse.
Affirmation A : La moyenne des prix est 11,40 €.
Affirmation D : La probabilité est 7/15.
`);

    expect(parsed.answer).toBe("");
    expect(parsed.hasAnswer).toBe(false);
  });
});
