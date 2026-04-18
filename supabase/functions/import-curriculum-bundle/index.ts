import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Bundle shape (post-Phase-2)
// ----------------------------------------------------------------------------
// The transformer is expected to pre-generate UUIDs for every entity and wire
// foreign keys explicitly. Legacy text codes (subject_id text, domain_id text,
// etc.) may still be present for backwards compat, but the source of truth is
// the UUID fields below.
// ============================================================================

interface BundleSubject {
  id: string;            // UUID
  slug: string;
  name: string;
  language?: string;
  color_scheme?: string;
  icon_name?: string;
}

interface BundleDomain {
  id: string;            // UUID
  subject_id: string;    // UUID FK
  code: string;
  label: string;
  // legacy compat (optional)
  domain?: string;
}

interface BundleSubdomain {
  id: string;            // UUID
  subject_id: string;    // UUID FK
  domain_id: string;     // UUID FK
  code: string;
  label: string;
  // legacy compat (optional)
  domain?: string;
  subdomain?: string;
}

interface BundleObjective {
  id: string;            // UUID
  subject_id: string;    // UUID FK
  domain_id: string;     // UUID FK
  subdomain_id: string;  // UUID FK
  level: string;
  text: string;
  notes_from_prog?: string;
  keywords?: string[];
  // legacy compat
  legacy_id?: string;
  domain?: string;
  subdomain?: string;
}

interface BundleSuccessCriterion {
  id: string;            // UUID
  objective_id: string;  // UUID FK
  subject_id?: string;
  domain_id?: string;
  subdomain_id?: string;
  text: string;
  legacy_id?: string;
}

interface BundleTask {
  id: string;            // UUID
  success_criterion_id: string; // UUID FK
  subject_id?: string;
  domain_id?: string;
  subdomain_id?: string;
  type: string;
  stem: string;
  solution?: string;
  rubric?: string;
  difficulty?: string;
  tags?: string[];
  source?: string;
  legacy_id?: string;
}

interface BundleTopicLink {
  id?: string;
  topic_id: string;      // UUID FK
  objective_id: string;  // UUID FK
  order_index?: number;
}

interface BundleLesson {
  id: string;            // UUID
  topic_id?: string;     // UUID FK (optional)
  title: string;
  objective_ids?: any;
  success_criterion_ids?: any;
  materials?: string;
  misconceptions?: string;
  teacher_talk?: string;
  student_worksheet?: string;
  legacy_id?: string;
}

interface BundleData {
  subjects?: BundleSubject[];
  domains?: BundleDomain[];
  subdomains?: BundleSubdomain[];
  objectives?: BundleObjective[];
  success_criteria?: BundleSuccessCriterion[];
  tasks?: BundleTask[];
  topic_objective_links?: BundleTopicLink[];
  lessons?: BundleLesson[];
}

interface ImportCounts {
  subjects: number;
  domains: number;
  subdomains: number;
  objectives: number;
  success_criteria: number;
  tasks: number;
  topic_objective_links: number;
  lessons: number;
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (roleError || !roles || roles.length === 0) throw new Error('User is not an admin');

    const bundle: BundleData = await req.json();
    console.log('📥 Bundle keys:', Object.keys(bundle));
    console.log('📊 Pre-import counts:', {
      subjects: bundle.subjects?.length ?? 0,
      domains: bundle.domains?.length ?? 0,
      subdomains: bundle.subdomains?.length ?? 0,
      objectives: bundle.objectives?.length ?? 0,
      success_criteria: bundle.success_criteria?.length ?? 0,
      tasks: bundle.tasks?.length ?? 0,
      topic_objective_links: bundle.topic_objective_links?.length ?? 0,
      lessons: bundle.lessons?.length ?? 0,
    });

    const counts: ImportCounts = {
      subjects: 0,
      domains: 0,
      subdomains: 0,
      objectives: 0,
      success_criteria: 0,
      tasks: 0,
      topic_objective_links: 0,
      lessons: 0,
    };

