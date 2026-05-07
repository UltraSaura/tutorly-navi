import { readFile } from "node:fs/promises";

type ImportMode = "upsert" | "replace";

interface CliOptions {
  bundle: string;
  mode: ImportMode;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl === undefined || serviceKey === undefined) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const rawBundle = await readFile(options.bundle, "utf8");
  const bundle: unknown = JSON.parse(rawBundle);
  const body = JSON.stringify({ ...(isRecord(bundle) ? bundle : {}), mode: options.mode });
  const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/import-exam-bundle`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body,
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { success: false, error: text };
  }

  console.log(JSON.stringify(payload, null, 2));

  if (!isRecord(payload) || payload.success !== true) {
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    bundle: "exam-import/bundles/dnb-maths.json",
    mode: "upsert",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === "--bundle" && value !== undefined) {
      options.bundle = value;
      index += 1;
    } else if (arg === "--mode" && isImportMode(value)) {
      options.mode = value;
      index += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }

  return options;
}

function isImportMode(value: string | undefined): value is ImportMode {
  return value === "upsert" || value === "replace";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printHelp(): void {
  console.log(`Usage: npm run import:dnb-annales -- [options]

Options:
  --bundle exam-import/bundles/test-dnb-2021.json
  --mode upsert|replace

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
