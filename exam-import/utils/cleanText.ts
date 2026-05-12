export function cleanText(value: string | null | undefined): string {
  let text = decodeHtmlEntities(value ?? "");

  text = text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/^\s*(?:page\s+\d+\s*)?(?:['"`\]\)};]+>\s*)+/i, " ")
    .replace(/^\s*page\s+\d+\b\s*/i, " ")
    .replace(/^[\s"'`<>]+|[\s"'`<>]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  text = text.replace(/^[\s"'`<>]+|[\s"'`<>]+$/g, "").trim();
  return text;
}

export function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    eacute: "é",
    egrave: "è",
    ecirc: "ê",
    agrave: "à",
    acirc: "â",
    ccedil: "ç",
    icirc: "î",
    lt: "<",
    gt: ">",
    ocirc: "ô",
    ugrave: "ù",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity: string, name: string) => namedEntities[name.toLowerCase()] ?? entity)
    .replace(/&#160;|&#xa0;/gi, " ");
}
