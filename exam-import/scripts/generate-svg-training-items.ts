/**
 * generate-svg-training-items.ts
 *
 * Generates a complete, self-contained training items JSON for the DNB 2018
 * Métropole–La Réunion math exam. All visual elements are embedded as SVG data
 * URIs in the `public_url` field of documents — no PDF, no storage bucket needed.
 *
 * Usage:
 *   npx tsx exam-import/scripts/generate-svg-training-items.ts [--out <path>]
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// SVG generators
// ---------------------------------------------------------------------------

/** Exercise 1 — Trophy diagram (sphere on cylinder) — simple black/white matching original exam */
function svgTrophy(): string {
  const svgW = 200;

  // Sphere: radius=68px ≈ 23cm diameter. Cylinder: width=14px ≈ 6cm, height=136px ≈ 23cm.
  const cx = 120;     // horizontal center
  const r = 68;       // sphere radius
  const cylW = 32;    // cylinder width (6cm, sphere is 23cm → ratio 6/23 × 2r ≈ 36px)
  const cylH = 136;   // cylinder height (same scale as sphere)

  const yTop = 30;               // top of sphere
  const yCylTop = yTop + 2 * r;  // = 166: bottom of sphere = top of cylinder
  const yCylBot = yCylTop + cylH; // = 302: bottom of cylinder
  const svgH = yCylBot + 30;

  const axX = 46;   // x of vertical double-arrow line
  const aH = 8;     // arrowhead height
  const txX = 6;    // text x (start-anchored)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="serif">
  <rect width="${svgW}" height="${svgH}" fill="white"/>

  <!-- Sphere (simple circle, no fill) -->
  <circle cx="${cx}" cy="${yTop + r}" r="${r}" fill="none" stroke="black" stroke-width="2"/>

  <!-- Cylinder (simple rectangle, no fill) -->
  <rect x="${cx - cylW / 2}" y="${yCylTop}" width="${cylW}" height="${cylH}" fill="none" stroke="black" stroke-width="2"/>

  <!-- Horizontal dashed guide lines (full width) -->
  <line x1="5" y1="${yTop}" x2="${svgW - 5}" y2="${yTop}" stroke="black" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="5" y1="${yCylTop}" x2="${svgW - 5}" y2="${yCylTop}" stroke="black" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="5" y1="${yCylBot}" x2="${svgW - 5}" y2="${yCylBot}" stroke="black" stroke-width="1" stroke-dasharray="6,4"/>

  <!-- Vertical double-arrow: sphere height = 23 cm -->
  <line x1="${axX}" y1="${yTop}" x2="${axX}" y2="${yCylTop}" stroke="black" stroke-width="1.5"/>
  <polygon points="${axX - 4},${yTop + aH} ${axX + 4},${yTop + aH} ${axX},${yTop}" fill="black"/>
  <polygon points="${axX - 4},${yCylTop - aH} ${axX + 4},${yCylTop - aH} ${axX},${yCylTop}" fill="black"/>
  <text x="${txX}" y="${yTop + r + 5}" font-size="13" fill="black">23 cm</text>

  <!-- Vertical double-arrow: cylinder height = 23 cm -->
  <line x1="${axX}" y1="${yCylTop}" x2="${axX}" y2="${yCylBot}" stroke="black" stroke-width="1.5"/>
  <polygon points="${axX - 4},${yCylTop + aH} ${axX + 4},${yCylTop + aH} ${axX},${yCylTop}" fill="black"/>
  <polygon points="${axX - 4},${yCylBot - aH} ${axX + 4},${yCylBot - aH} ${axX},${yCylBot}" fill="black"/>
  <text x="${txX}" y="${yCylTop + cylH / 2 + 5}" font-size="13" fill="black">23 cm</text>

  <!-- Horizontal double-arrow: cylinder width = 6 cm -->
  <line x1="${cx - cylW / 2}" y1="${yCylBot + 16}" x2="${cx + cylW / 2}" y2="${yCylBot + 16}" stroke="black" stroke-width="1.5"/>
  <polygon points="${cx - cylW / 2},${yCylBot + 12} ${cx - cylW / 2},${yCylBot + 20} ${cx - cylW / 2 - 6},${yCylBot + 16}" fill="black"/>
  <polygon points="${cx + cylW / 2},${yCylBot + 12} ${cx + cylW / 2},${yCylBot + 20} ${cx + cylW / 2 + 6},${yCylBot + 16}" fill="black"/>
  <text x="${cx}" y="${yCylBot + 30}" font-size="13" fill="black" text-anchor="middle">6 cm</text>
</svg>`;
}

/** Exercise 2 — Geometry figure (triangles ABC, BDC, BFE) */
function svgGeometryFigure(): string {
  // Coordinates as specified:
  const C = { x: 50, y: 260 };
  const B = { x: 200, y: 260 };
  const E = { x: 336, y: 260 };
  const D = { x: 200, y: 340 };
  const A = { x: 85, y: 196 };
  const F = { x: 306, y: 204 };

  const ra = 8; // right angle square size

  // Right angle at A: vectors AB and AC from A
  const vAB = { x: B.x - A.x, y: B.y - A.y };
  const vAC = { x: C.x - A.x, y: C.y - A.y };
  const lenAB = Math.hypot(vAB.x, vAB.y);
  const lenAC = Math.hypot(vAC.x, vAC.y);
  const uAB = { x: vAB.x / lenAB, y: vAB.y / lenAB };
  const uAC = { x: vAC.x / lenAC, y: vAC.y / lenAC };
  const raSize = 10;
  const rA1 = { x: A.x + uAB.x * raSize, y: A.y + uAB.y * raSize };
  const rA2 = { x: A.x + uAB.x * raSize + uAC.x * raSize, y: A.y + uAB.y * raSize + uAC.y * raSize };
  const rA3 = { x: A.x + uAC.x * raSize, y: A.y + uAC.y * raSize };

  // Right angle at B (for triangle BDC): BD is down, BC is left
  // B→D direction: (0, 80), B→C direction: (-150, 0)
  // Unit vectors: (0,1) and (-1,0)
  const rB1 = { x: B.x, y: B.y + raSize };         // along BD
  const rB2 = { x: B.x - raSize, y: B.y + raSize }; // corner
  const rB3 = { x: B.x - raSize, y: B.y };           // along BC

  // Right angle at F: vectors FB and FE from F
  const vFB = { x: B.x - F.x, y: B.y - F.y };
  const vFE = { x: E.x - F.x, y: E.y - F.y };
  const lenFB = Math.hypot(vFB.x, vFB.y);
  const lenFE = Math.hypot(vFE.x, vFE.y);
  const uFB = { x: vFB.x / lenFB, y: vFB.y / lenFB };
  const uFE = { x: vFE.x / lenFE, y: vFE.y / lenFE };
  const rF1 = { x: F.x + uFB.x * raSize, y: F.y + uFB.y * raSize };
  const rF2 = { x: F.x + uFB.x * raSize + uFE.x * raSize, y: F.y + uFB.y * raSize + uFE.y * raSize };
  const rF3 = { x: F.x + uFE.x * raSize, y: F.y + uFE.y * raSize };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="230" viewBox="0 150 420 230" font-family="system-ui,-apple-system,sans-serif" stroke-linecap="round" stroke-linejoin="round">
  <rect x="0" y="150" width="420" height="230" fill="white"/>

  <!-- Horizontal base line C-B-E -->
  <line x1="${C.x}" y1="${C.y}" x2="${E.x}" y2="${E.y}" stroke="#111827" stroke-width="2.2"/>

  <!-- Triangle ABC -->
  <line x1="${C.x}" y1="${C.y}" x2="${A.x}" y2="${A.y}" stroke="#2563eb" stroke-width="1.8"/>
  <line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#2563eb" stroke-width="1.8"/>

  <!-- Triangle BDC: BD and DC -->
  <line x1="${B.x}" y1="${B.y}" x2="${D.x}" y2="${D.y}" stroke="#dc2626" stroke-width="1.8"/>
  <line x1="${D.x}" y1="${D.y}" x2="${C.x}" y2="${C.y}" stroke="#dc2626" stroke-width="1.8"/>

  <!-- Triangle BFE: BF and FE -->
  <line x1="${B.x}" y1="${B.y}" x2="${F.x}" y2="${F.y}" stroke="#16a34a" stroke-width="1.8"/>
  <line x1="${F.x}" y1="${F.y}" x2="${E.x}" y2="${E.y}" stroke="#16a34a" stroke-width="1.8"/>

  <!-- Right angle marker at A -->
  <polyline points="${rA1.x},${rA1.y} ${rA2.x},${rA2.y} ${rA3.x},${rA3.y}" fill="none" stroke="#374151" stroke-width="1.2"/>

  <!-- Right angle marker at B (for BDC, BD⊥BC) -->
  <polyline points="${rB1.x},${rB1.y} ${rB2.x},${rB2.y} ${rB3.x},${rB3.y}" fill="none" stroke="#374151" stroke-width="1.2"/>

  <!-- Right angle marker at F -->
  <polyline points="${rF1.x},${rF1.y} ${rF2.x},${rF2.y} ${rF3.x},${rF3.y}" fill="none" stroke="#374151" stroke-width="1.2"/>

  <!-- Measurement labels -->
  <!-- CB = 7,5 cm (below line) -->
  <text x="${(C.x + B.x) / 2}" y="${C.y + 16}" font-size="11" fill="#374151" text-anchor="middle">7,5 cm</text>
  <!-- BE = 6,8 cm (below line) -->
  <text x="${(B.x + E.x) / 2}" y="${B.y + 16}" font-size="11" fill="#374151" text-anchor="middle">6,8 cm</text>
  <!-- DC = 8,5 cm (left side) -->
  <text x="${(D.x + C.x) / 2 - 22}" y="${(D.y + C.y) / 2 + 4}" font-size="11" fill="#374151" text-anchor="middle">8,5 cm</text>
  <!-- BF = 6 cm -->
  <text x="${(B.x + F.x) / 2 - 4}" y="${(B.y + F.y) / 2 - 6}" font-size="11" fill="#374151" text-anchor="middle">6 cm</text>
  <!-- FE = 3,2 cm -->
  <text x="${(F.x + E.x) / 2 + 2}" y="${(F.y + E.y) / 2 - 5}" font-size="11" fill="#374151" text-anchor="middle">3,2 cm</text>

  <!-- Angle ACB = 61° at C -->
  <text x="${C.x + 12}" y="${C.y - 8}" font-size="11" fill="#374151">61°</text>
  <!-- Small arc at C -->
  <path d="M ${C.x + 18},${C.y} A 18,18 0 0,0 ${C.x + 9},${C.y - 16}" fill="none" stroke="#374151" stroke-width="1"/>

  <!-- Point labels -->
  <text x="${A.x - 12}" y="${A.y - 6}" font-size="13" fill="#111827" font-weight="bold">A</text>
  <text x="${B.x - 4}" y="${B.y + 20}" font-size="13" fill="#111827" font-weight="bold">B</text>
  <text x="${C.x - 16}" y="${C.y + 20}" font-size="13" fill="#111827" font-weight="bold">C</text>
  <text x="${D.x + 4}" y="${D.y + 16}" font-size="13" fill="#111827" font-weight="bold">D</text>
  <text x="${E.x + 6}" y="${E.y + 20}" font-size="13" fill="#111827" font-weight="bold">E</text>
  <text x="${F.x + 6}" y="${F.y - 6}" font-size="13" fill="#111827" font-weight="bold">F</text>

  <!-- Point dots -->
  <circle cx="${A.x}" cy="${A.y}" r="3" fill="#111827"/>
  <circle cx="${B.x}" cy="${B.y}" r="3" fill="#111827"/>
  <circle cx="${C.x}" cy="${C.y}" r="3" fill="#111827"/>
  <circle cx="${D.x}" cy="${D.y}" r="3" fill="#111827"/>
  <circle cx="${E.x}" cy="${E.y}" r="3" fill="#111827"/>
  <circle cx="${F.x}" cy="${F.y}" r="3" fill="#111827"/>
</svg>`;
}

