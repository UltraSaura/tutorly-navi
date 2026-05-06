export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "mixed";

export interface LearningStyleCopy {
  label: string;
  description: string;
}

export const LEARNING_STYLE_COPY: Record<LearningStyle, LearningStyleCopy> = {
  visual: {
    label: "Pictures & diagrams",
    description: "I like drawings, colors, shapes, and examples I can see.",
  },
  auditory: {
    label: "Words & sound",
    description: "I like simple words, memory phrases, stories, and saying ideas out loud.",
  },
  kinesthetic: {
    label: "Hands-on practice",
    description: "I like drawing, moving, sorting, tapping, and trying it myself.",
  },
  mixed: {
    label: "Mix it up",
    description: "I like a little bit of everything.",
  },
};

const LEARNING_STYLE_ALIASES: Record<string, LearningStyle> = {
  visual: "visual",
  pictures: "visual",
  picture: "visual",
  pictures_diagrams: "visual",
  diagram: "visual",
  diagrams: "visual",

  auditory: "auditory",
  audio: "auditory",
  verbal: "auditory",
  words: "auditory",
  words_sound: "auditory",
  sound: "auditory",

  kinesthetic: "kinesthetic",
  hands_on: "kinesthetic",
  doing: "kinesthetic",
  action: "kinesthetic",
  interactive: "kinesthetic",

  reading: "mixed",
  read_write: "mixed",
  balanced: "mixed",
  mixed: "mixed",
  default: "mixed",
};

function normalizeLearningStyleKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeLearningStyle(value?: string | null): LearningStyle {
  if (!value) return "mixed";

  const key = normalizeLearningStyleKey(value);
  return LEARNING_STYLE_ALIASES[key] ?? "mixed";
}
