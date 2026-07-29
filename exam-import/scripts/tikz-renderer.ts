/**
 * tikz-renderer.ts
 *
 * Compile LaTeX diagram blocks (PSTricks, Scratch3, TikZ) to PNG images.
 * Used by parse-latex-exam.ts to render embedded diagrams from exam ZIP archives.
 */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LATEX_PATH = "/Library/TeX/texbin/latex";
const LUALATEX_PATH = "/Library/TeX/texbin/lualatex";
const DVIPS_PATH = "/Library/TeX/texbin/dvips";
const PS2PDF_PATH = "/opt/homebrew/bin/ps2pdf";
const PDFTOPPM_PATH = "/opt/homebrew/bin/pdftoppm";
const CWEBP_PATH = "cwebp";

/**
 * Compile a PSTricks `\begin{pspicture}...\end{pspicture}` block to PNG.
 * Uses the latex → dvips → ps2pdf → pdftoppm pipeline.
 *
 * @param pspictureCode  The raw pspicture block (just the environment, no wrapping)
 * @param outDir         Directory to save the output PNG/WebP
 * @param id             Short identifier used as filename (no spaces)
 * @param extraPackages  Additional \usepackage or \newcommand lines to inject
 * @returns Path to the output image, or null on failure
 */
export async function compilePsTricksToPng(
  pspictureCode: string,
  outDir: string,
  id: string,
  extraPackages = "",
): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `pstricks-${id.slice(0, 16)}-`));
  try {
    const tex = buildPsTricksDocument(pspictureCode, extraPackages);
    const texPath = join(workDir, "diagram.tex");
    await writeFile(texPath, tex, "utf8");

    // Step 1: latex → dvi
    await execFileAsync(
      LATEX_PATH,
      ["-interaction=nonstopmode", "-output-directory", workDir, texPath],
      { timeout: 30_000, cwd: workDir },
    );

    const dviPath = join(workDir, "diagram.dvi");

    // Step 2: dvips → ps
    const psPath = join(workDir, "diagram.ps");
    await execFileAsync(DVIPS_PATH, ["-o", psPath, dviPath], { timeout: 20_000, cwd: workDir });

    // Step 3: ps2pdf → pdf
    const pdfPath = join(workDir, "diagram.pdf");
    await execFileAsync(PS2PDF_PATH, [psPath, pdfPath], { timeout: 20_000, cwd: workDir });

    // Step 4: pdftoppm → png
    const pngPrefix = join(workDir, "out");
    await execFileAsync(
      PDFTOPPM_PATH,
      ["-png", "-r", "120", "-singlefile", pdfPath, pngPrefix],
      { timeout: 20_000, cwd: workDir },
    );

    const pngPath = `${pngPrefix}.png`;
    await mkdir(outDir, { recursive: true });

    // Try WebP output
    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      // Fallback to PNG
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr ?? "";
    // Read the latex log file for full error context
    let logSnippet = "";
    try {
      const logContent = await readFile(join(workDir, "diagram.log"), "utf8");
      const errLine = logContent.split("\n").find(l => l.startsWith("!") || l.includes("Error"));
      if (errLine) logSnippet = `\n    log: ${errLine.slice(0, 200)}`;
    } catch { /* no log */ }
    console.warn(`  [pstricks] Render failed (${id}): ${msg.slice(0, 300)}${logSnippet}${stderr ? `\n    stderr: ${stderr.slice(-300)}` : ""}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Compile a `\begin{scratch}...\end{scratch}` block to PNG using lualatex.
 * Requires the `scratch3` LaTeX package.
 *
 * @param scratchCode  The raw scratch block
 * @param outDir       Directory to save the output image
 * @param id           Short identifier used as filename
 * @returns Path to the output image, or null on failure
 */
export async function compileScratch3ToPng(
  scratchCode: string,
  outDir: string,
  id: string,
): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `scratch3-${id.slice(0, 16)}-`));
  try {
    const tex = buildScratch3Document(scratchCode);
    const texPath = join(workDir, "diagram.tex");
    await writeFile(texPath, tex, "utf8");

    // lualatex → pdf
    await execFileAsync(
      LUALATEX_PATH,
      ["-interaction=nonstopmode", "-output-directory", workDir, texPath],
      { timeout: 60_000, cwd: workDir },
    );

    const pdfPath = join(workDir, "diagram.pdf");
    const pngPrefix = join(workDir, "out");

    await execFileAsync(
      PDFTOPPM_PATH,
      ["-png", "-r", "120", "-singlefile", pdfPath, pngPrefix],
      { timeout: 20_000, cwd: workDir },
    );

    const pngPath = `${pngPrefix}.png`;
    await mkdir(outDir, { recursive: true });

    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    console.warn(`  [scratch3] Render failed (${id}): ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Compile a TikZ `\begin{tikzpicture}...\end{tikzpicture}` block to PNG using lualatex.
 *
 * @param tikzCode   The raw tikzpicture block
 * @param outDir     Directory to save the output image
 * @param id         Short identifier used as filename
 * @param preamble   Additional preamble lines (e.g. \usetikzlibrary{...})
 * @returns Path to the output image, or null on failure
 */
export async function compileTikzToPng(
  tikzCode: string,
  outDir: string,
  id: string,
  preamble = "",
): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `tikz-${id.slice(0, 16)}-`));
  try {
    const tex = buildTikzDocument(tikzCode, preamble);
    const texPath = join(workDir, "diagram.tex");
    await writeFile(texPath, tex, "utf8");

    await execFileAsync(
      LUALATEX_PATH,
      ["-interaction=nonstopmode", "-output-directory", workDir, texPath],
      { timeout: 60_000, cwd: workDir },
    );

    const pdfPath = join(workDir, "diagram.pdf");
    const pngPrefix = join(workDir, "out");

    await execFileAsync(
      PDFTOPPM_PATH,
      ["-png", "-r", "120", "-singlefile", pdfPath, pngPrefix],
      { timeout: 20_000, cwd: workDir },
    );

    const pngPath = `${pngPrefix}.png`;
    await mkdir(outDir, { recursive: true });

    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    console.warn(`  [tikz] Render failed (${id}): ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Render an EPS file via a standalone LaTeX document, scaled to a target width.
 * Uses the latex → dvips → ps2pdf → pdftoppm pipeline, same as PSTricks.
 *
 * @param epsPath      Absolute path to the .eps file
 * @param targetWidthCm  Desired output width in cm (from \includegraphics[width=Xcm])
 * @param outDir       Directory to save the output image
 * @param id           Short identifier used as filename
 * @returns Path to the output image, or null on failure
 */
export async function compileEpsViaLatex(
  epsPath: string,
  targetWidthCm: number,
  outDir: string,
  id: string,
): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `eps-latex-${id.slice(0, 14)}-`));
  try {
    const tex = `\\documentclass[border=4pt]{standalone}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\begin{document}
\\includegraphics[width=${targetWidthCm}cm]{${epsPath}}
\\end{document}
`;
    const texPath = join(workDir, "diagram.tex");
    await writeFile(texPath, tex, "utf8");

    // latex → dvi
    await execFileAsync(
      LATEX_PATH,
      ["-interaction=nonstopmode", "-output-directory", workDir, texPath],
      { timeout: 30_000, cwd: workDir },
    );

    const dviPath = join(workDir, "diagram.dvi");

    // dvips → ps
    const psPath = join(workDir, "diagram.ps");
    await execFileAsync(DVIPS_PATH, ["-o", psPath, dviPath], { timeout: 20_000, cwd: workDir });

    // ps2pdf → pdf
    const pdfPath = join(workDir, "diagram.pdf");
    await execFileAsync(PS2PDF_PATH, [psPath, pdfPath], { timeout: 20_000, cwd: workDir });

    // pdftoppm → png at 120 DPI
    const pngPrefix = join(workDir, "out");
    await execFileAsync(
      PDFTOPPM_PATH,
      ["-png", "-r", "120", "-singlefile", pdfPath, pngPrefix],
      { timeout: 20_000, cwd: workDir },
    );

    const pngPath = `${pngPrefix}.png`;
    await mkdir(outDir, { recursive: true });

    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr ?? "";
    let logSnippet = "";
    try {
      const logContent = await readFile(join(workDir, "diagram.log"), "utf8");
      const errLine = logContent.split("\n").find(l => l.startsWith("!") || l.includes("Error"));
      if (errLine) logSnippet = `\n    log: ${errLine.slice(0, 200)}`;
    } catch { /* no log */ }
    console.warn(`  [eps-latex] Render failed (${id}): ${msg.slice(0, 300)}${logSnippet}${stderr ? `\n    stderr: ${stderr.slice(-300)}` : ""}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

// ─── Document builders ────────────────────────────────────────────────────────

/**
 * Expand pspicture bounding boxes by `margin` units so that \uput labels
 * placed at the circle/polygon edge are not clipped by the standalone crop.
 */
function expandPspictureBounds(code: string, margin = 0.6): string {
  return code.replace(
    /\\begin\{(pspicture\*?)\}((?:\(-?[\d.]+,-?[\d.]+\))+)/g,
    (_full, env: string, coords: string) => {
      const pairs = [...coords.matchAll(/\((-?[\d.]+),(-?[\d.]+)\)/g)]
        .map(m => [parseFloat(m[1] ?? "0"), parseFloat(m[2] ?? "0")] as [number, number]);
      if (pairs.length === 1) {
        const [x2, y2] = pairs[0];
        return `\\begin{${env}}(${-margin},${-margin})(${+(x2 + margin).toFixed(3)},${+(y2 + margin).toFixed(3)})`;
      }
      if (pairs.length === 2) {
        const [x1, y1] = pairs[0];
        const [x2, y2] = pairs[1];
        return `\\begin{${env}}(${+(x1 - margin).toFixed(3)},${+(y1 - margin).toFixed(3)})(${+(x2 + margin).toFixed(3)},${+(y2 + margin).toFixed(3)})`;
      }
      return _full;
    },
  );
}

/**
 * Strip greyscale print options from \setscratch so blocks render in full color
 * for the digital app (the original exam sets fill gray=0.9 and print for B&W printing).
 */
function stripScratchGrayscale(code: string): string {
  return code
    .replace(/,?\s*fill\s+gray\s*=\s*[\d.]+/g, "")  // remove fill gray=X
    .replace(/,?\s*\bprint\b/g, "")                   // remove print option
    .replace(/,\s*,/g, ",")                            // clean up double commas
    .replace(/\{,\s*/g, "{")                           // clean up leading comma in braces
    .replace(/,\s*\}/g, "}");                          // clean up trailing comma in braces
}

function buildPsTricksDocument(pspictureCode: string, extraPackages = ""): string {
  // Expand pspicture bounding boxes so labels at the diagram edge are not clipped
  const expandedCode = expandPspictureBounds(pspictureCode);
  // Use standalone class so the PDF is auto-cropped to the diagram content
  return `\\documentclass[border=6pt]{standalone}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[french]{babel}
\\usepackage{pstricks}
\\usepackage{pstricks-add}
\\usepackage{pst-plot}
\\usepackage{pst-node}
\\usepackage{pst-tree}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{eucal}
\\usepackage{numprint}
${extraPackages}
\\begin{document}
${expandedCode}
\\end{document}
`;
}

function buildScratch3Document(scratchCode: string): string {
  // Strip greyscale options so blocks render in full Scratch colors for digital display
  const coloredCode = stripScratchGrayscale(scratchCode);
  return `\\documentclass[border=4pt]{standalone}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[french]{babel}
\\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}
\\usepackage{scratch3}
\\begin{document}
${coloredCode}
\\end{document}
`;
}

function buildTikzDocument(tikzCode: string, preamble = ""): string {
  return `\\documentclass[border=4pt]{standalone}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[french]{babel}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usepackage{amsmath}
\\usepackage{amssymb}
${preamble}
\\begin{document}
${tikzCode}
\\end{document}
`;
}