/** Exercise 5 — Programme de calcul (simple bordered bullet list matching original exam) */
function svgFlowchart(): string {
  const items = [
    "Choisir un nombre",
    "Multiplier ce nombre par 4",
    "Ajouter 8",
    "Multiplier le résultat par 2",
  ];
  const w = 290;
  const padX = 22;
  const lineH = 36;
  const padTop = 22;
  const h = padTop + items.length * lineH + padTop;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="system-ui,-apple-system,sans-serif">
  <rect width="${w}" height="${h}" fill="white"/>
  <rect x="10" y="8" width="${w - 20}" height="${h - 16}" rx="8" fill="#f8fafc" stroke="#374151" stroke-width="2"/>
  ${items.map((line, i) => `<text x="${padX}" y="${padTop + (i + 0.72) * lineH}" font-size="14" fill="#111827">• ${line}</text>`).join("\n  ")}
</svg>`;
}

/** Exercise 6 — Scratch program blocks (Longueur global variable, puzzle-piece shapes) */
function svgScratchProgram(): string {
  const bh = 27; // block body height
  const tab = 4; // connector tab height
  const tw = 12; // connector tab width
  const tx = 14; // connector tab x offset from block left
  const pad = 9; // text left padding
  const indent = 20; // C-block inner indent

  // Colors
  const col = {
    event: "#FFAB19",
    motion: "#4C97FF",
    pen: "#59C059",
    variable: "#FF8C1A",
    custom: "#9966FF",
    control: "#FFAB19",
  };

  // Returns SVG path for a standard block with socket-top + tab-bottom
  function blockPath(x: number, y: number, w: number, h: number, noSocket = false, noTab = false): string {
    const r = 4;
    // Top edge: socket indent at (tx, y) going down by tab, then up
    const topSocket = noSocket
      ? `L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r}`
      : `L ${x + tx},${y} L ${x + tx},${y + tab} L ${x + tx + tw},${y + tab} L ${x + tx + tw},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r}`;
    // Bottom edge: plug tab extending down by tab
    const botPlug = noTab
      ? `L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r}`
      : `L ${x + tx + tw},${y + h} L ${x + tx + tw},${y + h + tab} L ${x + tx},${y + h + tab} L ${x + tx},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r}`;
    return `M ${x + r},${y} ${topSocket} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} ${botPlug} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  }

  // Hat block (curved top, tab at bottom)
  function hatPath(x: number, y: number, w: number, h: number): string {
    return `M ${x},${y + 12} Q ${x + 2},${y} ${x + 22},${y} L ${x + w - 6},${y} Q ${x + w},${y} ${x + w},${y + 10} L ${x + w},${y + h - 4} Q ${x + w},${y + h} ${x + w - 4},${y + h} L ${x + tx + tw},${y + h} L ${x + tx + tw},${y + h + tab} L ${x + tx},${y + h + tab} L ${x + tx},${y + h} L ${x + 4},${y + h} Q ${x},${y + h} ${x},${y + h - 4} Z`;
  }

  function renderHat(x: number, y: number, w: number, text: string, color: string): string {
    return `<path d="${hatPath(x, y, w, bh + 4)}" fill="${color}" stroke="rgba(0,0,0,0.22)" stroke-width="1"/>
  <text x="${x + pad}" y="${y + bh - 2}" font-size="11" font-weight="bold" fill="white" font-family="system-ui,-apple-system,sans-serif">${text}</text>`;
  }

  function renderBlock(x: number, y: number, w: number, text: string, color: string, noSocket = false, noTab = false): string {
    return `<path d="${blockPath(x, y, w, bh, noSocket, noTab)}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
  <text x="${x + pad}" y="${y + 18}" font-size="10.5" font-weight="bold" fill="white" font-family="system-ui,-apple-system,sans-serif">${text}</text>`;
  }

  // C-block (repeat): has inner cavity
  function renderCBlock(x: number, y: number, w: number, label: string, innerBlocks: string, innerH: number, color: string): string {
    const cavH = innerH + 6;
    const totalH = bh + cavH + bh / 2;
    const cavY = y + bh + tab;
    const capY = y + bh + cavH + tab;
    return `<path d="${blockPath(x, y, w, bh, false, true)}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
  <text x="${x + pad}" y="${y + 18}" font-size="10.5" font-weight="bold" fill="white" font-family="system-ui,-apple-system,sans-serif">${label}</text>
  <rect x="${x + indent}" y="${cavY}" width="${w - indent - 4}" height="${cavH}" rx="2" fill="rgba(0,0,0,0.13)"/>
  ${innerBlocks}
  <path d="M ${x},${capY - 4} Q ${x},${capY} ${x + 4},${capY} L ${x + tx},${capY} L ${x + tx},${capY + tab} L ${x + tx + tw},${capY + tab} L ${x + tx + tw},${capY} L ${x + w - 4},${capY} Q ${x + w},${capY} ${x + w},${capY + 4} L ${x + w},${capY + bh / 2 - 4} Q ${x + w},${capY + bh / 2} ${x + w - 4},${capY + bh / 2} L ${x + 4},${capY + bh / 2} Q ${x},${capY + bh / 2} ${x},${capY + bh / 2 - 4} Z" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>`;
  }

  // ------------------------------------------------------------------
  // Stack 1: Main script (11 lines, using global variable Longueur)
  // ------------------------------------------------------------------
  const s1x = 10;
  const s1w = 190;
  const step = bh + tab; // vertical step between blocks

  const mainLines: Array<{ text: string; color: string; hat?: boolean }> = [
    { text: "quand [▶] est cliqué", color: col.event, hat: true },
    { text: "aller à x: (0) y: (0)", color: col.motion },
    { text: "s'orienter à (90)", color: col.motion },
    { text: "stylo en position d'écriture", color: col.pen },
    { text: "mettre [Longueur] à (200)", color: col.variable },
    { text: "Carré", color: col.custom },
    { text: "Triangle", color: col.custom },
    { text: "aller à x: (300) y: (-100)", color: col.motion },
    { text: "mettre [Longueur] à (100)", color: col.variable },
    { text: "Carré", color: col.custom },
    { text: "Triangle", color: col.custom },
  ];

  let s1svg = "";
  let y1 = 16;
  for (let i = 0; i < mainLines.length; i++) {
    const l = mainLines[i];
    const isLast = i === mainLines.length - 1;
    if (l.hat) {
      s1svg += `\n  ${renderHat(s1x, y1, s1w, l.text, l.color)}`;
      y1 += bh + 4 + tab;
    } else {
      s1svg += `\n  ${renderBlock(s1x, y1, s1w, l.text, l.color, false, isLast)}`;
      y1 += step;
    }
  }

  // ------------------------------------------------------------------
  // Stack 2: Définir Carré (uses Longueur variable)
  // ------------------------------------------------------------------
  const s2x = 220;
  const s2w = 200;
  let y2 = 16;
  const innerW2 = s2w - indent - 8;
  const inner2H = 2 * step;
  const inner2Blocks = `${renderBlock(s2x + indent, y2 + bh + tab + 3, innerW2, "avancer de (Longueur)", col.motion)}
  ${renderBlock(s2x + indent, y2 + bh + tab + 3 + step, innerW2, "tourner ↻ (90) degrés", col.motion, false, true)}`;

  let s2svg = `${renderHat(s2x, y2, s2w, "Définir  Carré", col.custom)}`;
  y2 += bh + 4 + tab;
  s2svg += `\n  ${renderCBlock(s2x, y2, s2w, "répéter (4) fois", inner2Blocks, inner2H, col.control)}`;

  // ------------------------------------------------------------------
  // Stack 3: Définir Triangle (uses Longueur variable)
  // ------------------------------------------------------------------
  const s3x = 440;
  const s3w = 200;
  let y3 = 16;
  const innerW3 = s3w - indent - 8;
  const inner3H = 2 * step;
  const inner3Blocks = `${renderBlock(s3x + indent, y3 + bh + tab + 3, innerW3, "avancer de (Longueur)", col.motion)}
  ${renderBlock(s3x + indent, y3 + bh + tab + 3 + step, innerW3, "tourner ↻ (120) degrés", col.motion, false, true)}`;

  let s3svg = `${renderHat(s3x, y3, s3w, "Définir  Triangle", col.custom)}`;
  y3 += bh + 4 + tab;
  s3svg += `\n  ${renderCBlock(s3x, y3, s3w, "répéter (3) fois", inner3Blocks, inner3H, col.control)}`;

  const totalH = Math.max(y1 + 20, y2 + 160, y3 + 160);
  const totalW = s3x + s3w + 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" font-family="system-ui,-apple-system,sans-serif">
  <rect width="${totalW}" height="${totalH}" fill="#f0f4f8"/>
  <text x="${s1x}" y="11" font-size="9" fill="#94a3b8" font-family="monospace">Script principal</text>
  <text x="${s2x}" y="11" font-size="9" fill="#94a3b8" font-family="monospace">Bloc Carré</text>
  <text x="${s3x}" y="11" font-size="9" fill="#94a3b8" font-family="monospace">Bloc Triangle</text>
  ${s1svg}
  ${s2svg}
  ${s3svg}