    const CHUNK_SIZE = 100;

    // ----------------------------------------------------------------------
    // 1. Subjects (UUID PK)
    // ----------------------------------------------------------------------
    if (bundle.subjects?.length) {
      const rows = bundle.subjects.map(s => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        language: s.language ?? 'en',
        color_scheme: s.color_scheme ?? 'blue',
        icon_name: s.icon_name ?? 'BookOpen',
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('subjects').upsert(c, { onConflict: 'id' });
        if (error) throw error;
        counts.subjects += c.length;
      }
      console.log(`✓ subjects ${counts.subjects}`);
    }

    // ----------------------------------------------------------------------
    // 2. Domains — write UUID id + subject_id, plus legacy `domain` text col
    // ----------------------------------------------------------------------
    if (bundle.domains?.length) {
      const rows = bundle.domains.map(d => ({
        id: d.id,
        subject_id: d.subject_id,
        code: d.code,
        label: d.label,
        // legacy text column kept populated during dual-write window
        domain: d.domain ?? d.code,
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('domains').upsert(c, { onConflict: 'id' });
        if (error) throw error;
        counts.domains += c.length;
      }
      console.log(`✓ domains ${counts.domains}`);
    }

    // ----------------------------------------------------------------------
    // 3. Subdomains — write UUID id_new + domain_id_new + subject_id
    //    plus legacy `domain`/`subdomain` text columns
    // ----------------------------------------------------------------------
    if (bundle.subdomains?.length) {
      const rows = bundle.subdomains.map(s => ({
        id_new: s.id,
        subject_id: s.subject_id,
        domain_id_new: s.domain_id,
        code: s.code,
        label: s.label,
        domain: s.domain ?? null,
        subdomain: s.subdomain ?? s.label,
      }));
      // bigint `id` is autogenerated; conflict target is the new uuid id_new
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('subdomains').upsert(c, { onConflict: 'id_new' });
        if (error) throw error;
        counts.subdomains += c.length;
      }
      console.log(`✓ subdomains ${counts.subdomains}`);
    }

    // ----------------------------------------------------------------------
    // 4. Objectives — write text id (PK still text) + id_new uuid + UUID FKs
    // ----------------------------------------------------------------------
    if (bundle.objectives?.length) {
      const rows = bundle.objectives.map(o => ({
        // text PK = legacy_id if provided, else stringified UUID
        id: o.legacy_id ?? o.id,
        id_new: o.id,
        level: o.level,
        text: o.text,
        notes_from_prog: o.notes_from_prog ?? '',
        keywords: o.keywords ?? [],
        // UUID FKs (new authoritative columns)
        subject_id_uuid: o.subject_id,
        domain_id_uuid: o.domain_id,
        subdomain_id_uuid: o.subdomain_id,
        // legacy text cols kept for app backwards compat
        domain: o.domain ?? null,
        subdomain: o.subdomain ?? '',
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('objectives').upsert(c, { onConflict: 'id' });
        if (error) {
          console.error('objectives upsert error:', error);
          throw error;
        }
        counts.objectives += c.length;
      }
      console.log(`✓ objectives ${counts.objectives}`);
    }

    // ----------------------------------------------------------------------
    // 5. Success criteria
    // ----------------------------------------------------------------------
    if (bundle.success_criteria?.length) {
      const rows = bundle.success_criteria.map(sc => ({
        id: sc.legacy_id ?? sc.id,
        id_new: sc.id,
        text: sc.text,
        objective_id_uuid: sc.objective_id,
        subject_id_uuid: sc.subject_id ?? null,
        domain_id_uuid: sc.domain_id ?? null,
        subdomain_id_uuid: sc.subdomain_id ?? null,
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('success_criteria').upsert(c, { onConflict: 'id' });
        if (error) throw error;
        counts.success_criteria += c.length;
      }
      console.log(`✓ success_criteria ${counts.success_criteria}`);
    }

    // ----------------------------------------------------------------------
    // 6. Tasks
    // ----------------------------------------------------------------------
    if (bundle.tasks?.length) {
      const rows = bundle.tasks.map(t => ({
        id: t.legacy_id ?? t.id,
        id_new: t.id,
        type: t.type,
        stem: t.stem,
        solution: t.solution ?? '',
        rubric: t.rubric ?? '',
        difficulty: t.difficulty ?? 'core',
        tags: t.tags ?? [],
        source: t.source ?? 'auto',
        success_criterion_id_uuid: t.success_criterion_id,
        subject_id_uuid: t.subject_id ?? null,
        domain_id_uuid: t.domain_id ?? null,
        subdomain_id_uuid: t.subdomain_id ?? null,
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('tasks').upsert(c, { onConflict: 'id' });
        if (error) throw error;
        counts.tasks += c.length;
      }
      console.log(`✓ tasks ${counts.tasks}`);
    }

    // ----------------------------------------------------------------------
    // 7. Topic ↔ Objective links
    // ----------------------------------------------------------------------
    if (bundle.topic_objective_links?.length) {
      const rows = bundle.topic_objective_links.map(l => ({
        id: l.id ?? crypto.randomUUID(),
        topic_id: l.topic_id,
        objective_id_uuid: l.objective_id,
        // legacy text col can't be NULL (NOT NULL); stash the uuid as text
        objective_id: l.objective_id,
        order_index: l.order_index ?? 0,
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin
          .from('topic_objective_links')
          .upsert(c, { onConflict: 'topic_id,objective_id_uuid' });
        if (error) throw error;
        counts.topic_objective_links += c.length;
      }
      console.log(`✓ topic_objective_links ${counts.topic_objective_links}`);
    }

    // ----------------------------------------------------------------------
    // 8. Lessons
    // ----------------------------------------------------------------------
    if (bundle.lessons?.length) {
      const rows = bundle.lessons.map(l => ({
        id: l.legacy_id ?? l.id,
        id_new: l.id,
        title: l.title,
        topic_id: l.topic_id ?? null,
        objective_ids: l.objective_ids ?? [],
        success_criterion_ids: l.success_criterion_ids ?? [],
        materials: l.materials ?? '',
        misconceptions: l.misconceptions ?? '',
        teacher_talk: l.teacher_talk ?? '',
        student_worksheet: l.student_worksheet ?? '',
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('lessons').upsert(c, { onConflict: 'id' });
        if (error) throw error;
        counts.lessons += c.length;
      }
      console.log(`✓ lessons ${counts.lessons}`);
    }

    // ----------------------------------------------------------------------
    // 9. Post-import verification: count NULLs in critical UUID FKs
    // ----------------------------------------------------------------------
    const verifyChecks: Array<[string, string]> = [
      ['objectives', 'subdomain_id_uuid'],
      ['objectives', 'domain_id_uuid'],
      ['objectives', 'subject_id_uuid'],
      ['success_criteria', 'objective_id_uuid'],
      ['topic_objective_links', 'objective_id_uuid'],
    ];
    const verification: Record<string, number> = {};
    for (const [tbl, col] of verifyChecks) {
      const { count } = await supabaseAdmin
        .from(tbl)
        .select('*', { count: 'exact', head: true })
        .is(col, null);
      verification[`${tbl}.${col}_null`] = count ?? 0;
      console.log(`  ${(count ?? 0) > 0 ? '❌' : '✓'} ${tbl}.${col} NULL = ${count ?? 0}`);
    }
    const allClean = Object.values(verification).every(v => v === 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: allClean
          ? '✅ Curriculum imported, all FKs resolved.'
          : '⚠️ Imported but some FKs are NULL — see verification.',
        counts,
        verification,
        ready_for_phase_3: allClean,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error importing curriculum bundle:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message ?? 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
