import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BundleData {
  domains?: Array<{ domain: string }>;
  subdomains?: Array<{ domain: string; subdomain: string; id?: number }>;
  objectives?: Array<{ id: string; level: string; domain?: string; subdomain: string; text: string; notes_from_prog?: string }>;
  success_criteria?: Array<{ id: string; objective_id?: string; text: string }>;
  tasks?: Array<{ id: string; success_criterion_id?: string; type: string; stem: string; solution?: string; rubric?: string }>;
  units?: Array<{ id: string; level: string; domain: string; subdomain: string; title: string; duration_weeks?: number }>;
  lessons?: Array<{ id: string; unit_id?: string; title: string; objective_ids?: any; success_criterion_ids?: any; materials?: string; misconceptions?: string; teacher_talk?: string; student_worksheet?: string }>;
}

interface ImportCounts {
  domains: number;
  subdomains: number;
  objectives: number;
  success_criteria: number;
  tasks: number;
  units: number;
  lessons: number;
}

// Chunk array into smaller batches
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roles || roles.length === 0) {
      throw new Error('User is not an admin');
    }

    // Parse request body
    const bundle: BundleData = await req.json();
    console.log('Received bundle with keys:', Object.keys(bundle));

    const counts: ImportCounts = {
      domains: 0,
      subdomains: 0,
      objectives: 0,
      success_criteria: 0,
      tasks: 0,
      units: 0,
      lessons: 0,
    };

    const CHUNK_SIZE = 100;

    // 1. Upsert domains
    if (bundle.domains && bundle.domains.length > 0) {
      console.log(`Upserting ${bundle.domains.length} domains...`);
      const chunks = chunk(bundle.domains, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('domains')
          .upsert(chunkData, { onConflict: 'domain' });
        if (error) throw error;
        counts.domains += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.domains} domains`);
    }

    // 2. Upsert subdomains
    if (bundle.subdomains && bundle.subdomains.length > 0) {
      console.log(`Upserting ${bundle.subdomains.length} subdomains...`);
      const chunks = chunk(bundle.subdomains, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('subdomains')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.subdomains += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.subdomains} subdomains`);
    }

    // 3. Upsert objectives
    if (bundle.objectives && bundle.objectives.length > 0) {
      console.log(`Upserting ${bundle.objectives.length} objectives...`);
      const chunks = chunk(bundle.objectives, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('objectives')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.objectives += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.objectives} objectives`);
    }

    // 4. Upsert success_criteria
    if (bundle.success_criteria && bundle.success_criteria.length > 0) {
      console.log(`Upserting ${bundle.success_criteria.length} success criteria...`);
      const chunks = chunk(bundle.success_criteria, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('success_criteria')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.success_criteria += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.success_criteria} success criteria`);
    }

    // 5. Upsert tasks
    if (bundle.tasks && bundle.tasks.length > 0) {
      console.log(`Upserting ${bundle.tasks.length} tasks...`);
      const chunks = chunk(bundle.tasks, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('tasks')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.tasks += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.tasks} tasks`);
    }

    // 6. Upsert units
    if (bundle.units && bundle.units.length > 0) {
      console.log(`Upserting ${bundle.units.length} units...`);
      const chunks = chunk(bundle.units, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('units')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.units += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.units} units`);
    }

    // 7. Upsert lessons
    if (bundle.lessons && bundle.lessons.length > 0) {
      console.log(`Upserting ${bundle.lessons.length} lessons...`);
      const chunks = chunk(bundle.lessons, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('lessons')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) throw error;
        counts.lessons += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.lessons} lessons`);
    }

    console.log('Import complete:', counts);

    return new Response(
      JSON.stringify({ success: true, counts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Import failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
