/**
 * AST-based math animator utilities adapted from provided reference
 * - Builds step rows for +, -, ×, ÷ with carries/borrows and final 2dp result
 */

type Locale = 'en' | 'fr';

type RowRole = 'carry' | 'top' | 'op' | 'bottom' | 'line' | 'result';

export interface AnimatorRow {
  role: RowRole;
  value: string;
}

export interface AnimatorStep {
  label: string;
  explanation: string;
  highlightCol: number | null; // 0 = ones, 1 = tens, ... from right
  rows: AnimatorRow[];
  carries?: Record<number, number>;
  borrows?: Record<number, number>;
}

// ================= Utilities =================
const safeString = (v: unknown, f = ''): string =>
  typeof v === 'string' ? v : v == null ? f : String(v);

const toDigits = (s: string, width: number): string[] => safeString(s).padStart(width, ' ').split('');

const isDigit = (c: string): boolean => c >= '0' && c <= '9';

const dval = (c: string | undefined): number => (c && isDigit(c) ? Number(c) : 0);

const stripLeadingZeros = (input: string): string => {
  const s = safeString(input, '0');
  const neg = s.startsWith('-');
  const t = neg ? s.slice(1) : s;
  const [i, d] = t.split('.');
  const ii = (i ?? '0').replace(/^0+(?=\d)/, '');
  const joined = d !== undefined ? `${ii || '0'}.${d}` : ii || '0';
  return neg ? `-${joined}` : joined;
};

const alignDecimals = (aIn: string, bIn: string) => {
  let a = safeString(aIn, '0');
  let b = safeString(bIn, '0');
  if (!a.includes('.')) a += '.';
  if (!b.includes('.')) b += '.';
  const [ai, ad = ''] = a.split('.');
  const [bi, bd = ''] = b.split('.');
  const maxD = Math.max(ad.length, bd.length);
  return {
    A: ai + '.' + ad.padEnd(maxD, '0'),
    B: bi + '.' + bd.padEnd(maxD, '0'),
    decimals: maxD,
  };
};

const placeName = (i: number, lang: Locale): string => {
  const en = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands', 'millions'];
  const fr = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de mille', 'centaines de mille', 'millions'];
  const arr = lang === 'fr' ? fr : en;
  return arr[i] ?? (lang === 'fr' ? 'colonne' : 'column');
};

const strings = {
  en: {
    title: (expr: string) => `Animated Steps • ${expr}`,
    align: 'Align by place value (ones, tens, hundreds...)',
    finalAnswer: 'Final Answer (2 decimals)',
    add: 'Add',
    sub: 'Subtract',
    mul: 'Multiply',
    div: 'Divide',
  },
  fr: {
    title: (expr: string) => `Étapes animées • ${expr}`,
    align: 'Aligne les nombres par ordre (unités, dizaines, centaines...)',
    finalAnswer: 'Réponse finale (2 décimales)',
    add: 'Ajoute',
    sub: 'Soustrais',
    mul: 'Multiplie',
    div: 'Divise',
  },
};

const format2 = (s: string): string => {
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(2) : s;
};

// ============== Tokenizer & Parser (Shunting-yard) ==============
type Tok =
  | { type: 'lpar'; value: string }
  | { type: 'rpar'; value: string }
  | { type: 'op'; value: string }
  | { type: 'percent'; value: string }
  | { type: 'num'; value: string };

function tokenize(exprIn: string): Tok[] {
  const s0 = safeString(exprIn).replace(/×/g, '*').replace(/÷/g, '/');
  const out: Tok[] = [];
  let i = 0;
  while (i < s0.length) {
    const ch = s0[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      out.push({ type: 'lpar', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ type: 'rpar', value: ch });
      i++;
      continue;
    }
    if ('+-*/'.includes(ch)) {
      out.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '%') {
      out.push({ type: 'percent', value: '%' });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i,
        dot = 0;
      while (j < s0.length && /[0-9.]/.test(s0[j])) {
        if (s0[j] === '.') dot++;
        j++;
      }
      const num = s0.slice(i, j);
      if (dot > 1 || /^\.$/.test(num)) throw new Error('bad-number');
      out.push({ type: 'num', value: num });
      i = j;
      continue;
    }
    throw new Error('bad-char');
  }
  // Transform % to / 100
  const out2: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    const t = out[k];
    if (t.type === 'percent') {
      out2.push({ type: 'op', value: '/' });
      out2.push({ type: 'num', value: '100' });
    } else out2.push(t);
  }
  return out2;
}