</svg>`;
}

/** Exercise 6 — Scratch resulting figure (black/white outlines, no fills, no labels) */
function svgScratchFigure(): string {
  // Triangle height ratio 0.78 matches the visual proportions of the original exam figure
  // (equilateral would be 0.866 but looks too pointy vs the original).
  // Small square = 55% of large square width, centered, same bottom baseline.
  const margin = 50;
  const bsSide = 300;
  const bsL = margin, bsT = margin;
  const bsBot = bsT + bsSide; // 350

  // ── Proportional measurement from original exam figure ──────────────────
  // Method: count how many times each gap fits into the large square side.
  //   top gap  (large square top  → small square top)  fits 3× in H → gap = H/3
  //   side gap (large square side → small square side) fits 6× in W → gap = W/6
  //
  // Derived dimensions (large square = 1 unit):
  //   small square width  = W − 2×(W/6) = 4W/6 = 2W/3
  //   small square height = H − H/3     = 2H/3  (bottom shared with large square)
  // ─────────────────────────────────────────────────────────────────────────
  const triRatio = 0.78; // visual apex height ratio (original shows ~22% from top)

  const bigTriH   = Math.round(triRatio * bsSide);   // 234 → apex ~22% from top
  const bigApexX  = bsL + bsSide / 2;
  const bigApexY  = bsBot - bigTriH;
  const bigTriPts = `${bsL},${bsBot} ${bsL + bsSide},${bsBot} ${bigApexX},${bigApexY}`;

  const ssSide = Math.round((2 / 3) * bsSide);       // 200 = 2W/3
  const ssL    = bsL + Math.round(bsSide / 6);       // 100 = left gap W/6
  const ssT    = bsT + Math.round(bsSide / 3);       // 150 = top gap H/3
  const ssBot  = bsBot;                               // shared bottom

  const smTriH    = Math.round(triRatio * ssSide);   // 156
  const smApexX   = bsL + bsSide / 2;                // 200 (same axis)
  const smApexY   = ssBot - smTriH;                  // 194
  const smTriPts  = `${ssL},${ssBot} ${ssL + ssSide},${ssBot} ${smApexX},${smApexY}`;

  const svgW = bsL + bsSide + margin; // 400
  const svgH = bsBot + margin;        // 400

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="white"/>
  <rect x="${bsL}" y="${bsT}" width="${bsSide}" height="${bsSide}" fill="none" stroke="black" stroke-width="2"/>
  <polygon points="${bigTriPts}" fill="none" stroke="black" stroke-width="2"/>
  <rect x="${ssL}" y="${ssT}" width="${ssSide}" height="${ssSide}" fill="none" stroke="black" stroke-width="2"/>
  <polygon points="${smTriPts}" fill="none" stroke="black" stroke-width="2"/>
</svg>`;
}

