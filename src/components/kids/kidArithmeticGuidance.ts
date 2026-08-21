import { parseSimpleArithmeticExercise } from "@/features/explanations/runtimeMiniPractice";

function normalizeGrade(level?: string | null): string {
  return (level || "").toLowerCase().trim();
}

function isEarlyPrimary(level?: string | null): boolean {
  const grade = normalizeGrade(level);
  return grade.includes("cp") || grade.includes("ce1");
}

function isUpperPrimary(level?: string | null): boolean {
  const grade = normalizeGrade(level);
  return grade.includes("cm1") || grade.includes("cm2");
}

function shouldUseColumnMethod(
  a: number,
  b: number,
  gradeLevel?: string | null,
): boolean {
  if (isEarlyPrimary(gradeLevel)) return false;
  if (isUpperPrimary(gradeLevel)) return true;
  return a >= 10 || b >= 10;
}

function formatNumber(value: number, language: "fr" | "en"): string {
  if (Number.isInteger(value)) return String(value);
  const normalized = Number(value.toFixed(2)).toString();
  return language === "fr" ? normalized.replace(".", ",") : normalized;
}

export function buildKidArithmeticSupportText(
  exercise: string,
  gradeLevel?: string,
  language: "fr" | "en" = "fr",
): string | null {
  const parsed = parseSimpleArithmeticExercise(exercise);
  if (!parsed) return null;

  const left = formatNumber(parsed.a, language);
  const right = formatNumber(parsed.b, language);
  const useColumnMethod = shouldUseColumnMethod(parsed.a, parsed.b, gradeLevel);

  if (language === "fr") {
    if (useColumnMethod) {
      switch (parsed.op) {
        case "+":
          return `Pose ${left} et ${right} en colonnes, avec les unités sous les unités et les dizaines sous les dizaines. Commence à droite. Additionne d'abord les unités. Si tu dépasses 9, écris l'unité et reporte la retenue au-dessus de la colonne suivante. Puis additionne les dizaines avec la retenue pour trouver le résultat final.`;
        case "-":
          return `Pose ${left} et ${right} en colonnes, bien alignés. Commence par les unités. Si le chiffre du haut est plus petit que celui du bas, fais un emprunt à la colonne des dizaines. Écris ensuite le résultat des unités, puis calcule la colonne des dizaines pour terminer la soustraction.`;
      }
    }

    if (isEarlyPrimary(gradeLevel)) {
      switch (parsed.op) {
        case "+":
          return `Regarde ${left} + ${right} comme deux paquets à réunir. Tu peux dessiner des jetons, compter le premier nombre, puis ajouter le deuxième petit à petit pour trouver le total.`;
        case "-":
          return `Regarde ${left} - ${right} comme un nombre dont on enlève une partie. Tu peux dessiner ${left}, barrer ${right}, puis compter ce qu'il reste.`;
      }
    }

    switch (parsed.op) {
      case "+":
        return `Décompose ${left} et ${right} en dizaines et unités, puis additionne chaque partie. Si les unités font 10 ou plus, transforme 10 unités en 1 dizaine avant d'écrire le résultat final.`;
      case "-":
        return `Décompose ${left} et ${right} en dizaines et unités. Enlève d'abord les unités, puis les dizaines. Si les unités du haut ne suffisent pas, échange 1 dizaine contre 10 unités avant de continuer.`;
    }
  }

  if (useColumnMethod) {
    switch (parsed.op) {
      case "+":
        return `Set ${left} and ${right} in columns with ones under ones and tens under tens. Start on the right. Add the ones first. If the total is more than 9, write the ones digit and carry the ten to the next column. Then add the tens to finish.`;
      case "-":
        return `Write ${left} and ${right} in columns. Start with the ones. If the top digit is smaller, borrow from the tens column. Then finish the ones and move to the tens column.`;
    }
  }

  switch (parsed.op) {
    case "+":
      return `Break ${left} and ${right} into tens and ones, then add each part. If the ones make 10 or more, regroup 10 ones into 1 ten.`;
    case "-":
      return `Break ${left} and ${right} into tens and ones. Subtract the ones first, then the tens. If needed, trade 1 ten for 10 ones.`;
  }
}