type AST =
  | { kind: 'num'; value: string }
  | { kind: 'unary-'; right: AST }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: AST; right: AST };

function parseToAST(exprIn: string): AST {
  const toks = tokenize(exprIn);
  const out: Tok[] = [];
  const ops: Tok[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  let prev: Tok | null = null;
  for (const t of toks) {
    if (t.type === 'num') {
      out.push(t);
      prev = t;
      continue;
    }
    if (t.type === 'op') {
      if (t.value === '-' && (!prev || (prev.type !== 'num' && prev.type !== 'rpar'))) {
        ops.push({ type: 'op', value: 'u-' });
        prev = t;
        continue;
      }
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type === 'op' && top.value !== 'u-' && prec[top.value] >= prec[t.value]) out.push(ops.pop()!);
        else break;
      }
      ops.push(t);
      prev = t;
      continue;
    }
    if (t.type === 'lpar') {
      ops.push(t);
      prev = t;
      continue;
    }
    if (t.type === 'rpar') {
      while (ops.length && ops[ops.length - 1].type !== 'lpar') out.push(ops.pop()!);
      if (!ops.length) throw new Error('mismatch-paren');
      ops.pop();
      prev = t;
      continue;
    }
  }
  while (ops.length) {
    const x = ops.pop()!;
    if (x.type === 'lpar') throw new Error('mismatch-paren');
    out.push(x);
  }
  const st: AST[] = [];
  for (const t of out) {
    if (t.type === 'num') {
      st.push({ kind: 'num', value: t.value });
      continue;
    }
    if (t.type === 'op' && t.value === 'u-') {
      const r = st.pop();
      if (!r) throw new Error('stack');
      st.push({ kind: 'unary-', right: r });
      continue;
    }
    if (t.type === 'op') {
      const r = st.pop();
      const l = st.pop();
      if (!l || !r) throw new Error('stack');
      st.push({ kind: 'bin', op: t.value as '+' | '-' | '*' | '/', left: l, right: r });
      continue;
    }
  }
  if (st.length !== 1) throw new Error('stack-leftover');
  return st[0];
}

// ============== Rendering helpers ==============
const buildRows = (top: string, bottom: string, opSign: string, partial: string): AnimatorRow[] => [
  { role: 'carry', value: ' '.repeat(top.length) },
  { role: 'top', value: top },
  { role: 'op', value: opSign + ' '.repeat(top.length - 1) },
  { role: 'bottom', value: bottom },
  { role: 'line', value: '-'.repeat(top.length + 2) },
  { role: 'result', value: partial },
];

// ============== Column algorithms (+, -, ×) ==============
function stepsForAddition(a: string, b: string, lang: Locale): AnimatorStep[] {
  const decimal = a.includes('.') || b.includes('.');
  const { A, B, decimals } = decimal ? alignDecimals(a, b) : { A: a, B: b, decimals: 0 } as any;
  const cleanA = A.replace('.', '');
  const cleanB = B.replace('.', '');
  const width = Math.max(cleanA.length, cleanB.length);
  const top = cleanA.padStart(width, ' ');
  const bottom = cleanB.padStart(width, ' ');
  const resArr: string[] = new Array(width).fill(' ');
  const s = strings[lang];
  const out: AnimatorStep[] = [];
  out.push({ label: s.title(`${stripLeadingZeros(a)} + ${stripLeadingZeros(b)}`), explanation: s.align, highlightCol: null, rows: buildRows(top, bottom, '+', ' '.repeat(width)) });
  let carry = 0;
  for (let col = 0; col < width; col++) {
    const i = width - 1 - col;
    const sum = dval(top[i]) + dval(bottom[i]) + carry;
    const digit = sum % 10;
    carry = Math.floor(sum / 10);
    resArr[i] = String(digit);
    const carries = carry ? { [col + 1]: carry } : undefined;
    out.push({ label: `Step ${col + 2}: ${(lang === 'fr' ? 'Ajoute' : 'Add')} ${placeName(col, lang)}`, explanation: `${dval(top[i])} + ${dval(bottom[i])}${carry ? (lang === 'fr' ? ' + 1 (retenue)' : ' + 1 (carry)') : ''} → ${digit}`, highlightCol: col, carries, rows: buildRows(top, bottom, '+', resArr.join('')) });
  }
  const finalStr = (carry ? String(carry) : '') + resArr.join('');
  let finalRows = buildRows(top, bottom, '+', finalStr);
  if (decimals > 0) {
    finalRows = finalRows.map(r =>
      r.role !== 'result'
        ? r
        : {
            ...r,
            value: (() => {
              const v = r.value.replace(/\s+/g, '');
              const withDot = v.slice(0, v.length - decimals) + '.' + v.slice(v.length - decimals);
              return withDot.padStart(finalStr.length + 1, ' ');
            })(),
          }
    );
  }
  out.push({ label: strings[lang].finalAnswer, explanation: strings[lang].finalAnswer, highlightCol: null, rows: finalRows });
  return out;
}

