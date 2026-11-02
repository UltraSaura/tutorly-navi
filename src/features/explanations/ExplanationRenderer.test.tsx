import { describe, expect, it } from "vitest";
import { isPaginatedMathExplanation } from "./ExplanationRenderer";

describe("isPaginatedMathExplanation", () => {
  it("uses the paginated player for fraction bounds", () => {
    expect(isPaginatedMathExplanation("Encadrer 7/3 entre 2 fractions")).toBe(true);
  });

  it("uses the paginated player for arithmetic", () => {
    expect(isPaginatedMathExplanation("Pose la division 748 ÷ 4")).toBe(true);
  });

  it("keeps non-mathematical explanations on the card renderer", () => {
    expect(isPaginatedMathExplanation("Explique le cycle de l'eau")).toBe(false);
  });
});
