import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase function environment is not configured");
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const [{ data: roles }, { data: userProfile }] = await Promise.all([
      adminClient.from("user_roles").select("role").eq("user_id", userId),
      adminClient.from("users").select("user_type").eq("id", userId).maybeSingle(),
    ]);

    const isAdmin =
      roles?.some((row) => row.role === "admin") ||
      userProfile?.user_type === "admin";

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const subjectKey = String(formData.get("subjectKey") || "subject");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing image file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!file.type.startsWith("image/")) {
      return new Response(JSON.stringify({ error: "File must be an image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    if (!buckets.some((bucket) => bucket.id === "subject-icons")) {
      const { error: bucketError } = await adminClient.storage.createBucket("subject-icons", {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
      });

      if (bucketError) throw bucketError;
    }

    const safeSubjectKey = sanitizeFileName(subjectKey) || "subject";
    const safeFileName = sanitizeFileName(file.name) || "subject-icon";
    const filePath = `${safeSubjectKey}/${Date.now()}-${safeFileName}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await adminClient.storage
      .from("subject-icons")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = adminClient.storage.from("subject-icons").getPublicUrl(filePath);

    return new Response(JSON.stringify({ publicUrl: data.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Subject icon upload failed", error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