function stepsForSubtraction(a: string, b: string, lang: Locale): AnimatorStep[] {
  const decimal = a.includes('.') || b.includes('.');
  const { A, B, decimals } = decimal ? alignDecimals(a, b) : { A: a, B: b, decimals: 0 } as any;
  let AA = A,
    BB = B,
    neg = false;
  if (Number(AA) < Number(BB)) {
    neg = true;
    [AA, BB] = [B, A];
  }
  const cleanA = AA.replace('.', '');
  const cleanB = BB.replace('.', '');
  const width = Math.max(cleanA.length, cleanB.length);
  const top = cleanA.padStart(width, ' ');
  const bottom = cleanB.padStart(width, ' ');
  const resArr: string[] = new Array(width).fill(' ');
  const s = strings[lang];
  const out: AnimatorStep[] = [];
  out.push({ label: s.title(`${stripLeadingZeros(a)} - ${stripLeadingZeros(b)}`), explanation: s.align, highlightCol: null, rows: buildRows(top, bottom, '-', ' '.repeat(width)) });
  const borrows: Record<number, number> = {};
  let borrowCarry = 0;
  for (let col = 0; col < width; col++) {
    const i = width - 1 - col;
    let t = dval(top[i]) - borrowCarry;
    const bd = dval(bottom[i]);
    if (t < bd) {
      t += 10;
      borrowCarry = 1;
      borrows[col + 1] = 1;
    } else borrowCarry = 0;
    const diff = t - bd;
    resArr[i] = String(diff);
    out.push({ label: `Step ${col + 2}: ${(lang === 'fr' ? 'Soustrais' : 'Subtract')} ${placeName(col, lang)}`, explanation: t >= 10 ? (lang === 'fr' ? `Emprunte → ${t - 10} devient ${t}; ${bd} en bas → ${diff}` : `Borrow → ${t - 10} becomes ${t}; ${bd} below → ${diff}`) : `${t} − ${bd} = ${diff}`, highlightCol: col, borrows: { ...borrows }, rows: buildRows(top, bottom, '-', resArr.join('')) });
  }
  let finalStr = resArr.join('');
  if (neg) finalStr = '-' + finalStr;
  let finalRows = buildRows(top, bottom, '-', finalStr);
  if (decimals > 0) {
    finalRows = finalRows.map(r =>
      r.role !== 'result'
        ? r
        : {
            ...r,
            value: (() => {
              const negPrefix = neg ? '-' : '';
              const v = r.value.replace(/\s+/g, '').replace(/^\-/, '');
              const withDot = v.slice(0, v.length - decimals) + '.' + v.slice(v.length - decimals);
              return (negPrefix + withDot).padStart(finalStr.length + (neg ? 1 : 0), ' ');
            })(),
          }
    );
  }
  out.push({ label: strings[lang].finalAnswer, explanation: strings[lang].finalAnswer, highlightCol: null, rows: finalRows });
  return out;
}

