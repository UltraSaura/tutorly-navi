import { useLanguage } from "@/context/SimpleLanguageContext";

export function useResolveText() {
  const { t } = useLanguage();
  
  function resolveText(text: string): string {
    if (!text) return "";
    // If a string looks like a key (a.b.c), try translating it
    if (/^[a-z]+\.[a-z.]+$/i.test(text)) {
      const translated = t(text);
      return translated || text;
    }
    return text;
  }
  
  return resolveText;
}