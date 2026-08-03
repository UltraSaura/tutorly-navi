import { describe, expect, it } from "vitest";
import { validateCurriculumBundle } from "./validation";

describe("validateCurriculumBundle", () => {
  it("accepts a valid minimal bundle", () => {
    const result = validateCurriculumBundle({
      mode: "upsert",
      subjects: [
        {
          id: "subject-1",
          slug: "maths",
          name: "Maths",
        },
      ],
      domains: [
        {
          id: "domain-1",
          subject_id: "subject-1",
          code: "N1",
          label: "Nombres",
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects malformed tasks payloads", () => {
    const result = validateCurriculumBundle({
      tasks: [
        {
          id: "task-1",
          success_criterion_id: "criterion-1",
          type: "",
          stem: "Question",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid tasks payload");
    }
  });

  it("rejects invalid modes", () => {
    const result = validateCurriculumBundle({ mode: "unsafe" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid import mode",
    });
  });
});
