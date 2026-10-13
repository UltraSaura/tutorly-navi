type Draft = Record<string, unknown>;

const isObject = (value: unknown): value is Draft =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Compile the provider's compact V2.1 level draft into the canonical lesson
 * boundary. Prerequisites and misconceptions are optional in the canonical
 * contract, but if requested from the provider they frequently arrive as
 * incomplete boilerplate objects. Keeping them out of the first-pass draft
 * avoids accepting or fabricating pedagogical metadata. Dedicated, validated
 * slot generation can add them later.
 */
export function compileV21LessonDraft(value: unknown): {
  lesson: unknown;
  discardedOptionalMetadata: string[];
} {
  if (!isObject(value)) return { lesson: value, discardedOptionalMetadata: [] };

  const discardedOptionalMetadata = ['prerequisites', 'misconceptions'].filter((field) =>
    Array.isArray(value[field]) && value[field].length > 0,
  );

  return {
    lesson: {
      ...value,
      prerequisites: [],
      misconceptions: [],
    },
    discardedOptionalMetadata,
  };
}
