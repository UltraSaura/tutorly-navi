import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Placeholder for AI function calls - replace with actual implementations
async function mistralOcr(content: string): Promise<any> {
  console.log("Mistral OCR called");
  // Simulate AI call
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { ocrResult: "OCR data" };
}

async function deepseekDomainStructure(ocrResult: any): Promise<any> {
  console.log("DeepSeek Domain Structure called");
  // Simulate AI call
  await new Promise(resolve => setTimeout(resolve, 3000));
  return { domainStructure: { domain: "Domain A", subdomains: ["Subdomain A1", "Subdomain A2"] } };
}

async function deepseekObjectivesExtraction(domainStructure: any): Promise<any> {
  console.log("DeepSeek Objectives Extraction called");
  // Simulate AI call
  await new Promise(resolve => setTimeout(resolve, 4000));
  return { objectives: ["Objective 1", "Objective 2"] };
}

// Function to save data to Supabase
async function saveToSupabase(data: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be set as environment variables.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Example: Saving domain and subdomain structure
  // In a real scenario, you'd parse `data` and save appropriately.
  console.log("Saving to Supabase:", data);
  const { error } = await supabase.from("curriculum_domains").insert([
    { name: data.domainStructure?.domain, subdomains: data.domainStructure?.subdomains },
  ]);
  if (error) {
    console.error("Error saving domain structure:", error);
    throw error;
  }

  // Example: Saving objectives
  // In a real scenario, you'd parse `data` and save appropriately.
  console.log("Saving objectives to Supabase:", data);
  const { error: objectivesError } = await supabase.from("curriculum_objectives").insert([
    { objectives: data.objectives },
  ]);
  if (objectivesError) {
    console.error("Error saving objectives:", objectivesError);
    throw objectivesError;
  }
}

serve(async (req) => {
  const { curriculumContent } = await req.json();

  if (!curriculumContent) {
    return new Response(JSON.stringify({ error: "curriculumContent is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Phase 1: Perform initial AI calls and save domain/subdomain structure
    const ocrResult = await mistralOcr(curriculumContent);
    const domainStructure = await deepseekDomainStructure(ocrResult);

    // Use EdgeRuntime.waitUntil to keep the function alive for the second phase
    // This allows the function to return a 202 Accepted response immediately.
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          // Save domain and subdomain structure immediately
          await saveToSupabase({ domainStructure });

          // Perform objectives extraction and save it asynchronously
          const objectives = await deepseekObjectivesExtraction(domainStructure);
          await saveToSupabase({ objectives });

          console.log("Asynchronous processing completed successfully.");
        } catch (asyncError) {
          console.error("Error during asynchronous processing:", asyncError);
          // Optionally, update a status in the database to indicate async failure
          // await supabase.from("curriculum_jobs").update({ status: "async_failed" }).eq("id", jobId);
        }
      })()
    );

    return new Response(
      JSON.stringify({ message: "Processing started. Domain and subdomain structure saved. Objectives extraction is running asynchronously." }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in initial processing:", error);
    // If the error occurs before waitUntil, it's a synchronous failure.
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
