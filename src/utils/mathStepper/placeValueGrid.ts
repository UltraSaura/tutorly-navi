export type GridOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type GridEventKind = 'carry' | 'borrow' | 'regroup' | 'bring-down' | 'quotient-digit' | 'partial-product' | 'partial-subtraction' | 'highlight';

export interface PlaceValueColumn {
  exponent: number;
  label: string;
  isDecimalMarkerBefore: boolean;
}

export interface GridCell {
  rowId: string;
  exponent: number;
  text: string;
  kind: 'digit' | 'operator' | 'annotation' | 'result' | 'line' | 'text';
  emphasis?: 'source' | 'destination' | 'active' | 'muted';
  annotationType?: 'crossed-out' | 'replacement' | 'carry' | 'borrow';
}

export interface GridRow { id: string; label?: string; cells: GridCell[]; }

export interface GridEvent {
  kind: GridEventKind;
  sourceExponent?: number;
  destinationExponent?: number;
  value?: string;
  description: string;
}

export interface PlaceValueFrame {
  id: string;
  label: string;
  explanation: string;
  rows: GridRow[];
  events: GridEvent[];
  layout?: 'column' | 'long-division';
}

export interface PlaceValueSolution {
  expression: string;
  operation: GridOperation;
  columns: PlaceValueColumn[];
  frames: PlaceValueFrame[];
  result: string;
  layout?: 'column' | 'long-division';
}

const labels = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de mille', 'centaines de mille'];
const labelFor = (exponent: number) => exponent >= 0 ? (labels[exponent] ?? `10^${exponent}`) : `dixièmes${exponent < -1 ? ` (${Math.abs(exponent)}e rang)` : ''}`;

function parseNumber(value: string): { integer: bigint; decimals: number; normalized: string } {
  const normalized = value.trim().replace(',', '.');
  const [whole, fraction = ''] = normalized.split('.');
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) throw new Error(`Nombre invalide: ${value}`);
  return { integer: BigInt(`${whole}${fraction}` || '0'), decimals: fraction.length, normalized };
}

function cell(rowId: string, exponent: number, text: string, kind: GridCell['kind'] = 'digit', emphasis?: GridCell['emphasis'], annotationType?: GridCell['annotationType']): GridCell {
  return { rowId, exponent, text, kind, emphasis, annotationType };
}

function annotationRow(id: string, label: string, exponent: number, text: string, annotationType: NonNullable<GridCell['annotationType']>): GridRow {
  return { id, label, cells: [cell(id, exponent, text, 'annotation', undefined, annotationType)] };
}

function digits(value: bigint, width: number, rowId: string, decimals: number, kind: GridCell['kind'] = 'digit'): GridCell[] {
  const raw = value.toString().padStart(width, '0');
  return [...raw].map((text, index) => cell(rowId, width - decimals - index - 1, text, kind));
}

function shiftedDigits(value: bigint, maxExponent: number, rowId: string, kind: GridCell['kind'] = 'digit', emphasis?: GridCell['emphasis']): GridCell[] {
  return [...value.toString()].map((text, index, all) => cell(rowId, maxExponent - all.length + index + 1, text, kind, emphasis));
}

function columns(minExponent: number, maxExponent: number): PlaceValueColumn[] {
  return Array.from({ length: maxExponent - minExponent + 1 }, (_, index) => {
    const exponent = maxExponent - index;
    return { exponent, label: labelFor(exponent), isDecimalMarkerBefore: exponent === -1 };
  });
}

function operationParts(expression: string) {
  const match = expression.trim().replace(/,/g, '.').match(/^(\d+(?:\.\d+)?)\s*([+\-×*÷/])\s*(\d+(?:\.\d+)?)$/);
  if (!match) throw new Error('Utilisez deux nombres et une opération posée.');
  return { left: parseNumber(match[1]), operator: match[2], right: parseNumber(match[3]) };
}

