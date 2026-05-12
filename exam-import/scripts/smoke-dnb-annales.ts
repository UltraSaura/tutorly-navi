import { readFile } from "node:fs/promises";

interface SupabaseConfig {
  url: string;
  key: string;
  keySource: "service-role" | "publishable";
  configSource: "process.env" | ".env";
}

interface SmokeCounts {
  sources: number;
  papers: number;
  exercises: number;
  exercise_program_links: number;
}

const TABLES = {
  sources: "exam_sources",
  papers: "exam_papers",
  exercises: "exam_exercises",
  exercise_program_links: "exam_exercise_program_links",
} as const;

async function main(): Promise<void> {
  const fixturePath = parseFixturePath(process.argv.slice(2));
  if (fixturePath !== undefined) {
    const counts = await readFixtureCounts(fixturePath);
    console.log(
      JSON.stringify(
        {
          success: true,
          mode: "fixture",
          fixture: fixturePath,
          counts,
        },
        null,
        2,
      ),
    );
    return;
  }

  const config = await loadSupabaseConfig();
  const counts = await getSmokeCounts(config);

  console.log(
    JSON.stringify(
      {
        success: true,
        config_source: config.configSource,
        key_source: config.keySource,
        counts,
      },
      null,
      2,
    ),
  );
}

function parseFixturePath(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--fixture" && value !== undefined) return value;
    if (arg === "--offline") return "exam-import/fixtures/smoke-dnb-annales.json";
    if (arg === "--help") {
      console.log(`Usage: npm run smoke:dnb-annales -- [--offline | --fixture path/to/counts.json]`);
      process.exit(0);
    }
  }
  return process.env.EXAM_IMPORT_SMOKE_FIXTURE;
}

async function readFixtureCounts(path: string): Promise<SmokeCounts> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isSmokeCounts(parsed)) {
    throw new Error(`Fixture smoke invalide: ${path}. Attendu: sources, papers, exercises, exercise_program_links numériques.`);
  }
  return parsed;
}

function isSmokeCounts(value: unknown): value is SmokeCounts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sources === "number" &&
    typeof record.papers === "number" &&
    typeof record.exercises === "number" &&
    typeof record.exercise_program_links === "number"
  );
}

async function loadSupabaseConfig(): Promise<SupabaseConfig> {
  const fromProcess = configFromRecord(process.env, "process.env");
  if (fromProcess !== null) return fromProcess;

  const envFile = await readEnvFile(".env");
  if (envFile !== null) {
    const fromEnvFile = configFromRecord(envFile, ".env");
    if (fromEnvFile !== null) return fromEnvFile;
  }

  throw new Error(
    [
      "Configuration Supabase introuvable pour le smoke test exam-import.",
      "Attendu: SUPABASE_URL ou VITE_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_PUBLISHABLE_KEY.",
      "Le script lit d'abord process.env puis le fichier .env existant du repo.",
    ].join(" "),
  );
}

function configFromRecord(
  values: Record<string, string | undefined>,
  configSource: SupabaseConfig["configSource"],
): SupabaseConfig | null {
  const url = firstPresent(values.SUPABASE_URL, values.VITE_SUPABASE_URL);
  const serviceKey = firstPresent(values.SUPABASE_SERVICE_ROLE_KEY, values.SUPABASE_SERVICE_KEY);
  const publishableKey = firstPresent(
    values.SUPABASE_PUBLISHABLE_KEY,
    values.VITE_SUPABASE_PUBLISHABLE_KEY,
    values.SUPABASE_ANON_KEY,
    values.VITE_SUPABASE_ANON_KEY,
  );
  const key = serviceKey ?? publishableKey;

  if (url === undefined || key === undefined) return null;

  return {
    url,
    key,
    keySource: serviceKey !== undefined ? "service-role" : "publishable",
    configSource,
  };
}

async function readEnvFile(path: string): Promise<Record<string, string> | null> {
  try {
    const raw = await readFile(path, "utf8");
    const values: Record<string, string> = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key.length > 0) values[key] = value;
    }

    return values;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function getSmokeCounts(config: SupabaseConfig): Promise<SmokeCounts> {
  const entries = await Promise.all(
    Object.entries(TABLES).map(async ([key, table]) => {
      const count = await getTableCount(config, table);
      return [key, count] as const;
    }),
  );

  return Object.fromEntries(entries) as unknown as SmokeCounts;
}

async function getTableCount(config: SupabaseConfig, table: string): Promise<number> {
  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}?select=id`, {
    method: "HEAD",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      prefer: "count=exact",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const hint =
      response.status === 404
        ? "La table est introuvable côté Supabase; appliquez la migration exam-import avant le smoke test."
        : config.keySource === "publishable"
          ? "La clé publishable du .env est disponible, mais les règles RLS peuvent bloquer la lecture; fournissez SUPABASE_SERVICE_ROLE_KEY dans process.env pour un smoke admin."
          : "La clé service-role fournie n'a pas permis la lecture.";

    throw new Error(
      [
        `Smoke test Supabase impossible sur ${table}: HTTP ${response.status}.`,
        hint,
        body ? `Détail Supabase: ${body}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const contentRange = response.headers.get("content-range");
  const count = contentRange?.match(/\/(\d+)$/)?.[1];
  if (count === undefined) {
    throw new Error(`Smoke test Supabase impossible sur ${table}: en-tête content-range absent.`);
  }

  return Number.parseInt(count, 10);
}

function firstPresent(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
