import { describe, expect, it } from "vitest";
import { buildReadonlyContextVisual, inferPromptFigure } from "./promptVisual";

describe("promptVisual", () => {
  it("infers a right-triangle diagram from French trigonometry prompts", () => {
    const spec = inferPromptFigure({
      prompt:
        "Un triangle ABC est rectangle en B. L'angle BAC mesure 30° et le côté AB mesure 8 cm. Calculez la longueur du côté BC.",
    });

    expect(spec).toEqual({
      kind: "triangle",
      labels: ["A", "B", "C"],
      rightAngleAt: "B",
      angleLabel: { vertex: "A", degrees: 30 },
      sideLabels: { AB: "8 cm" },
      targetSide: "BC",
    });

    expect(buildReadonlyContextVisual(spec!)).toMatchObject({
      subtype: "triangle",
      labels: ["A", "B", "C"],
      rightAngleAt: "B",
      targetSide: "BC",
    });
  });

  it.each([
    ["Calcule l'aire de ce carré de côté 5 cm.", "square"],
    ["Quel est le périmètre du rectangle ?", "rectangle"],
    ["Combien de faces possède ce cube ?", "cube"],
    ["Observe le cylindre et donne le nombre de bases.", "cylinder"],
    ["Reconnais ce losange parmi les figures.", "rhombus"],
  ])("infers a generic geometry figure for %s", (prompt, shape) => {
    expect(buildReadonlyContextVisual(inferPromptFigure({ prompt })!)).toMatchObject({
      subtype: "geometry_figure",
      shape,
    });
  });
});
