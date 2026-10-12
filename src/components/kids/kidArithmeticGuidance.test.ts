import { describe, expect, it } from "vitest";
import { buildKidArithmeticSupportText } from "./kidArithmeticGuidance";

describe("buildKidArithmeticSupportText", () => {
  it("uses column guidance for CM1 addition", () => {
    const text = buildKidArithmeticSupportText("55 + 9", "CM1", "fr");
    expect(text).toContain("colonnes");
    expect(text).toContain("retenue");
    expect(text).not.toContain("barres");
  });

  it("keeps beginner manipulatives language for early primary", () => {
    const text = buildKidArithmeticSupportText("8 + 3", "CP", "fr");
    expect(text).toContain("jetons");
  });
});