function baseRows(left: bigint, right: bigint, decimals: number, width: number, operator: string, result?: bigint): GridRow[] {
  const rows: GridRow[] = [
    { id: 'top', cells: digits(left, width, 'top', decimals) },
    { id: 'bottom', cells: [cell('bottom', width - decimals, operator, 'operator'), ...digits(right, width, 'bottom', decimals)] },
    { id: 'line', cells: [cell('line', width - decimals, '────────', 'line')] },
  ];
  if (result !== undefined) rows.push({ id: 'result', cells: digits(result, width + 1, 'result', decimals, 'result') });
  return rows;
}

function arithmeticFrames(left: bigint, right: bigint, decimals: number, operator: '+' | '-', expression: string): PlaceValueSolution {
  const width = Math.max(left.toString().length, right.toString().length, 1);
  const result = operator === '+' ? left + right : left - right;
  const minExponent = -decimals;
  const maxExponent = Math.max(width - decimals - 1, 0) + (result.toString().length > width ? 1 : 0);
  const frames: PlaceValueFrame[] = [{ id: 'setup', label: 'Poser l’opération', explanation: 'Aligne chaque chiffre sur sa valeur de position.', rows: baseRows(left, right, decimals, width, operator), events: [] }];
  let carry = 0;
  const workingDigits = [...left.toString().padStart(width, '0')].reverse().map(Number);
  const output: string[] = [];
  for (let offset = 0; offset < width; offset += 1) {
    const exponent = offset - decimals;
    const originalLeftDigit = Number((left / (10n ** BigInt(offset))) % 10n);
    const rightDigit = Number((right / (10n ** BigInt(offset))) % 10n);
    let digit: number;
    let incomingCarry = 0;
    const events: GridEvent[] = [{ kind: 'highlight', sourceExponent: exponent, destinationExponent: exponent, description: `Colonne des ${labelFor(exponent)}` }];
    if (operator === '+') {
      incomingCarry = carry;
      const sum = originalLeftDigit + rightDigit + incomingCarry;
      digit = sum % 10;
      const nextCarry = Math.floor(sum / 10);
      if (nextCarry) events.push({ kind: 'carry', sourceExponent: exponent, destinationExponent: exponent + 1, value: String(nextCarry), description: `Porte ${nextCarry} vers les ${labelFor(exponent + 1)}.` });
      carry = nextCarry;
    } else {
      let top = workingDigits[offset];
      if (top < rightDigit) {
        const beforeDestination = workingDigits[offset];
        let source = offset + 1;
        while (source < width && workingDigits[source] === 0) source += 1;
        if (source >= width) throw new Error('Impossible de réaliser le regroupement.');
        const sourceExponent = source - decimals;
        const sourceDigit = workingDigits[source];
        workingDigits[source] -= 1;
        for (let chain = source - 1; chain > offset; chain -= 1) workingDigits[chain] = 9;
        workingDigits[offset] += 10;
        top = workingDigits[offset];
        events.push({ kind: 'borrow', sourceExponent, destinationExponent: exponent, value: '1', description: `Emprunte 1 aux ${labelFor(sourceExponent)}.` }, { kind: 'regroup', sourceExponent, destinationExponent: exponent, value: '10', description: `Regroupe 1 unité de rang supérieur en 10 ${labelFor(exponent)}.` });
        const regroupRows: GridRow[] = [
          annotationRow(`regroup-${source}-before-${exponent}`, 'avant', sourceExponent, String(sourceDigit), 'crossed-out'),
          annotationRow(`regroup-${source}-after-${exponent}`, 'après', sourceExponent, String(workingDigits[source]), 'replacement'),
        ];
        for (let chainExponent = source - 1; chainExponent > exponent; chainExponent -= 1) {
          regroupRows.push(annotationRow(`regroup-${chainExponent}-before-${exponent}`, 'avant', chainExponent - decimals, '0', 'crossed-out'));
          regroupRows.push(annotationRow(`regroup-${chainExponent}-after-${exponent}`, 'après', chainExponent - decimals, String(workingDigits[chainExponent]), 'replacement'));
        }
        regroupRows.push(annotationRow(`regroup-${exponent}-before`, 'avant', exponent, String(beforeDestination), 'crossed-out'));
        regroupRows.push(annotationRow(`regroup-${exponent}-after`, 'après', exponent, String(top), 'replacement'));
        const rows = baseRows(left, right, decimals, width, operator);
        rows.push(...regroupRows);
        digit = top - rightDigit;
        rows.push({ id: 'result', cells: digits(BigInt(String(digit)), width, 'result', decimals, 'result').map((item) => ({ ...item, emphasis: item.exponent === exponent ? 'active' : undefined })) });
        output.unshift(String(digit));
        frames.push({ id: `column-${exponent}`, label: `Regrouper les ${labelFor(exponent)}`, explanation: `Comme ${beforeDestination} est plus petit que ${rightDigit}, échange une unité du rang supérieur : ${beforeDestination} devient ${top}, puis ${top} − ${rightDigit} = ${digit}.`, rows, events });
        continue;
      }
      digit = top - rightDigit;
    }
    output.unshift(String(digit));
    const resultValue = BigInt(output.join(''));
    const rows = baseRows(left, right, decimals, width, operator);
    if (operator === '+' && incomingCarry) rows.push(annotationRow(`carry-${exponent}`, 'retenue', exponent, String(incomingCarry), 'carry'));
    rows.push({ id: 'result', cells: digits(resultValue, width, 'result', decimals, 'result').map((item) => ({ ...item, emphasis: item.exponent === exponent ? 'active' : undefined })) });
    frames.push({ id: `column-${exponent}`, label: `Calculer les ${labelFor(exponent)}`, explanation: operator === '+' ? `${originalLeftDigit} + ${rightDigit}${incomingCarry ? ` + ${incomingCarry} de retenue` : ''} = ${originalLeftDigit + rightDigit + incomingCarry}. Écris ${digit}${carry ? ` et porte ${carry}` : ''}.` : `${workingDigits[offset]} − ${rightDigit} = ${digit} dans la colonne des ${labelFor(exponent)}.`, rows, events });
  }
  if (operator === '+' && carry) output.unshift(String(carry));
  frames.push({ id: 'final', label: 'Résultat', explanation: `Le résultat est ${formatResult(result, decimals)}.`, rows: baseRows(left, right, decimals, width, operator, result), events: [] });
  return { expression, operation: operator === '+' ? 'addition' : 'subtraction', columns: columns(minExponent, maxExponent), frames, result: formatResult(result, decimals) };
}