function stepsForMultiplication(a: string, b: string, lang: Locale): AnimatorStep[] {
  const hasDec = a.includes('.') || b.includes('.');
  const [ai, ad = ''] = a.split('.');
  const [bi, bd = ''] = b.split('.');
  const decPlaces = (ad?.length || 0) + (bd?.length || 0);
  const cleanA = (ai + ad).replace(/^0+/, '') || '0';
  const cleanB = (bi + bd).replace(/^0+/, '') || '0';
  const width = Math.max(cleanA.length + cleanB.length, Math.max(cleanA.length, cleanB.length) + 1);
  const top = cleanA.padStart(width, ' ');
  const bottom = cleanB.padStart(width, ' ');
  const s = strings[lang];
  const out: AnimatorStep[] = [];
  out.push({ label: s.title(`${stripLeadingZeros(a)} × ${stripLeadingZeros(b)}`), explanation: s.align, highlightCol: null, rows: buildRows(top, bottom, '×', ' '.repeat(width)) });

  const partials: string[] = [];
  for (let j = cleanB.length - 1; j >= 0; j--) {
    const bj = cleanB.charCodeAt(j) - 48;
    let carry = 0,
      row = '';
    for (let i = cleanA.length - 1; i >= 0; i--) {
      const aiV = cleanA.charCodeAt(i) - 48;
      const p = aiV * bj + carry;
      row = String(p % 10) + row;
      carry = Math.floor(p / 10);
    }
    if (carry) row = String(carry) + row;
    row = row + '0'.repeat(cleanB.length - 1 - j);
    partials.push(row);
    out.push({ label: `${lang === 'fr' ? 'Produit partiel' : 'Partial product'}: ${bj} × ${stripLeadingZeros(a)}`, explanation: `${lang === 'fr' ? 'On multiplie' : 'Multiply'} ${stripLeadingZeros(a)} ${lang === 'fr' ? 'par' : 'by'} ${bj}${cleanB.length - 1 - j ? (lang === 'fr' ? ', puis décalage.' : ', then shift.') : ''}`, highlightCol: cleanB.length - 1 - j, rows: [{ role: 'carry', value: ' '.repeat(width) }, { role: 'top', value: top }, { role: 'op', value: '×' + ' '.repeat(width - 1) }, { role: 'bottom', value: bottom }, { role: 'line', value: '-'.repeat(width + 2) }, { role: 'result', value: row.padStart(width, ' ') }] });
  }
  const sumWidth = Math.max(width, ...partials.map(p => p.length));
  const finalInt = partials.reduce((acc, cur) => {
    const aPad = acc.padStart(Math.max(acc.length, cur.length), '0');
    const cPad = cur.padStart(Math.max(acc.length, cur.length), '0');
    let carry = 0,
      outStr = '';
    for (let k = aPad.length - 1; k >= 0; k--) {
      const ssum = (aPad.charCodeAt(k) - 48) + (cPad.charCodeAt(k) - 48) + carry;
      outStr = String(ssum % 10) + outStr;
      carry = Math.floor(ssum / 10);
    }
    return (carry ? String(carry) : '') + outStr;
  }, '0');
  let finalWithDec = finalInt;
  if (hasDec) {
    const need = decPlaces;
    const pad = Math.max(0, need - finalWithDec.length + 1);
    finalWithDec = (pad ? '0'.repeat(pad) + finalWithDec : finalWithDec);
    const idx = finalWithDec.length - need;
    finalWithDec = finalWithDec.slice(0, idx) + '.' + finalWithDec.slice(idx);
  }
  const rows: AnimatorRow[] = [
    { role: 'carry', value: ' '.repeat(sumWidth) },
    { role: 'top', value: top.padStart(sumWidth, ' ') },
    { role: 'op', value: '×' + ' '.repeat(sumWidth - 1) },
    { role: 'bottom', value: bottom.padStart(sumWidth, ' ') },
    { role: 'line', value: '-'.repeat(sumWidth + 2) },
    ...partials.map(p => ({ role: 'result' as RowRole, value: p.padStart(sumWidth, ' ') })),
    { role: 'line', value: '-'.repeat(sumWidth + 2) },
    { role: 'result', value: finalWithDec.padStart(sumWidth + (finalWithDec.includes('.') ? 1 : 0), ' ') },
  ];
  out.push({ label: strings[lang].finalAnswer, explanation: strings[lang].finalAnswer, highlightCol: null, rows });
  return out;
}

