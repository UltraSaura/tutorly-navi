export interface DecimalMultiplicationStep {
  title: string;
  calculation: string;
  explanation: string;
}

// Use integer arithmetic so small decimals and trailing zeros stay exact.
export function buildDecimalMultiplicationSteps(left: string, right: string, language: string) {
  const fr = language === 'fr';
  const normalize = (value: string) => value.replace(',', '.').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const display = (value: string) => fr ? value.replace('.', ',') : value;
  const a = normalize(left);
  const b = normalize(right);
  const placesA = a.split('.')[1]?.length || 0;
  const placesB = b.split('.')[1]?.length || 0;
  const places = placesA + placesB;
  const intA = BigInt(a.replace('.', ''));
  const intB = BigInt(b.replace('.', ''));
  const product = intA * intB;
  const padded = product.toString().padStart(places + 1, '0');
  const untrimmed = places ? `${padded.slice(0, -places)}.${padded.slice(-places)}` : padded;
  const result = display(normalize(untrimmed));
  const factor = 10n ** BigInt(places);
  if (/^10+$/.test(b)) {
    const count = b.length - 1;
    return { result, steps: [
      {
        title: fr ? 'Regardons les nombres' : 'Look at the numbers',
        calculation: `${display(a)} × ${b}`,
        explanation: fr ? `Nous allons rendre ${display(a)} ${b} fois plus grand.` : `We will make ${display(a)} ${b} times as large.`,
      },
      {
        title: fr ? 'Changeons la valeur des chiffres' : 'Change the value of the digits',
        calculation: `${display(a)} × ${b} = ${result}`,
        explanation: fr
          ? `Chaque multiplication par 10 rend chaque chiffre 10 fois plus grand. Ici, on déplace la virgule de ${count} rang${count > 1 ? 's' : ''} vers la droite. On ajoute des zéros si nécessaire : on obtient ${result}.`
          : `Each multiplication by 10 makes every digit worth 10 times as much. Here, move the decimal point ${count} place${count > 1 ? 's' : ''} to the right. Add zeros if needed. The answer is ${result}.`,
      },
    ] };
  }

  const steps: DecimalMultiplicationStep[] = [{
    title: fr ? 'Regardons les nombres' : 'Look at the numbers',
    calculation: `${display(a)} × ${display(b)}`,
    explanation: fr
      ? `Nous allons multiplier ${display(a)} par ${display(b)}. On va d’abord calculer avec des nombres entiers, puis remettre la virgule.`
      : `We want to multiply ${display(a)} by ${display(b)}. First we will use whole numbers, then put the decimal point back.`,
  }, {
    title: fr ? 'Préparons le calcul' : 'Make the calculation easier',
    calculation: `${intA} × ${intB}`,
    explanation: fr
      ? `Sans les virgules, on calcule ${intA} × ${intB}. Il y a ${placesA} chiffre(s) après la virgule dans ${display(a)} et ${placesB} dans ${display(b)}. Le produit sera donc ${factor} fois trop grand : on le divisera par ${factor} à la fin.`
      : `Without the decimal points, we calculate ${intA} × ${intB}. There are ${placesA} decimal places in ${display(a)} and ${placesB} in ${display(b)}. This makes the product ${factor} times too big, so we will divide by ${factor} at the end.`,
  }];
  const digits = intB.toString().split('').reverse();
  const partials: string[] = [];
  digits.forEach((digit, index) => {
    const value = BigInt(digit) * 10n ** BigInt(index);
    if (value === 0n && intB !== 0n) return;
    const partial = intA * value;
    partials.push(partial.toString());
    steps.push({
      title: fr ? 'Multiplions' : 'Multiply',
      calculation: `${intA} × ${value} = ${partial}`,
      explanation: fr
        ? index === 0
          ? `Multiplie ${intA} par ${value}. Cela fait ${partial}. Garde ce résultat pour la suite.`
          : `Le chiffre ${digit} vaut ${value} à cette position. On calcule donc ${intA} × ${value} = ${partial}. Garde ce résultat pour la suite.`
        : index === 0
          ? `Multiply ${intA} by ${value}. That gives us ${partial}. Keep this result for the next step.`
          : `The digit ${digit} stands for ${value} in this position. So we calculate ${intA} × ${value} = ${partial}. Keep this result for the next step.`,
    });
  });
  if (partials.length > 1) steps.push({
    title: fr ? 'Additionnons les résultats' : 'Add the results',
    calculation: `${partials.join(' + ')} = ${product}`,
    explanation: fr
      ? `On a multiplié par chaque partie du nombre. Additionne maintenant ces résultats : on obtient ${product}.`
      : `We multiplied by each part of the number. Now add those results together to get ${product}.`,
  });
  steps.push({
    title: fr ? 'Remettons la virgule' : 'Put the decimal point back',
    calculation: `${product} ÷ ${factor} = ${result}`,
    explanation: fr
      ? `Notre résultat est ${factor} fois trop grand. On le divise par ${factor} : ${product} devient ${display(untrimmed)}.${display(untrimmed) !== result ? ` Les zéros à la fin après la virgule ne changent pas la valeur : on peut écrire ${result}.` : ''}`
      : `Our result is ${factor} times too big. Divide it by ${factor}: ${product} becomes ${display(untrimmed)}.${display(untrimmed) !== result ? ` Zeros at the end after the decimal point do not change the value, so we can write ${result}.` : ''}`,
  }, {
    title: fr ? 'Voici le résultat' : 'Here is the answer',
    calculation: `${display(a)} × ${display(b)} = ${result}`,
    explanation: fr
      ? `La multiplication est terminée. ${display(a)} multiplié par ${display(b)} donne ${result}.`
      : `We have finished the multiplication. ${display(a)} multiplied by ${display(b)} is ${result}.`,
  });
  return { result, steps };
}
