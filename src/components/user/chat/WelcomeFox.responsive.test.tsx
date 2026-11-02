import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/useInterfaceTranslation", () => ({
  useInterfaceTranslation: () => (key: string) => key,
}));
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: undefined }),
}));
vi.mock("@/context/FamilyProfileContext", () => ({
  useLearner: () => ({ user: undefined }),
}));
vi.mock("@/context/SimpleLanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));
vi.mock("./TutorWelcomeBubble", () => ({
  TutorWelcomeBubble: () => <div data-testid="mock-bubble" />,
}));

import { WelcomeFox } from "./WelcomeFox";

describe("WelcomeFox responsive composition", () => {
  it("keeps the character and its bubble in one bounded composition", () => {
    const html = renderToStaticMarkup(<WelcomeFox userName="Student" />);

    expect(html).toContain('data-testid="welcome-composition"');
    expect(html).toContain('data-testid="welcome-character"');
    expect(html).toContain('aspect-[9/16]');
    expect(html).not.toContain("translate-y-[2cm]");
    expect(html).not.toContain("translate-y-[1.5cm]");
  });
});