// ============== Long Division (to 2 decimals) ==============
function stepsForDivision(dividendStr: string, divisorStr: string, lang: Locale): AnimatorStep[] {
  const dv = Number(dividendStr),
    dr = Number(divisorStr);
  if (!Number.isFinite(dv) || !Number.isFinite(dr) || dr === 0) throw new Error('division');
  const sign = (dv < 0 ? -1 : 1) * (dr < 0 ? -1 : 1);
  const aStr = Math.abs(dv).toString();
  const bStr = Math.abs(dr).toString();
  const [ai, ad = ''] = aStr.split('.');
  const [bi, bd = ''] = bStr.split('.');
  // scale dividend so quotient shows 2 decimals after integer division by B
  const A = (ai + (ad || '') + '0'.repeat(Math.max(0, 2 - (ad || '').length))).replace(/^0+/, '') || '0';
  const B = (bi + (bd || '')).replace(/^0+/, '') || '0';
  const width = Math.max(A.length, B.length) + 2;
  const top = A.padStart(width, ' ');
  const bottom = B.padStart(width, ' ');
  const out: AnimatorStep[] = [];
  out.push({ label: strings[lang].title(`${stripLeadingZeros(dividendStr)} ÷ ${stripLeadingZeros(divisorStr)}`), explanation: lang === 'fr' ? 'Division posée (on calcule chiffre par chiffre)' : 'Long division (digit by digit)', highlightCol: null, rows: buildRows(top, bottom, '÷', ' '.repeat(width)) });
  let remainder = 0,
    quotient = '';
  const bNum = Number(B);
  for (let idx = 0; idx < A.length; idx++) {
    const cur = remainder * 10 + (A.charCodeAt(idx) - 48);
    const qd = Math.floor(cur / bNum);
    const newRem = cur - qd * bNum;
    quotient += String(qd);
    remainder = newRem;
    out.push({ label: `${lang === 'fr' ? 'Chiffre du quotient' : 'Quotient digit'}: ${qd}`, explanation: `${cur} ÷ ${B} = ${qd} remainder ${newRem}`, highlightCol: null, rows: [{ role: 'carry', value: ' '.repeat(width) }, { role: 'top', value: top }, { role: 'op', value: '÷' + ' '.repeat(width - 1) }, { role: 'bottom', value: bottom }, { role: 'line', value: '-'.repeat(width + 2) }, { role: 'result', value: quotient.padEnd(width, ' ') }] });
  }
  let qStr = quotient.replace(/^0+/, '') || '0';
  if (qStr.length <= 2) qStr = '0'.repeat(3 - qStr.length) + qStr;
  const withDot = qStr.slice(0, qStr.length - 2) + '.' + qStr.slice(qStr.length - 2);
  const final = (sign < 0 ? '-' : '') + withDot;
  out.push({ label: strings[lang].finalAnswer, explanation: strings[lang].finalAnswer, highlightCol: null, rows: buildRows(top, bottom, '÷', final.padStart(width + 1, ' ')) });
  return out;
}

// ============== AST evaluation to steps (then final 2-dec card) ==============
function evalToSteps(ast: AST, lang: Locale): { value: string; steps: AnimatorStep[] } {
  if (ast.kind === 'num') return { value: ast.value, steps: [] };
  if (ast.kind === 'unary-') {
    const r = evalToSteps(ast.right, lang);
    return { value: String(-Number(r.value)), steps: r.steps };
  }
  if (ast.kind === 'bin') {
    const L = evalToSteps(ast.left, lang);
    const R = evalToSteps(ast.right, lang);
    let opSteps: AnimatorStep[] = [];
    let val = '0';
    const a = L.value,
      b = R.value;
    if (ast.op === '+') {
      opSteps = stepsForAddition(a, b, lang);
      val = String(Number(a) + Number(b));
    } else if (ast.op === '-') {
      opSteps = stepsForSubtraction(a, b, lang);
      val = String(Number(a) - Number(b));
    } else if (ast.op === '*') {
      opSteps = stepsForMultiplication(a, b, lang);
      val = String(Number(a) * Number(b));
    } else if (ast.op === '/') {
      opSteps = stepsForDivision(a, b, lang);
      val = String(Number(a) / Number(b));
    }
    return { value: val, steps: [...L.steps, ...R.steps, ...opSteps] };
  }
  throw new Error('bad-ast');
}

export function buildStepsGeneral(expression: string, locale: Locale): AnimatorStep[] {
  const ast = parseToAST(expression);
  const { value, steps } = evalToSteps(ast, locale);
  const pretty = format2(value); // final 2 decimals
  const width = Math.max(pretty.length, 6);
  const rows: AnimatorRow[] = [
    { role: 'carry', value: ' '.repeat(width) },
    { role: 'top', value: ''.padStart(width, ' ') },
    { role: 'op', value: '=' + ' '.repeat(width - 1) },
    { role: 'bottom', value: ''.padStart(width, ' ') },
    { role: 'line', value: '-'.repeat(width + 2) },
    { role: 'result', value: pretty.padStart(width, ' ') },
  ];
  return [...steps, { label: strings[locale].finalAnswer, explanation: strings[locale].finalAnswer, highlightCol: null, rows }];
}

export function computeCols(step: AnimatorStep): number {
  return Math.max(1, ...step.rows.map(r => safeString(r.value).length));
}

export function toPaddedDigits(rowValue: string, cols: number): string[] {
  return toDigits(rowValue, cols);
}

















