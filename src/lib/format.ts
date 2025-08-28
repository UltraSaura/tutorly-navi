import { defaultLang } from "@/context/SimpleLanguageContext";

export const fmtNumber = (n: number, lang: string = defaultLang) =>
  new Intl.NumberFormat(lang).format(n);

export const fmtDate = (d: Date, lang: string = defaultLang) =>
  new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(d);