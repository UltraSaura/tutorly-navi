export const designTokens = {
  colors: {
    brand: {
      primary: "#2F6BFF",
      navy: "#1E3A8A", 
      tint: "#EEF4FF",
      xp: "#606dfc"
    },
    game: {
      xp: "#7C3AED",
      coin: "#FFB020",
      streak: "#FF7A45"
    },
    state: {
      success: "#22C55E",
      danger: "#EF4444"
    },
    neutral: {
      bg: "#F5F7FB",
      surface: "#FFFFFF", 
      text: "#0F172A",
      muted: "#475569",
      border: "#E2E8F0"
    }
  },
  radii: {
    card: 28,
    button: 24,
    chip: 999
  },
  spacing: {
    base: 24
  },
  type: {
    display: 44,
    h1: 36,
    h2: 30,
    body: 16,
    caption: 13
  }
} as const;

export type DesignTokens = typeof designTokens;