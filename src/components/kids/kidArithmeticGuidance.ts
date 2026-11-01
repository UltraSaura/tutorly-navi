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

  if (language === "fr") {
    if (shouldUseColumnMethod(parsed.a, parsed.b, gradeLevel)) {
      switch (parsed.op) {
        case "+":
          return `Pose ${left} et ${right} en colonnes, avec les unités sous les unités et les dizaines sous les dizaines. Commence à droite. Additionne d'abord les unités. Si tu dépasses 9, écris l'unité et reporte la retenue au-dessus de la colonne suivante. Puis additionne les dizaines avec la retenue pour trouver le résultat final.`;
        case "-":
          return `Pose ${left} et ${right} en colonnes, bien alignés. Commence par les unités. Si le chiffre du haut est plus petit que celui du bas, fais un emprunt à la colonne des dizaines. Écris ensuite le résultat des unités, puis calcule la colonne des dizaines pour terminer la soustraction.`;
        case "*":
          return `Pose ${left} et ${right} en colonnes. Commence par multiplier le chiffre des unités du bas par chaque chiffre du nombre du haut, de droite à gauche. S'il y a une retenue, note-la au-dessus de la colonne suivante. Si le multiplicateur a plusieurs chiffres, écris chaque ligne de produit au bon rang, puis additionne les lignes obtenues.`;
        case "/":
          return `Écris la division posée de ${left} par ${right}. Commence à gauche du dividende. Cherche combien de fois ${right} entre dans la première partie du nombre. Écris ce chiffre au quotient, multiplie, soustrais, puis descends le chiffre suivant. Recommence jusqu'à la fin.`;
      }
    }

    if (isEarlyPrimary(gradeLevel)) {
      switch (parsed.op) {
        case "+":
          return `Regarde ${left} + ${right} comme deux paquets à réunir. Tu peux dessiner des jetons, compter le premier nombre, puis ajouter le deuxième petit à petit pour trouver le total.`;
        case "-":
          return `Regarde ${left} - ${right} comme un nombre dont on enlève une partie. Tu peux dessiner ${left}, barrer ${right}, puis compter ce qu'il reste.`;
        case "*":
          return `Regarde ${left} × ${right} comme plusieurs groupes identiques. Fais ${right} groupes de ${left}, ou l'inverse, puis compte tout.`;
        case "/":
          return `Regarde ${left} ÷ ${right} comme un partage. Répartis ${left} en paquets de ${right} pour voir combien de paquets tu peux faire.`;
      }
    }

    switch (parsed.op) {
      case "+":
        return `Décompose ${left} et ${right} en dizaines et unités, puis additionne chaque partie. Si les unités font 10 ou plus, transforme 10 unités en 1 dizaine avant d'écrire le résultat final.`;
      case "-":
        return `Décompose ${left} et ${right} en dizaines et unités. Enlève d'abord les unités, puis les dizaines. Si les unités du haut ne suffisent pas, échange 1 dizaine contre 10 unités avant de continuer.`;
      case "*":
        return `Cherche la multiplication comme des groupes égaux. Appuie-toi sur la table correspondante, puis vérifie ton résultat avec un petit schéma ou une addition répétée si besoin.`;
      case "/":
        return `Vois la division comme un partage ou comme une recherche du nombre de groupes possibles. Vérifie avec la multiplication inverse : quotient × diviseur.`;
    }
  }

  if (shouldUseColumnMethod(parsed.a, parsed.b, gradeLevel)) {
    switch (parsed.op) {
      case "+":
        return `Set ${left} and ${right} in columns with ones under ones and tens under tens. Start on the right. Add the ones first. If the total is more than 9, write the ones digit and carry the ten to the next column. Then add the tens to finish.`;
      case "-":
        return `Write ${left} and ${right} in columns. Start with the ones. If the top digit is smaller, borrow from the tens column. Then finish the ones and move to the tens column.`;
      case "*":
        return `Write ${left} and ${right} in columns. Multiply from right to left. Keep track of any carry above the next column. If the multiplier has more than one digit, write each partial product on the correct row, then add the rows.`;
      case "/":
        return `Use long division for ${left} divided by ${right}. Start from the left of the dividend. Find how many times ${right} fits, write that in the quotient, multiply, subtract, and bring the next digit down. Repeat until the end.`;
    }
  }

  switch (parsed.op) {
    case "+":
      return `Break ${left} and ${right} into tens and ones, then add each part. If the ones make 10 or more, regroup 10 ones into 1 ten.`;
    case "-":
      return `Break ${left} and ${right} into tens and ones. Subtract the ones first, then the tens. If needed, trade 1 ten for 10 ones.`;
    case "*":
      return `Think of multiplication as equal groups. Use the matching times fact, then check with repeated addition if needed.`;
    case "/":
      return `Think of division as sharing or making equal groups. Check with the inverse multiplication when you can.`;
  }
}
