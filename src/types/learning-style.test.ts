import { describe, expect, it } from "vitest";
import { LEARNING_STYLE_COPY, normalizeLearningStyle } from "./learning-style";

describe("normalizeLearningStyle", () => {
  it("normalizes visual aliases", () => {
    expect(normalizeLearningStyle("visual")).toBe("visual");
    expect(normalizeLearningStyle("pictures")).toBe("visual");
    expect(normalizeLearningStyle("picture")).toBe("visual");
    expect(normalizeLearningStyle("pictures_diagrams")).toBe("visual");
    expect(normalizeLearningStyle("diagram")).toBe("visual");
    expect(normalizeLearningStyle("diagrams")).toBe("visual");
  });

  it("normalizes auditory aliases", () => {
    expect(normalizeLearningStyle("auditory")).toBe("auditory");
    expect(normalizeLearningStyle("audio")).toBe("auditory");
    expect(normalizeLearningStyle("verbal")).toBe("auditory");
    expect(normalizeLearningStyle("words")).toBe("auditory");
    expect(normalizeLearningStyle("words_sound")).toBe("auditory");
    expect(normalizeLearningStyle("sound")).toBe("auditory");
  });

  it("normalizes kinesthetic aliases", () => {
    expect(normalizeLearningStyle("kinesthetic")).toBe("kinesthetic");
    expect(normalizeLearningStyle("hands_on")).toBe("kinesthetic");
    expect(normalizeLearningStyle("hands-on")).toBe("kinesthetic");
    expect(normalizeLearningStyle("doing")).toBe("kinesthetic");
    expect(normalizeLearningStyle("action")).toBe("kinesthetic");
    expect(normalizeLearningStyle("interactive")).toBe("kinesthetic");
  });

  it("normalizes reading, balanced, empty, and unknown values to mixed", () => {
    expect(normalizeLearningStyle("reading")).toBe("mixed");
    expect(normalizeLearningStyle("read_write")).toBe("mixed");
    expect(normalizeLearningStyle("read-write")).toBe("mixed");
    expect(normalizeLearningStyle("balanced")).toBe("mixed");
    expect(normalizeLearningStyle("mixed")).toBe("mixed");
    expect(normalizeLearningStyle("default")).toBe("mixed");
    expect(normalizeLearningStyle("")).toBe("mixed");
    expect(normalizeLearningStyle(null)).toBe("mixed");
    expect(normalizeLearningStyle(undefined)).toBe("mixed");
    expect(normalizeLearningStyle("unknown")).toBe("mixed");
  });
});

describe("LEARNING_STYLE_COPY", () => {
  it("provides labels and descriptions for all canonical styles", () => {
    expect(LEARNING_STYLE_COPY.visual.label).toBe("Pictures & diagrams");
    expect(LEARNING_STYLE_COPY.auditory.label).toBe("Words & sound");
    expect(LEARNING_STYLE_COPY.kinesthetic.label).toBe("Hands-on practice");
    expect(LEARNING_STYLE_COPY.mixed.label).toBe("Mix it up");
  });
});