function multiplicationFrames(left: bigint, right: bigint, expression: string): PlaceValueSolution {
  const leftText = left.toString(); const rightText = right.toString(); const width = leftText.length + rightText.length;
  const result = left * right; const frames: PlaceValueFrame[] = [{ id: 'setup', label: 'Poser la multiplication', explanation: 'Aligne les nombres à droite par valeur de position.', rows: baseRows(left, right, 0, width, '×'), events: [] }];
  [...rightText].reverse().forEach((digitText, offset) => {
    const exponent = offset;
    const partial = left * BigInt(digitText) * (10n ** BigInt(offset));
    const rows = baseRows(left, right, 0, width, '×'); rows.push({ id: `partial-${offset}`, cells: digits(partial, width, `partial-${offset}`, 0).map((item) => ({ ...item, emphasis: item.exponent === exponent ? 'active' : undefined })) });
    frames.push({ id: `partial-${offset}`, label: `Produit partiel des ${labelFor(exponent)}`, explanation: `${left} × ${digitText}, puis décale de ${offset} rang.`, rows, events: [{ kind: 'partial-product', sourceExponent: exponent, destinationExponent: exponent, value: partial.toString(), description: 'Écris le produit intermédiaire dans les colonnes correspondantes.' }] });
  });
  frames.push({ id: 'final', label: 'Additionner les produits partiels', explanation: `Le résultat est ${result}.`, rows: baseRows(left, right, 0, width, '×', result), events: [{ kind: 'highlight', description: 'Additionne les produits partiels colonne par colonne.' }] });
  return { expression, operation: 'multiplication', columns: columns(0, width - 1), frames, result: result.toString() };
}

