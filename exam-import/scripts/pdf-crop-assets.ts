import { execFile } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { ExamExercise, ExamPaper } from "../parsers/pdf-to-exam.ts";

const execFileAsync = promisify(execFile);

export interface CropConfigItem {
  id: string;
  type: string;
  label: string;
  page: number;
  bbox_percent: [number, number, number, number];
  render_mode?: "image_first" | "table_first" | "image_only" | "table_only";
  alt?: string;
}

export interface CropConfig {
  [exerciseKey: string]: CropConfigItem[];
}

export async function applyCropsToExercises(
  paper: ExamPaper,
  exercises: ExamExercise[],
  pdfBytes: Uint8Array,
  assetsRoot: string
): Promise<void> {
  const configName = `dnb-${paper.source_name.replace("ac-amiens-maths", "amiens")}-${paper.session_year}-${paper.discipline === "mathematiques" ? "maths" : paper.discipline}.json`;
  const configPath = join(process.cwd(), "exam-import", "asset-crops", configName);

  let config: CropConfig;
  try {
    const raw = await readFile(configPath, "utf8");
    config = JSON.parse(raw);
  } catch {
    // No config for this paper
    return;
  }

  const safePaperId = safePathSegment(paper.id);
  const dir = await mkdtemp(join(tmpdir(), "exam-crop-"));
  const pdfPath = join(dir, "input.pdf");
  await writeFile(pdfPath, pdfBytes);

  try {
    for (const exercise of exercises) {
      if (exercise.exercise_number === null) continue;
      const exKey = `exercise_${exercise.exercise_number}`;
      const crops = config[exKey];
      if (!crops || crops.length === 0) continue;

      const safeExerciseId = safePathSegment(exercise.id);
      const exerciseAssetsDir = join(assetsRoot, safePaperId, safeExerciseId);
      await mkdir(exerciseAssetsDir, { recursive: true });

      for (const crop of crops) {
        // 1. Render specific page
        const prefix = join(dir, `page-${crop.page}`);
        try {
          await execFileAsync("pdftoppm", ["-png", "-r", "144", "-f", String(crop.page), "-l", String(crop.page), pdfPath, prefix], {
            timeout: 30_000,
          });
        } catch {
          console.warn(`[CROP] pdftoppm failed for page ${crop.page}`);
          continue;
        }

        const renderedPath = join(dir, `page-${crop.page}-${crop.page}.png`);
        
        // 2. Read dimensions
        const dimensions = await readPngDimensions(renderedPath);
        if (!dimensions) {
          console.warn(`[CROP] Could not read dimensions for ${renderedPath}`);
          continue;
        }

        // 3. Compute crop pixels
        const [pctX, pctY, pctMaxX, pctMaxY] = crop.bbox_percent;
        const x = Math.round(pctX * dimensions.width);
        const y = Math.round(pctY * dimensions.height);
        const w = Math.round((pctMaxX - pctX) * dimensions.width);
        const h = Math.round((pctMaxY - pctY) * dimensions.height);

        // 4. Run pdftoppm again with crop
        const cropPrefix = join(dir, `crop-${crop.id}`);
        try {
          await execFileAsync("pdftoppm", [
            "-png", "-r", "144",
            "-f", String(crop.page), "-l", String(crop.page),
            "-x", String(x), "-y", String(y),
            "-W", String(w), "-H", String(h),
            pdfPath, cropPrefix
          ], { timeout: 30_000 });
        } catch {
          console.warn(`[CROP] pdftoppm crop failed for ${crop.id}`);
          continue;
        }

        const cropRenderedPath = join(dir, `crop-${crop.id}-${crop.page}.png`);
        const fileName = `${crop.id}.png`;
        const destination = join(exerciseAssetsDir, fileName);
        await copyFile(cropRenderedPath, destination);

        const local_path = [assetsRoot, safePaperId, safeExerciseId, fileName].join("/");

        // 5. Update the exercise documents
        if (exercise.parsed_content) {
          let docs = exercise.parsed_content.documents ?? [];
          
          // Check if we should merge with existing structured table
          let existingDocIndex = docs.findIndex(d => d.type === crop.type);
          // Just a heuristic: if crop type is table and we have a table, we enrich it
          if (existingDocIndex >= 0 && crop.type === 'table') {
            docs[existingDocIndex] = {
              ...docs[existingDocIndex],
              id: crop.id,
              label: crop.label ?? docs[existingDocIndex].label,
              local_path,
              alt: crop.alt ?? docs[existingDocIndex].alt,
              render_mode: crop.render_mode,
            };
          } else {
            docs.push({
              id: crop.id,
              type: crop.type as any,
              label: crop.label,
              local_path,
              alt: crop.alt,
              render_mode: crop.render_mode,
              source: { page: crop.page },
            });
          }
          exercise.parsed_content.documents = docs;
        }
      }
    }
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function readPngDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const buffer = Buffer.alloc(24);
    const fd = await import("node:fs/promises").then(m => m.open(filePath, "r"));
    await fd.read(buffer, 0, 24, 0);
    await fd.close();

    if (buffer.readUInt32BE(0) === 0x89504e47) { // PNG signature
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