/** Exercise 7 — Hand-spinner speed graph */
function svgHandspinnerGraph(): string {
  const svgW = 480;
  const svgH = 340;
  const marginL = 58;
  const marginB = 48;
  const marginR = 22;
  const marginT = 22;
  const plotW = svgW - marginL - marginR;
  const plotH = svgH - marginT - marginB;

  // Data: linear from (0, 20) to (93.5, 0)
  const xMax = 100; // seconds
  const yMax = 25; // tours/s (axis goes to 25 as in original)

  function px(t: number): number {
    return marginL + (t / xMax) * plotW;
  }
  function py(v: number): number {
    return marginT + plotH - (v / yMax) * plotH;
  }

  // Grid lines
  let gridX = "";
  for (let t = 0; t <= 100; t += 10) {
    const x = px(t);
    gridX += `<line x1="${x}" y1="${marginT}" x2="${x}" y2="${marginT + plotH}" stroke="#e5e7eb" stroke-width="1"/>`;
    if (t > 0) {
      gridX += `<text x="${x}" y="${marginT + plotH + 16}" font-size="11" fill="#6b7280" text-anchor="middle">${t}</text>`;
    }
  }

  let gridY = "";
  for (let v = 0; v <= 25; v += 5) {
    const y = py(v);
    gridY += `<line x1="${marginL}" y1="${y}" x2="${marginL + plotW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    gridY += `<text x="${marginL - 8}" y="${y + 4}" font-size="11" fill="#6b7280" text-anchor="end">${v}</text>`;
  }

  // Data line: (0, 20) to (93.5, 0)
  const x0 = px(0);
  const y0 = py(20);
  const x1 = px(93.5);
  const y1 = py(0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="system-ui,-apple-system,sans-serif" stroke-linecap="round" stroke-linejoin="round">
  <rect width="${svgW}" height="${svgH}" fill="white"/>

  <!-- Grid -->
  ${gridX}
  ${gridY}

  <!-- Axes -->
  <line x1="${marginL}" y1="${marginT}" x2="${marginL}" y2="${marginT + plotH}" stroke="#374151" stroke-width="2"/>
  <line x1="${marginL}" y1="${marginT + plotH}" x2="${marginL + plotW}" y2="${marginT + plotH}" stroke="#374151" stroke-width="2"/>

  <!-- Axis arrows -->
  <polyline points="${marginL - 5},${marginT + 8} ${marginL},${marginT} ${marginL + 5},${marginT + 8}" fill="#374151" stroke="#374151" stroke-width="1.5" stroke-linejoin="round"/>
  <polyline points="${marginL + plotW - 8},${marginT + plotH - 5} ${marginL + plotW},${marginT + plotH} ${marginL + plotW - 8},${marginT + plotH + 5}" fill="#374151" stroke="#374151" stroke-width="1.5" stroke-linejoin="round"/>

  <!-- Origin label -->
  <text x="${marginL - 6}" y="${marginT + plotH + 16}" font-size="12" fill="#374151" text-anchor="end">O</text>

  <!-- Axis labels -->
  <text x="${marginL + plotW / 2}" y="${svgH - 4}" font-size="12" fill="#374151" text-anchor="middle">Temps (en s)</text>
  <text x="14" y="${marginT + plotH / 2}" font-size="12" fill="#374151" text-anchor="middle" transform="rotate(-90, 14, ${marginT + plotH / 2})">Vitesse (tours/s)</text>

  <!-- Data line -->
  <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#1d4ed8" stroke-width="2.5"/>

  <!-- Key point dots -->
  <circle cx="${x0}" cy="${y0}" r="4" fill="#1d4ed8"/>
  <circle cx="${x1}" cy="${y1}" r="4" fill="#1d4ed8"/>

  <!-- Key point labels -->
  <text x="${x0 + 6}" y="${y0 - 6}" font-size="11" fill="#1d4ed8">(0 ; 20)</text>
  <text x="${x1 - 44}" y="${y1 - 8}" font-size="11" fill="#1d4ed8">(93,5 ; 0)</text>

  <!-- Dashed reference lines for reading -->
  <!-- v=20 at t=0 horizontal reference -->
  <line x1="${marginL}" y1="${y0}" x2="${x0}" y2="${y0}" stroke="#93c5fd" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- t=80 vertical reference for Q3 -->
  <line x1="${px(80)}" y1="${marginT + plotH}" x2="${px(80)}" y2="${py(20 - (20 / 93.5) * 80)}" stroke="#fca5a5" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${px(80)}" y="${marginT + plotH + 16}" font-size="11" fill="#dc2626" text-anchor="middle">80</text>
  <circle cx="${px(80)}" cy="${py(20 - (20 / 93.5) * 80)}" r="3.5" fill="#dc2626"/>
  <text x="${px(80) + 6}" y="${py(20 - (20 / 93.5) * 80) - 5}" font-size="10" fill="#dc2626">≈ 3</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Hint {
  level: 1 | 2 | 3;
  text: string;
}

interface Guidance {
  hints: Hint[];
  correct_feedback: string;
  incorrect_feedback: string;
}

interface Question {
  id: string;
  label: string;
  prompt: string;
  answer_type: "free_response";
  guidance: Guidance;
}

interface Document {
  id: string;
  type: "image" | "table";
  label: string;
  public_url?: string;
  alt?: string;
  table?: { headers: string[]; rows: string[][] };
  fallback?: boolean;
}

interface TrainingItem {
  id: string;
  source_label: string;
  exam_style: string;
  item_type: string;
  difficulty: string;
  source_year: number;
  status: string;
  context: string;
  prompt: string;
  questions: Question[];
  documents: Document[];
  choices: null;
  expected_answer: null;
}

// ---------------------------------------------------------------------------
// Question helper
// ---------------------------------------------------------------------------

function q(
  id: string,
  prompt: string,
  hint1: string,
  hint2: string,
  hint3: string,
  correctFeedback: string,
  incorrectFeedback: string,
): Question {
  return {
    id,
    label: `${id}.`,
    prompt,
    answer_type: "free_response",
    guidance: {
      hints: [
        { level: 1, text: hint1 },
        { level: 2, text: hint2 },
        { level: 3, text: hint3 },
      ],
      correct_feedback: correctFeedback,
      incorrect_feedback: incorrectFeedback,
    },
  };
}

// ---------------------------------------------------------------------------
// Build exercises
// ---------------------------------------------------------------------------

function buildExercise1(): TrainingItem {
  const exN = 1;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:trophy`),
      type: "image",
      label: "Schéma du trophée",
      public_url: svgDataUri(svgTrophy()),
      alt: "Schéma du trophée : une boule de cristal (diamètre 23 cm) surmontant un cylindre (diamètre 6 cm, hauteur 23 cm). Hauteur totale 46 cm.",
    },
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:table-pm10-lyon`),
      type: "table",
      label: "Statistiques PM10 à Lyon (16–25 janv. 2017)",
      table: {
        headers: ["Statistique", "Valeur (μg/m³)"],
        rows: [
          ["Moyenne", "72,5"],
          ["Médiane", "83,5"],
          ["Minimum", "22"],
          ["Maximum", "107"],
        ],
      },
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "Le biathlète français Martin Fourcade a remporté le sixième gros globe de cristal de sa carrière en 2017 à Pyeongchang en Corée du Sud. La ville de Pyeongchang se trouve à environ 37° de latitude nord et 128° de longitude est. Donner approximativement la latitude et la longitude de Pyeongchang.",
      "La latitude mesure la position nord-sud par rapport à l'équateur (0°).",
      "La longitude mesure la position est-ouest par rapport au méridien de Greenwich.",
      "Lis directement les coordonnées indiquées dans l'énoncé.",
      "Bravo ! Latitude : environ 37° Nord ; Longitude : environ 128° Est.",
      "Relis l'énoncé : les coordonnées sont données directement. Latitude = 37° Nord, Longitude = 128° Est.",
    ),
    q(
      "2",
      "On considère que ce globe est composé d'un cylindre en cristal de diamètre 6 cm, surmonté d'une boule de cristal de diamètre 23 cm (voir schéma). Montrer qu'une valeur approchée du volume de la boule de ce trophée est de 6 371 cm³. Rappel : volume d'une boule de rayon R : V = (4/3)πR³",
      "Le rayon de la boule est la moitié du diamètre.",
      "R = 23/2 = 11,5 cm. Applique la formule V = (4/3)π × R³.",
      "V = (4/3) × π × 11,5³ ≈ (4/3) × 3,14159 × 1520,875 ≈ 6 370,6 cm³.",
      "Parfait ! V = (4/3) × π × 11,5³ ≈ 6 371 cm³.",
      "Vérifie que R = 11,5 cm (moitié du diamètre). Calcule 11,5³ = 1520,875, puis (4/3) × π × 1520,875 ≈ 6 371 cm³.",
    ),
    q(
      "3",
      "Marie affirme que le volume de la boule de cristal représente environ 90 % du volume total du trophée. A-t-elle raison ? Rappels : volume d'une boule de rayon R : V = (4/3)πR³ ; volume d'un cylindre de rayon r et de hauteur h : V = πr²h.",
      "Calcule d'abord le volume du cylindre (r = 3 cm, h = 23 cm).",
      "Volume cylindre = π × 3² × 23 ≈ 651 cm³. Volume total = 6 371 + 651 = 7 022 cm³.",
      "Proportion = 6 371 / 7 022 ≈ 0,907 = 90,7 %.",
      "Excellent ! Volume boule ≈ 6 371 cm³, volume cylindre ≈ 651 cm³, proportion ≈ 90,7 %. Marie a raison.",
      "N'oublie pas de calculer le volume du cylindre (r = 3 cm, h = 23 cm) avant de trouver le volume total.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (11 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Le gros globe de cristal est un trophée attribué au vainqueur de la coupe du monde de ski. Ce trophée pèse 9 kg et mesure 46 cm de hauteur.",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

function buildExercise2(): TrainingItem {
  const exN = 2;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:table-lyon`),
      type: "table",
      label: "Statistiques PM10 à Lyon (16–25 janv. 2017)",
      table: {
        headers: ["Statistique", "Valeur (μg/m³)"],
        rows: [
          ["Moyenne", "72,5"],
          ["Médiane", "83,5"],
          ["Minimum", "22"],
          ["Maximum", "107"],
        ],
      },
    },
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:table-grenoble`),
      type: "table",
      label: "Relevés PM10 à Grenoble (16–25 janv. 2017)",
      table: {
        headers: ["Date", "Concentration PM10 (μg/m³)"],
        rows: [
          ["16 janvier", "32"],
          ["17 janvier", "39"],
          ["18 janvier", "52"],
          ["19 janvier", "57"],
          ["20 janvier", "78"],
          ["21 janvier", "63"],
          ["22 janvier", "60"],
          ["23 janvier", "82"],
          ["24 janvier", "82"],
          ["25 janvier", "89"],
        ],
      },
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "Laquelle de ces deux villes a eu la plus forte concentration moyenne en PM10 entre le 16 et le 25 janvier ?",
      "La moyenne de Lyon est donnée dans le tableau. Pour Grenoble, additionne toutes les valeurs et divise par 10.",
      "Somme Grenoble = 32+39+52+57+78+63+60+82+82+89 = 634. Moyenne Grenoble = 634 ÷ 10 = 63,4 μg/m³.",
      "Compare : Grenoble = 63,4 μg/m³ et Lyon = 72,5 μg/m³.",
      "Correct ! Moyenne Grenoble = 63,4 μg/m³ < Moyenne Lyon = 72,5 μg/m³. Lyon a eu la plus forte concentration moyenne.",
      "Calcule la somme des 10 valeurs de Grenoble (634), divise par 10 (63,4), puis compare à Lyon (72,5).",
    ),
    q(
      "2",
      "Calculer l'étendue des séries des relevés en PM10 à Lyon et à Grenoble. Laquelle de ces deux villes a eu l'étendue la plus importante ? Interpréter ce dernier résultat.",
      "L'étendue = valeur maximale − valeur minimale.",
      "Étendue Lyon = 107 − 22 = 85 μg/m³. Pour Grenoble : max = 89, min = 32.",
      "Étendue Grenoble = 89 − 32 = 57 μg/m³. Compare les deux étendues.",
      "Bravo ! Étendue Lyon = 85 μg/m³ > Étendue Grenoble = 57 μg/m³. Les concentrations à Lyon ont été plus dispersées (plus irrégulières).",
      "Rappel : étendue = max − min. Pour Lyon : 107 − 22 = 85. Pour Grenoble : 89 − 32 = 57.",
    ),
    q(
      "3",
      "L'affirmation suivante est-elle exacte ? Justifier votre réponse. « Du 16 au 25 janvier, le seuil d'alerte de 80 μg/m³ par jour a été dépassé au moins 5 fois à Lyon ».",
      "La médiane de Lyon est 83,5 μg/m³, ce qui signifie que 5 valeurs sur 10 sont ≥ 83,5 μg/m³.",
      "Si la médiane est 83,5, alors au moins 5 des 10 valeurs dépassent 80 μg/m³.",
      "Médiane = 83,5 > 80, donc par définition de la médiane, au moins 5 jours sur 10 ont une valeur ≥ 83,5 > 80.",
      "Exact ! La médiane est 83,5 μg/m³ > 80 μg/m³, donc au moins 5 jours ont dépassé le seuil. L'affirmation est vraie.",
      "La médiane (83,5) signifie que la moitié des valeurs (≥ 5) sont au-dessus de 83,5, donc au-dessus de 80.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (14 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Parmi les nombreux polluants de l'air, les particules fines sont régulièrement surveillées. Les PM10 sont des particules fines dont le diamètre est inférieur à 0,01 mm. En janvier 2017, les villes de Lyon et Grenoble ont connu un épisode de pollution aux particules fines. Voici des données concernant les concentrations journalières en PM10 (en μg/m³).",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

function buildExercise3(): TrainingItem {
  const exN = 3;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const questions: Question[] = [
    q(
      "1",
      "Quelle est la probabilité qu'il écoute du rap ?",
      "Probabilité = nombre de cas favorables / nombre de cas possibles.",
      "Nombre de morceaux de rap = 125. Nombre total = 375.",
      "P(rap) = 125/375. Simplifie cette fraction.",
      "Parfait ! P(rap) = 125/375 = 1/3.",
      "La probabilité se calcule : nombre de morceaux de rap / nombre total = 125/375 = 1/3.",
    ),
    q(
      "2",
      "La probabilité qu'il écoute du rock est égale à 7/15. Combien Théo a-t-il de morceaux de rock dans son lecteur audio ?",
      "Nombre de morceaux = probabilité × total = 7/15 × 375.",
      "7/15 × 375 = 7 × 25 = 175.",
      "375 ÷ 15 = 25, puis 25 × 7 = 175 morceaux de rock.",
      "Exact ! Nombre de morceaux de rock = 7/15 × 375 = 175 morceaux.",
      "Multiplie la probabilité par le total : 7/15 × 375 = 175 morceaux de rock.",
    ),
    q(
      "3",
      "Alice possède 40 morceaux de rock sur 48 morceaux au total. Si Théo et Alice appuient tous les deux sur la touche « lecture aléatoire » de leur lecteur audio, lequel a le plus de chances d'écouter un morceau de rock ?",
      "Calcule la probabilité d'écouter du rock pour chacun, puis compare.",
      "P(rock Alice) = 40/48 = 5/6 ≈ 0,833. P(rock Théo) = 175/375 = 7/15 ≈ 0,467.",
      "Compare 5/6 ≈ 0,833 et 7/15 ≈ 0,467.",
      "Très bien ! P(rock Alice) ≈ 0,833 > P(rock Théo) ≈ 0,467. Alice a plus de chances d'écouter du rock.",
      "Calcule P(Alice) = 40/48 = 5/6 et P(Théo) = 7/15. Compare les deux fractions : 5/6 > 7/15.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (12 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Dans son lecteur audio, Théo a téléchargé 375 morceaux de musique. Parmi eux, il y a 125 morceaux de rap. Il appuie sur la touche « lecture aléatoire » qui lui permet d'écouter un morceau choisi au hasard parmi tous les morceaux disponibles.",
    prompt: "",
    questions,
    documents: [],
    choices: null,
    expected_answer: null,
  };
}

function buildExercise4(): TrainingItem {
  const exN = 4;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:geo`),
      type: "image",
      label: "Figure géométrique – triangles ABCDEF",
      public_url: svgDataUri(svgGeometryFigure()),
      alt: "Figure géométrique avec triangles ABC (rectangle en A), BDC (rectangle en B), BFE (rectangle en F). Points C, B, E alignés. CB=7,5 cm, BE=6,8 cm, BF=6 cm, FE=3,2 cm, DC=8,5 cm, angle ACB=61°.",
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "Montrer que la longueur BD est égale à 4 cm.",
      "Applique le théorème de Pythagore dans le triangle BDC rectangle en B.",
      "DC est l'hypoténuse : DC² = BD² + BC². Cherche BD.",
      "BD² = DC² − BC² = 8,5² − 7,5² = 72,25 − 56,25 = 16. Donc BD = 4 cm.",
      "Excellent ! BD² = 8,5² − 7,5² = 72,25 − 56,25 = 16, donc BD = √16 = 4 cm.",
      "Dans le triangle BDC rectangle en B : DC² = BD² + BC². Donc BD² = 8,5² − 7,5² = 16, BD = 4 cm.",
    ),
    q(
      "2",
      "Montrer que les triangles CBD et BFE sont semblables.",
      "Deux triangles sont semblables si leurs côtés sont proportionnels.",
      "Calcule les rapports CB/BF, BD/FE, DC/BE.",
      "CB/BF = 7,5/6 = 1,25 ; BD/FE = 4/3,2 = 1,25 ; DC/BE = 8,5/6,8 = 1,25. Les trois rapports sont égaux.",
      "Parfait ! Les trois rapports de côtés sont tous égaux à 1,25, donc les triangles CBD et BFE sont semblables.",
      "Calcule CB/BF = 7,5/6, BD/FE = 4/3,2, DC/BE = 8,5/6,8 et vérifie qu'ils sont tous égaux à 1,25.",
    ),
    q(
      "3",
      "Sophie affirme que l'angle ∠ABD est un angle droit. A-t-elle raison ?",
      "Calcule d'abord l'angle ABC dans le triangle ABC rectangle en A.",
      "Angle ABC = 90° − angle ACB = 90° − 61° = 29°.",
      "BD est perpendiculaire à BC (angle droit en B dans BDC), donc angle ABD = 90° − 29° = 61°.",
      "Bien raisonné ! angle ABD = 61° ≠ 90°. Sophie a tort.",
      "angle ABC = 29° (complémentaire de 61°). BD ⊥ BC, donc angle ABD = 90° − 29° = 61°. Sophie a tort.",
    ),
    q(
      "4",
      "Max affirme que l'angle ∠ABF est un angle droit. A-t-il raison ?",
      "Utilise la similitude des triangles CBD et BFE pour trouver les angles.",
      "Si les triangles sont semblables, les angles correspondants sont égaux. Quel angle dans CBD correspond à l'angle FBE dans BFE ?",
      "angle FBE = angle DCB (triangles semblables). angle FBE = 90° − angle FEB. angle ABF = angle ABE − angle FBE = (180° − 29°) − angle FBE. Vérifie si angle ABF = 90°.",
      "Très bien ! Par la similitude, les angles se correspondent. Max a raison : angle ABF = 90°.",
      "Les triangles semblables ont des angles correspondants égaux. Utilise les angles de CBD pour trouver ceux de BFE, puis calcule angle ABF.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (14 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "La figure ci-dessous n'est pas représentée en vraie grandeur. Les points C, B et E sont alignés. Le triangle ABC est rectangle en A. Le triangle BDC est rectangle en B. On donne : CB = 7,5 cm, BE = 6,8 cm, BF = 6 cm, FE = 3,2 cm, DC = 8,5 cm et l'angle ACB = 61°.",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

function buildExercise5(): TrainingItem {
  const exN = 5;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:flowchart`),
      type: "image",
      label: "Programme de calcul",
      public_url: svgDataUri(svgFlowchart()),
      alt: "Programme de calcul : Choisir un nombre → Multiplier par 4 → Ajouter 8 → Multiplier le résultat par 2 → Résultat",
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "Vérifier que si on choisit le nombre −1, ce programme donne 8 comme résultat final.",
      "Applique chaque étape du programme en partant de −1.",
      "−1 × 4 = −4 ; −4 + 8 = 4 ; 4 × 2 = ?",
      "4 × 2 = 8. Le résultat est bien 8.",
      "Parfait ! −1 × 4 = −4 ; −4 + 8 = 4 ; 4 × 2 = 8. Vérifié !",
      "Suis les étapes : −1 × 4 = −4, puis −4 + 8 = 4, puis 4 × 2 = 8.",
    ),
    q(
      "2",
      "Le programme donne 30 comme résultat final. Quel est le nombre choisi au départ ?",
      "Remonte les étapes en ordre inverse : divise par 2, soustrait 8, divise par 4.",
      "30 ÷ 2 = 15 ; 15 − 8 = 7 ; 7 ÷ 4 = ?",
      "7 ÷ 4 = 1,75. Le nombre choisi au départ est 1,75.",
      "Excellent ! 30 ÷ 2 = 15 ; 15 − 8 = 7 ; 7 ÷ 4 = 1,75.",
      "Remonte : résultat ÷ 2 = 15, puis −8 = 7, puis ÷ 4 = 1,75.",
    ),
    q(
      "3",
      "L'expression A = 2(4x + 8) donne le résultat du programme pour un nombre x. On pose B = (4 + x)² − x². Prouver que A = B pour toutes les valeurs de x.",
      "Développe A en utilisant la distributivité.",
      "Développe B en utilisant l'identité (a+b)² = a² + 2ab + b².",
      "A = 8x + 16. B = 16 + 8x + x² − x² = 8x + 16. Donc A = B.",
      "Bravo ! A = 2(4x+8) = 8x+16. B = (4+x)² − x² = 16+8x+x²−x² = 8x+16. A = B.",
      "Développe : A = 2×4x + 2×8 = 8x+16. B = 4²+2×4×x+x²−x² = 16+8x. Donc A = B.",
    ),
    q(
      "4",
      "Pour chacune des affirmations suivantes, indiquer si elle est vraie ou fausse en justifiant.\nAffirmation 1 : Ce programme donne un résultat positif pour toutes les valeurs de x.\nAffirmation 2 : Si le nombre x choisi est un entier, le résultat obtenu est un multiple de 8.",
      "Pour l'affirmation 1, cherche une valeur de x qui donne un résultat négatif.",
      "Pour l'affirmation 2, factorise l'expression A = 8x + 16.",
      "Aff. 1 : Fausse — pour x = −3, A = 8×(−3)+16 = −8 < 0. Aff. 2 : Vraie — A = 8(x+2), multiple de 8 si x entier.",
      "Parfait ! Aff. 1 : Fausse (x = −3 donne −8). Aff. 2 : Vraie car A = 8(x+2) est toujours un multiple de 8 pour x entier.",
      "Aff. 1 : essaie x = −3. Aff. 2 : A = 8x+16 = 8(x+2) — est-ce un multiple de 8 ?",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (16 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Voici un programme de calcul :\n• Choisir un nombre\n• Multiplier ce nombre par 4\n• Ajouter 8\n• Multiplier le résultat par 2",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

function buildExercise6(): TrainingItem {
  const exN = 6;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:scratch-program`),
      type: "image",
      label: "Programme Scratch",
      public_url: svgDataUri(svgScratchProgram()),
      alt: "Programme Scratch en 10 lignes. Ligne 1 : Quand 🚩 cliqué. Ligne 2 : aller à x:0 y:0. Ligne 3 : s'orienter à 90. Ligne 4 : stylo en position d'écriture. Ligne 5 : Carré(200). Ligne 6 : aller à x:200 y:0. Ligne 7 : Triangle(200). Ligne 8 : aller à x:300 y:-100. Ligne 9 : Carré(100). Ligne 10 : Triangle(100). Bloc Carré : répéter 4 [avancer Longueur, tourner 90°]. Bloc Triangle : répéter 3 [avancer Longueur, tourner 120°].",
    },
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:scratch-figure`),
      type: "image",
      label: "Figure obtenue par le programme Scratch",
      public_url: svgDataUri(svgScratchFigure()),
      alt: "Figure composée d'un grand carré (côté 4 cm) avec un triangle équilatéral à sa droite, et d'un petit carré (côté 2 cm) avec un triangle, avec un axe de symétrie vertical.",
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "On prend comme échelle 1 cm pour 50 pixels. Quelle est la longueur en cm du côté du grand carré dessiné par le programme ?",
      "Divise le nombre de pixels par 50 pour obtenir la longueur en cm.",
      "Le grand carré a un côté de 200 pixels. 200 ÷ 50 = ?",
      "200 ÷ 50 = 4 cm.",
      "Correct ! Le grand carré a un côté de 200 pixels. À l'échelle : 200 ÷ 50 = 4 cm.",
      "Longueur (cm) = pixels ÷ 50 = 200 ÷ 50 = 4 cm.",
    ),
    q(
      "2",
      "Représenter sur votre copie la figure obtenue si le programme est exécuté jusqu'à la ligne 7 comprise.",
      "Les lignes 5 à 7 dessinent le Carré(200) puis le Triangle(200).",
      "Le carré commence en (0,0) et a un côté de 200 pixels. Le triangle équilatéral commence là où le carré s'est terminé.",
      "Un grand carré de côté 200 px (4 cm) et un triangle équilatéral de côté 200 px (4 cm) attaché à sa droite.",
      "Très bien ! La figure jusqu'à la ligne 7 : un grand carré (4 cm) avec un triangle équilatéral (côté 4 cm) à droite.",
      "La ligne 5 dessine le Carré(200) et la ligne 7 dessine le Triangle(200) en partant de x:200, y:0.",
    ),
    q(
      "3",
      "Quelles sont les coordonnées du stylo après l'exécution de la ligne 8 ?",
      "La ligne 8 est une instruction 'aller à'. Lis directement les coordonnées.",
      "Ligne 8 : aller à x: 300  y: -100.",
      "Après la ligne 8, le stylo est exactement en (300 ; −100).",
      "Exact ! Après la ligne 8 (aller à x:300 y:−100), le stylo est aux coordonnées (300 ; −100).",
      "Relis la ligne 8 du programme : 'aller à x:300 y:−100'. Le stylo va directement à ces coordonnées.",
    ),
    q(
      "4",
      "Parmi les transformations suivantes : translation, homothétie, rotation, symétrie axiale — quelle transformation géométrique permet d'obtenir le petit carré à partir du grand carré ? Préciser le rapport de réduction.",
      "Compare les longueurs des côtés des deux carrés.",
      "Grand carré : côté 200 px (4 cm). Petit carré : côté 100 px (2 cm). Rapport = ?",
      "Rapport = 100/200 = 1/2. Une homothétie de rapport 1/2 transforme le grand carré en petit carré.",
      "Parfait ! C'est une homothétie de rapport 1/2 (le petit carré a un côté de 2 cm contre 4 cm pour le grand).",
      "Le petit carré a un côté moitié moins grand que le grand. C'est une homothétie de rapport 1/2.",
    ),
    q(
      "5",
      "Quel est le rapport des aires entre les deux carrés dessinés ?",
      "L'aire d'un carré = côté². Le rapport des aires = (rapport des côtés)².",
      "Aire grand carré = 4² = 16 cm². Aire petit carré = 2² = 4 cm².",
      "Rapport = 16/4 = 4. Le rapport des côtés est 1/2, donc le rapport des aires est (1/2)² = 1/4 (ou 4 si grand/petit).",
      "Excellent ! Aire grand = 16 cm², aire petit = 4 cm². Rapport grand/petit = 16/4 = 4.",
      "Calcule les aires : 4² = 16 cm² et 2² = 4 cm². Rapport = 16/4 = 4.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (16 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Les longueurs sont en pixels. L'expression « s'orienter à 90 » signifie que l'on s'oriente vers la droite. On prend comme échelle 1 cm pour 50 pixels. Le programme suivant utilise deux blocs personnalisés :\n— Carré(Longueur) : répéter 4 fois [avancer de Longueur, tourner à droite de 90°]\n— Triangle(Longueur) : répéter 3 fois [avancer de Longueur, tourner à droite de 120°]",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

function buildExercise7(): TrainingItem {
  const exN = 7;
  const id = deterministicUuid(`svg-dnb-2018:ex${exN}`);

  const docs: Document[] = [
    {
      id: deterministicUuid(`svg-dnb-2018:ex${exN}:doc:graph`),
      type: "image",
      label: "Graphique : vitesse de rotation du hand-spinner",
      public_url: svgDataUri(svgHandspinnerGraph()),
      alt: "Graphique représentant la vitesse de rotation du hand-spinner (en tours/seconde) en fonction du temps (en secondes). Décroissance linéaire de v=20 tours/s à t=0 jusqu'à v=0 à t≈94 s.",
    },
  ];

  const questions: Question[] = [
    q(
      "1",
      "Le temps et la vitesse de rotation du « hand-spinner » sont-ils proportionnels ? Justifier.",
      "Pour deux grandeurs proportionnelles, leur rapport doit être constant et le graphique doit passer par l'origine.",
      "À t = 0, v = 20 ≠ 0. La droite ne passe pas par l'origine O.",
      "Deux grandeurs proportionnelles donnent un graphique passant par (0 ; 0). Ce n'est pas le cas ici.",
      "Correct ! Non, ils ne sont pas proportionnels : à t=0, v=20 ≠ 0. La droite ne passe pas par l'origine.",
      "Vérifie si la droite passe par l'origine. À t=0, v=20 ≠ 0, donc non proportionnels.",
    ),
    q(
      "2",
      "Par lecture graphique : quelle est la vitesse de rotation initiale (à t = 0) ?",
      "Lis la valeur de v à l'intersection avec l'axe des ordonnées (t = 0).",
      "Sur le graphique, repère le point où la droite coupe l'axe vertical.",
      "La droite coupe l'axe des ordonnées en v = 20 tours/s.",
      "Exact ! À t = 0 s, la vitesse de rotation initiale est v = 20 tours par seconde.",
      "À t = 0, lis la valeur sur l'axe vertical (axe des v). La droite commence à v = 20.",
    ),
    q(
      "3",
      "Par lecture graphique : quelle est la vitesse de rotation au bout d'une minute et vingt secondes ?",
      "Convertis 1 min 20 s en secondes : 60 + 20 = 80 s. Lis la valeur de v pour t = 80 s.",
      "Sur le graphique, repère t = 80 s sur l'axe horizontal et lis la valeur de v correspondante.",
      "À t = 80 s, la droite donne une valeur d'environ v ≈ 3 tours/s.",
      "Très bien ! 1 min 20 s = 80 s. D'après le graphique, à t = 80 s, v ≈ 3 tours/s.",
      "1 minute et 20 secondes = 80 secondes. Lis la valeur de v à t = 80 s sur le graphique.",
    ),
    q(
      "4",
      "Par lecture graphique : au bout de combien de temps le « hand-spinner » va-t-il s'arrêter ?",
      "Cherche la valeur de t pour laquelle la droite coupe l'axe des abscisses (v = 0).",
      "Sur le graphique, repère où la droite atteint v = 0.",
      "La droite coupe l'axe des abscisses vers t ≈ 94 s.",
      "Correct ! D'après le graphique, le hand-spinner s'arrête à t ≈ 94 s (environ 94 secondes).",
      "Cherche le point où la ligne touche l'axe horizontal (v = 0). C'est vers t ≈ 94 s.",
    ),
    q(
      "5",
      "Pour calculer la vitesse, on utilise V(t) = −0,214 × t + V₀. On lance le hand-spinner à une vitesse initiale de 20 tours/s. Calculer sa vitesse au bout de 30 s.",
      "Remplace t par 30 dans la formule V(t) = −0,214 × t + 20.",
      "V(30) = −0,214 × 30 + 20 = ? + 20.",
      "−0,214 × 30 = −6,42. Donc V(30) = −6,42 + 20 = 13,58 tours/s.",
      "Excellent ! V(30) = −0,214 × 30 + 20 = −6,42 + 20 = 13,58 tours/s.",
      "Remplace t = 30 : V(30) = −0,214 × 30 + 20 = −6,42 + 20 = 13,58 tours/s.",
    ),
    q(
      "6",
      "En utilisant la formule V(t) = −0,214 × t + 20, calculer au bout de combien de temps le hand-spinner va-t-il s'arrêter.",
      "Pose V(t) = 0 et résous l'équation pour t.",
      "−0,214 × t + 20 = 0. Donc 0,214 × t = 20. Donc t = ?",
      "t = 20 / 0,214 ≈ 93,5 s.",
      "Parfait ! V(t) = 0 ⟹ t = 20 / 0,214 ≈ 93,5 s.",
      "V(t) = 0 : −0,214t + 20 = 0, donc t = 20 ÷ 0,214 ≈ 93,5 s.",
    ),
    q(
      "7",
      "Est-il vrai que, d'une manière générale, si l'on fait tourner le hand-spinner deux fois plus vite au départ, il tournera deux fois plus longtemps ? Justifier.",
      "Avec V₀ quelconque : V(t) = 0 ⟹ t = V₀ / 0,214. Que se passe-t-il si V₀ est remplacé par 2V₀ ?",
      "Durée d'arrêt = V₀ / 0,214. Si V₀ double, t double aussi.",
      "t(V₀) = V₀/0,214. t(2V₀) = 2V₀/0,214 = 2 × t(V₀). Oui, c'est vrai.",
      "Très bien raisonné ! Si V₀ double, la durée t = V₀/0,214 double également. L'affirmation est vraie.",
      "Durée = V₀ / 0,214. Si on double V₀, on double aussi la durée. C'est vrai.",
    ),
  ];

  return {
    id,
    source_label: `DNB Métropole La Réunion 2018 - Exercice ${exN} (17 points)`,
    exam_style: "dnb_annales",
    item_type: "free_response",
    difficulty: "hard",
    source_year: 2018,
    status: "published",
    context:
      "Le « hand-spinner » est une sorte de toupie plate qui tourne sur elle-même. On donne au « hand-spinner » une vitesse de rotation initiale au temps t = 0, puis sa vitesse de rotation diminue jusqu'à l'arrêt complet. Le graphique ci-dessous représente la vitesse de rotation v (en tours par seconde) en fonction du temps t (en secondes).",
    prompt: "",
    questions,
    documents: docs,
    choices: null,
    expected_answer: null,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  // Parse --out argument
  const args = process.argv.slice(2);
  let outPath = "exam-import/bundles/dnb-2018-metropole-svg-items.json";
  const outIdx = args.indexOf("--out");
  if (outIdx !== -1 && args[outIdx + 1]) {
    outPath = args[outIdx + 1];
  }

  // Resolve relative to CWD
  const resolvedOut = resolve(process.cwd(), outPath);

  // Build all training items
  const trainingItems: TrainingItem[] = [
    buildExercise1(),
    buildExercise2(),
    buildExercise3(),
    buildExercise4(),
    buildExercise5(),
    buildExercise6(),
    buildExercise7(),
  ];

  const output = { training_items: trainingItems };

  // Write output
  await mkdir(dirname(resolvedOut), { recursive: true });
  await writeFile(resolvedOut, JSON.stringify(output, null, 2), "utf-8");

  console.log(`✓ Written ${trainingItems.length} training items to: ${resolvedOut}`);
  console.log(`  Total size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
  console.log("");
  console.log("  Exercises:");
  for (const item of trainingItems) {
    console.log(
      `  - ${item.source_label}: ${item.questions.length} questions, ${item.documents.length} documents`,
    );
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
