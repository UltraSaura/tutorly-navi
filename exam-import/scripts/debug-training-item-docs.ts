import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL and key are required");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: items, error } = await supabase
    .from("exam_training_items")
    .select("id, prompt, documents")
    .eq("source_year", 2021)
    .limit(5);

  if (error) {
    console.error("Erreur de requête:", error);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log("Aucun item publié trouvé.");
    return;
  }

  for (const item of items) {
    console.log(`\n--- Item: ${item.id} ---`);
    console.log(`Prompt: ${item.prompt}`);
    if (Array.isArray(item.documents)) {
      for (const doc of item.documents) {
        console.log(`  - doc.id: ${doc.id}`);
        console.log(`    doc.type: ${doc.type}`);
        console.log(`    doc.render_mode: ${doc.render_mode}`);
        console.log(`    doc.image.public_url exists?: ${doc.public_url ? 'true' : 'false'}`);
        console.log(`    doc.table exists?: ${doc.table ? 'true' : 'false'}`);
      }
    } else {
      console.log("  Pas de documents.");
    }
  }
}

main().catch(console.error);