function divisionFrames(dividend: bigint, divisor: bigint, expression: string): PlaceValueSolution {
  const dividendText = dividend.toString(); const quotient = dividend / divisor; const remainder = dividend % divisor;
  const width = dividendText.length; const frames: PlaceValueFrame[] = [{ id: 'setup', label: 'Poser la division', explanation: 'Le diviseur est à gauche, le dividende sous la potence et le quotient au-dessus.', layout: 'long-division', rows: [{ id: 'quotient', label: 'quotient', cells: [] }, { id: 'dividend', label: `${divisor} )`, cells: digits(dividend, width, 'dividend', 0) }], events: [] }];
  let partial = 0n; let quotientText = ''; const historyRows: GridRow[] = [];
  [...dividendText].forEach((digitText, index) => {
    partial = partial * 10n + BigInt(digitText);
    const q = partial >= divisor ? partial / divisor : 0n; const product = q * divisor; const newRemainder = partial - product; quotientText += q.toString();
    const currentExponent = width - index - 1;
    historyRows.push({ id: `subtraction-${index}`, label: '−', cells: shiftedDigits(product, currentExponent, `subtraction-${index}`, 'result') });
    if (newRemainder > 0n) historyRows.push({ id: `remainder-${index}`, label: '', cells: shiftedDigits(newRemainder, currentExponent, `remainder-${index}`, 'annotation', 'active') });
    frames.push({ id: `division-${index}`, label: `Traiter le chiffre ${digitText}`, explanation: `${partial} ÷ ${divisor} = ${q}, reste ${newRemainder}.`, layout: 'long-division', rows: [{ id: 'quotient', label: 'quotient', cells: [...quotientText].map((text, qIndex) => cell('quotient', width - qIndex - 1, text, 'result', qIndex === quotientText.length - 1 ? 'active' : undefined)) }, { id: 'dividend', label: `${divisor} )`, cells: digits(dividend, width, 'dividend', 0) }, ...historyRows], events: [{ kind: 'bring-down', sourceExponent: currentExponent, destinationExponent: currentExponent - 1, value: digitText, description: `Abaisse le chiffre ${digitText}.` }, { kind: 'quotient-digit', sourceExponent: currentExponent, destinationExponent: currentExponent, value: q.toString(), description: `Écris ${q} au quotient${q === 0n ? ' (zéro conservé)' : ''}.` }, { kind: 'partial-subtraction', sourceExponent: currentExponent, destinationExponent: currentExponent, value: product.toString(), description: `Soustrais ${product}.` }] });
    partial = newRemainder;
  });
  frames.push({ id: 'final', label: 'Résultat', explanation: remainder ? `Quotient ${quotient}, reste ${remainder}.` : `Le quotient est ${quotient}.`, layout: 'long-division', rows: frames.at(-1)!.rows, events: [] });
  return { expression, operation: 'division', columns: columns(0, width - 1), frames, result: remainder ? `${quotient} reste ${remainder}` : quotient.toString(), layout: 'long-division' };
}

function formatResult(value: bigint, decimals: number): string {
  if (!decimals) return value.toString();
  const raw = value.toString().padStart(decimals + 1, '0');
  return `${raw.slice(0, -decimals)},${raw.slice(-decimals)}`;
}

export function buildPlaceValueSolution(expression: string): PlaceValueSolution {
  const { left, operator, right } = operationParts(expression);
  if (operator === '+' || operator === '-') {
    const decimals = Math.max(left.decimals, right.decimals);
    const leftScaled = left.integer * 10n ** BigInt(decimals - left.decimals);
    const rightScaled = right.integer * 10n ** BigInt(decimals - right.decimals);
    if (operator === '-' && leftScaled < rightScaled) throw new Error('Cette version supporte les résultats positifs.');
    return arithmeticFrames(leftScaled, rightScaled, decimals, operator, expression);
  }
  if (operator === '×' || operator === '*') return multiplicationFrames(left.integer, right.integer, expression);
  if (operator === '÷' || operator === '/') return divisionFrames(left.integer, right.integer, expression);
  throw new Error('Opération non prise en charge.');
}
