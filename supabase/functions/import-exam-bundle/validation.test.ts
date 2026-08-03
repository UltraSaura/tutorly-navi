import { describe, expect, it } from "vitest";
import { validateExamBundle } from "./validation";

describe("validateExamBundle", () => {
  it("accepts a valid minimal bundle", () => {
    const result = validateExamBundle({
      mode: "upsert",
      sources: [
        {
          id: "source-1",
          source_name: "eduscol",
          source_url: "https://example.com/source",
          fetched_at: "2026-08-03T10:00:00.000Z",
        },
      ],
      papers: [
        {
          id: "paper-1",
          source_name: "eduscol",
          source_url: "https://example.com/source",
          fetched_at: "2026-08-03T10:00:00.000Z",
          exam: "dnb",
          session_year: 2026,
          discipline: "maths",
          series: "generale",
          location: "fr",
          variant: "standard",
          pdf_url: "https://example.com/paper.pdf",
          pdf_hash: "hash-1",
          parsing_status: "parsed",
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid import modes", () => {
    const result = validateExamBundle({ mode: "delete-all" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid import mode",
    });
  });

  it("rejects malformed exercise payloads", () => {
    const result = validateExamBundle({
      exercises: [
        {
          id: "exercise-1",
          paper_id: "paper-1",
          source_name: "eduscol",
          source_url: "not-a-url",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid exercises payload");
    }
  });
});
