import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BundleData {
  domains?: Array<{ domain: string }>;
  subdomains?: Array<{ domain: string; subdomain: string; id?: number }>;
  objectives?: Array<{ 
    id: string; 
    level: string; 
    domain?: string; 
    subdomain: string; 
    text: string; 
    notes_from_prog?: string;
    subject_id?: string;
    domain_id?: string;
    subdomain_id?: string;
    skill_id?: string;
  }>;
  success_criteria?: Array<{ 
    id: string; 
    objective_id?: string; 
    text: string;
    subject_id?: string;
    domain_id?: string;
    subdomain_id?: string;
    skill_id?: string;
  }>;
  tasks?: Array<{ 
    id: string; 
    success_criterion_id?: string; 
    type: string; 
    stem: string; 
    solution?: string; 
    rubric?: string;
    subject_id?: string;
    domain_id?: string;
    subdomain_id?: string;
    skill_id?: string;
  }>;
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

interface CurriculumLocation {
  subject_id: string | null;
  domain_id: string | null;
  subdomain_id: string | null;
  skill_id: string | null;
}

// Enhanced curriculum mapping function with keyword matching
function mapToCurriculum(text: string): CurriculumLocation {
  const t = text.toLowerCase();
  
  // Math - Numbers domain
  if (t.includes('fraction') || t.includes('demi') || t.includes('quart') || t.includes('tiers')) {
    return { subject_id: 'math', domain_id: 'numbers', subdomain_id: 'fractions', skill_id: null };
  }
  
  if (t.includes('décimal') || t.includes('virgule') || t.includes('dixième') || t.includes('centième')) {
    return { subject_id: 'math', domain_id: 'numbers', subdomain_id: 'decimals', skill_id: null };
  }
  
  if (t.includes('entier') || t.includes('nombre') && (t.includes('compter') || t.includes('ordonner'))) {
    return { subject_id: 'math', domain_id: 'numbers', subdomain_id: 'whole_numbers', skill_id: null };
  }
  
  if (t.includes('addition') || t.includes('soustraction') || t.includes('additionner') || t.includes('soustraire')) {
    return { subject_id: 'math', domain_id: 'numbers-operations', subdomain_id: 'addition-subtraction', skill_id: null };
  }
  
  if (t.includes('multiplication') || t.includes('division') || t.includes('multiplier') || t.includes('diviser') || t.includes('table')) {
    return { subject_id: 'math', domain_id: 'numbers-operations', subdomain_id: 'whole-numbers', skill_id: null };
  }
  
  // Math - Geometry domain
  if (t.includes('angle') || t.includes('droit') || t.includes('aigu') || t.includes('obtus')) {
    return { subject_id: 'math', domain_id: 'geometry', subdomain_id: 'angles', skill_id: null };
  }
  
  if (t.includes('forme') || t.includes('carré') || t.includes('rectangle') || t.includes('triangle') || 
      t.includes('cercle') || t.includes('polygone') || t.includes('géométrique')) {
    return { subject_id: 'math', domain_id: 'geometry', subdomain_id: 'shapes', skill_id: null };
  }
  
  if (t.includes('symétrie') || t.includes('symétrique')) {
    return { subject_id: 'math', domain_id: 'geometry', subdomain_id: 'shapes-properties', skill_id: null };
  }
  
  // Math - Measurement domain
  if (t.includes('mesure') || t.includes('longueur') || t.includes('masse') || t.includes('capacité') || 
      t.includes('litre') || t.includes('gramme') || t.includes('mètre')) {
    return { subject_id: 'math', domain_id: 'measurement', subdomain_id: 'length-mass', skill_id: null };
  }
  
  if (t.includes('périmètre') || t.includes('aire') || t.includes('surface')) {
    return { subject_id: 'math', domain_id: 'measurement', subdomain_id: 'perimeter-area', skill_id: null };
  }
  
  if (t.includes('heure') || t.includes('temps') || t.includes('durée') || t.includes('minute')) {
    return { subject_id: 'math', domain_id: 'measurement', subdomain_id: 'time', skill_id: null };
  }
  
  // Math - Data domain
  if (t.includes('tableau') || t.includes('graphique') || t.includes('diagramme') || t.includes('données')) {
    return { subject_id: 'math', domain_id: 'data', subdomain_id: 'tables_graphs', skill_id: null };
  }
  
  // History - French Revolution
  if (t.includes('révolution') || t.includes('1789') || t.includes('louis xvi') || 
      t.includes('bastille') || t.includes('république')) {
    return { subject_id: 'history', domain_id: 'french_revolution', subdomain_id: 'key_events', skill_id: null };
  }
  
  // History - Medieval period
  if (t.includes('moyen âge') || t.includes('médiéval') || t.includes('chevalier') || 
      t.includes('château') || t.includes('seigneur')) {
    return { subject_id: 'history', domain_id: 'medieval-history', subdomain_id: 'middle-ages', skill_id: null };
  }
  
  // History - Ancient history
  if (t.includes('antiquité') || t.includes('romain') || t.includes('gaulois') || 
      t.includes('grec') || t.includes('pharaon')) {
    return { subject_id: 'history', domain_id: 'ancient-history', subdomain_id: 'ancient-civilizations', skill_id: null };
  }
  
  // Default: no mapping
  return { subject_id: null, domain_id: null, subdomain_id: null, skill_id: null };
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

    // 3. Upsert objectives with automatic curriculum mapping
    if (bundle.objectives && bundle.objectives.length > 0) {
      console.log(`Upserting ${bundle.objectives.length} objectives...`);
      
      // Map curriculum location for each objective
      const mappedObjectives = bundle.objectives.map(obj => {
        const location = mapToCurriculum(obj.text);
        return {
          ...obj,
          subject_id: obj.subject_id || location.subject_id,
          domain_id: obj.domain_id || location.domain_id,
          subdomain_id: obj.subdomain_id || location.subdomain_id,
          skill_id: obj.skill_id || location.skill_id,
        };
      });
      
      const chunks = chunk(mappedObjectives, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('objectives')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) {
          console.error('Error upserting objectives chunk:', error);
          throw error;
        }
        counts.objectives += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.objectives} objectives with curriculum mapping`);
    }

    // 4. Upsert success criteria with automatic curriculum mapping
    if (bundle.success_criteria && bundle.success_criteria.length > 0) {
      console.log(`Upserting ${bundle.success_criteria.length} success criteria...`);
      
      // Map curriculum location for each success criterion
      const mappedCriteria = bundle.success_criteria.map(sc => {
        const location = mapToCurriculum(sc.text);
        return {
          ...sc,
          subject_id: sc.subject_id || location.subject_id,
          domain_id: sc.domain_id || location.domain_id,
          subdomain_id: sc.subdomain_id || location.subdomain_id,
          skill_id: sc.skill_id || location.skill_id,
        };
      });
      
      const chunks = chunk(mappedCriteria, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('success_criteria')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) {
          console.error('Error upserting success criteria chunk:', error);
          throw error;
        }
        counts.success_criteria += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.success_criteria} success criteria with curriculum mapping`);
    }

    // 5. Upsert tasks with automatic curriculum mapping
    if (bundle.tasks && bundle.tasks.length > 0) {
      console.log(`Upserting ${bundle.tasks.length} tasks...`);
      
      // Map curriculum location for each task
      const mappedTasks = bundle.tasks.map(task => {
        const location = mapToCurriculum(task.stem);
        return {
          ...task,
          subject_id: task.subject_id || location.subject_id,
          domain_id: task.domain_id || location.domain_id,
          subdomain_id: task.subdomain_id || location.subdomain_id,
          skill_id: task.skill_id || location.skill_id,
        };
      });
      
      const chunks = chunk(mappedTasks, CHUNK_SIZE);
      for (const chunkData of chunks) {
        const { error } = await supabaseAdmin
          .from('tasks')
          .upsert(chunkData, { onConflict: 'id' });
        if (error) {
          console.error('Error upserting tasks chunk:', error);
          throw error;
        }
        counts.tasks += chunkData.length;
      }
      console.log(`✓ Upserted ${counts.tasks} tasks with curriculum mapping`);
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Curriculum bundle imported successfully',
        counts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error importing curriculum bundle:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
