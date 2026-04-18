import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Bundle shape (post-Phase-2)
// ============================================================================

interface BundleSubject {
  id: string;
  slug: string;
  name: string;
  language?: string;
  color_scheme?: string;
  icon_name?: string;
}

interface BundleDomain {
  id: string;
  subject_id: string;
  code: string;
  label: string;
  domain?: string;
}

interface BundleSubdomain {
  id: string;
  subject_id: string;
  domain_id: string;
  code: string;
  label: string;
  domain?: string;
  subdomain?: string;
}

interface BundleObjective {
  id: string;
  subject_id: string;
  domain_id: string;
  subdomain_id: string;
  level: string;
  text: string;
  notes_from_prog?: string;
  keywords?: string[];
  legacy_id?: string;
  domain?: string;
  subdomain?: string;
}

interface BundleSuccessCriterion {
  id: string;
  objective_id: string;
  subject_id?: string;
  domain_id?: string;
  subdomain_id?: string;
  text: string;
  legacy_id?: string;
}

interface BundleTask {
  id: string;
  success_criterion_id: string;
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
  topic_id: string;
  objective_id: string;
  order_index?: number;
}

interface BundleLesson {
  id: string;
  topic_id?: string;
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
  mode?: 'replace' | 'upsert';
  subjects?: BundleSubject[];
  domains?: BundleDomain[];
  subdomains?: BundleSubdomain[];
  objectives?: BundleObjective[];
  success_criteria?: BundleSuccessCriterion[];
  tasks?: BundleTask[];
  topic_objective_links?: BundleTopicLink[];
  lessons?: BundleLesson[];
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Always return 200 so the client can read the JSON body.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function diagFromPgError(table: string, error: any) {
  return {
    table,
    code: error?.code ?? null,
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ success: false, error: 'No authorization header' }, 200);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ success: false, error: 'Unauthorized' }, 200);

    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (roleError || !roles || roles.length === 0) {
      return jsonResponse({ success: false, error: 'User is not an admin' }, 200);
    }

    const bundle: BundleData = await req.json();
    const mode = bundle.mode === 'replace' ? 'replace' : 'upsert';
    console.log('📥 Bundle keys:', Object.keys(bundle), 'mode:', mode);
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

    const counts = {
      subjects: 0, domains: 0, subdomains: 0, objectives: 0,
      success_criteria: 0, tasks: 0, topic_objective_links: 0, lessons: 0,
    };

    const CHUNK_SIZE = 100;

    // ----------------------------------------------------------------------
    // REPLACE MODE: wipe existing rows for every subject_id referenced
    // ----------------------------------------------------------------------
    if (mode === 'replace') {
      const subjectIds = new Set<string>();
      bundle.subjects?.forEach(s => s.id && subjectIds.add(s.id));
      bundle.domains?.forEach(d => d.subject_id && subjectIds.add(d.subject_id));
      bundle.subdomains?.forEach(s => s.subject_id && subjectIds.add(s.subject_id));
      bundle.objectives?.forEach(o => o.subject_id && subjectIds.add(o.subject_id));

      console.log(`🧹 Replace mode: wiping data for ${subjectIds.size} subject(s)`);

      for (const sid of subjectIds) {
        // Delete in dependency order: tasks → success_criteria → objectives → subdomains → domains
        // tasks scoped by subject_id_uuid
        let r = await supabaseAdmin.from('tasks').delete().eq('subject_id_uuid', sid);
        if (r.error) return jsonResponse({ success: false, error: 'Replace failed', diagnostics: diagFromPgError('tasks(delete)', r.error) }, 200);

        r = await supabaseAdmin.from('success_criteria').delete().eq('subject_id_uuid', sid);
        if (r.error) return jsonResponse({ success: false, error: 'Replace failed', diagnostics: diagFromPgError('success_criteria(delete)', r.error) }, 200);

        r = await supabaseAdmin.from('objectives').delete().eq('subject_id_uuid', sid);
        if (r.error) return jsonResponse({ success: false, error: 'Replace failed', diagnostics: diagFromPgError('objectives(delete)', r.error) }, 200);

        r = await supabaseAdmin.from('subdomains').delete().eq('subject_id', sid);
        if (r.error) return jsonResponse({ success: false, error: 'Replace failed', diagnostics: diagFromPgError('subdomains(delete)', r.error) }, 200);

        r = await supabaseAdmin.from('domains').delete().eq('subject_id', sid);
        if (r.error) return jsonResponse({ success: false, error: 'Replace failed', diagnostics: diagFromPgError('domains(delete)', r.error) }, 200);
      }
      // Purge orphan rows (NULL critical FKs) — leftover demo data that survives subject-scoped deletes
      console.log('🧹 Purging orphan rows with NULL FKs...');
      const orphanPurges: Array<[string, string]> = [
        ['tasks', 'subject_id_uuid'],
        ['success_criteria', 'objective_id_uuid'],
        ['objectives', 'subject_id_uuid'],
        ['subdomains', 'subject_id'],
        ['domains', 'subject_id'],
      ];
      for (const [tbl, col] of orphanPurges) {
        const r = await supabaseAdmin.from(tbl).delete().is(col, null);
        if (r.error) {
          console.warn(`⚠️ Orphan purge failed for ${tbl}.${col}:`, r.error.message);
        }
      }
      console.log('🧹 Replace mode: wipe complete');
    }

    // ----------------------------------------------------------------------
    // 1. Subjects
    // ----------------------------------------------------------------------
    if (bundle.subjects?.length) {
      const rows = bundle.subjects.map(s => ({
        id: s.id, slug: s.slug, name: s.name,
        language: s.language ?? 'en',
        color_scheme: s.color_scheme ?? 'blue',
        icon_name: s.icon_name ?? 'BookOpen',
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('subjects').upsert(c, { onConflict: 'id' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('subjects', error) }, 200);
        counts.subjects += c.length;
      }
      console.log(`✓ subjects ${counts.subjects}`);
    }

    // ----------------------------------------------------------------------
    // 2. Domains — PK is `domain` (text), `id` is unique. Use `domain` as conflict target.
    //    To avoid duplicate-domain-text clashes across subjects, namespace it.
    // ----------------------------------------------------------------------
    if (bundle.domains?.length) {
      const rows = bundle.domains.map(d => ({
        id: d.id,
        subject_id: d.subject_id,
        code: d.code,
        label: d.label,
        domain: d.domain ?? `${d.subject_id.slice(0, 8)}_${d.code}`,
      }));
      // PK is `domain` (text), so dedupe on that. Otherwise re-imports with new UUIDs collide on the legacy text PK.
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('domains').upsert(c, { onConflict: 'domain' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('domains', error) }, 200);
        counts.domains += c.length;
      }
      console.log(`✓ domains ${counts.domains}`);
    }

    // ----------------------------------------------------------------------
    // 3. Subdomains — namespace legacy `subdomain` text to avoid (domain,subdomain) UNIQUE clashes
    // ----------------------------------------------------------------------
    if (bundle.subdomains?.length) {
      const rows = bundle.subdomains.map(s => ({
        id_new: s.id,
        subject_id: s.subject_id,
        domain_id_new: s.domain_id,
        code: s.code,
        label: s.label,
        domain: s.domain ?? null,
        subdomain: s.subdomain ?? `${s.subject_id.slice(0, 8)}_${s.code}_${s.label}`,
      }));
      // (domain, subdomain) is UNIQUE — dedupe on that pair so legacy text collisions resolve via UPDATE not INSERT.
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('subdomains').upsert(c, { onConflict: 'domain,subdomain' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('subdomains', error) }, 200);
        counts.subdomains += c.length;
      }
      console.log(`✓ subdomains ${counts.subdomains}`);
    }

    // ----------------------------------------------------------------------
    // 4. Objectives
    // ----------------------------------------------------------------------
    if (bundle.objectives?.length) {
      const rows = bundle.objectives.map(o => ({
        id: o.legacy_id ?? o.id,
        id_new: o.id,
        level: o.level,
        text: o.text,
        notes_from_prog: o.notes_from_prog ?? '',
        keywords: o.keywords ?? [],
        subject_id_uuid: o.subject_id,
        domain_id_uuid: o.domain_id,
        subdomain_id_uuid: o.subdomain_id,
        domain: o.domain ?? null,
        subdomain: o.subdomain ?? '',
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('objectives').upsert(c, { onConflict: 'id' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('objectives', error) }, 200);
        counts.objectives += c.length;
      }
      console.log(`✓ objectives ${counts.objectives}`);
    }

    // ----------------------------------------------------------------------
    // 5. Success criteria — backfill mirror FKs from parent objective
    // ----------------------------------------------------------------------
    const objectiveFkMap = new Map<string, { subject_id: string; domain_id: string; subdomain_id: string }>();
    bundle.objectives?.forEach(o => {
      objectiveFkMap.set(o.id, {
        subject_id: o.subject_id,
        domain_id: o.domain_id,
        subdomain_id: o.subdomain_id,
      });
    });

    const successCriterionFkMap = new Map<string, { subject_id: string | null; domain_id: string | null; subdomain_id: string | null; objective_id: string }>();

    if (bundle.success_criteria?.length) {
      const rows = bundle.success_criteria.map(sc => {
        const parent = objectiveFkMap.get(sc.objective_id);
        const subject_id = sc.subject_id ?? parent?.subject_id ?? null;
        const domain_id = sc.domain_id ?? parent?.domain_id ?? null;
        const subdomain_id = sc.subdomain_id ?? parent?.subdomain_id ?? null;
        successCriterionFkMap.set(sc.id, { subject_id, domain_id, subdomain_id, objective_id: sc.objective_id });
        return {
          id: sc.legacy_id ?? sc.id,
          id_new: sc.id,
          text: sc.text,
          objective_id_uuid: sc.objective_id,
          subject_id_uuid: subject_id,
          domain_id_uuid: domain_id,
          subdomain_id_uuid: subdomain_id,
        };
      });
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('success_criteria').upsert(c, { onConflict: 'id' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('success_criteria', error) }, 200);
        counts.success_criteria += c.length;
      }
      console.log(`✓ success_criteria ${counts.success_criteria}`);
    }

    // ----------------------------------------------------------------------
    // 6. Tasks — backfill mirror FKs from parent success_criterion → objective
    // ----------------------------------------------------------------------
    if (bundle.tasks?.length) {
      const rows = bundle.tasks.map(t => {
        const parent = successCriterionFkMap.get(t.success_criterion_id);
        return {
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
          subject_id_uuid: t.subject_id ?? parent?.subject_id ?? null,
          domain_id_uuid: t.domain_id ?? parent?.domain_id ?? null,
          subdomain_id_uuid: t.subdomain_id ?? parent?.subdomain_id ?? null,
        };
      });
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from('tasks').upsert(c, { onConflict: 'id' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('tasks', error) }, 200);
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
        objective_id: l.objective_id,
        order_index: l.order_index ?? 0,
      }));
      for (const c of chunk(rows, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin
          .from('topic_objective_links')
          .upsert(c, { onConflict: 'topic_id,objective_id_uuid' });
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('topic_objective_links', error) }, 200);
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
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics: diagFromPgError('lessons', error) }, 200);
        counts.lessons += c.length;
      }
      console.log(`✓ lessons ${counts.lessons}`);
    }

    // ----------------------------------------------------------------------
    // 9. Verification
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
    }
    const allClean = Object.values(verification).every(v => v === 0);

    return jsonResponse({
      success: true,
      message: allClean
        ? '✅ Curriculum imported, all FKs resolved.'
        : '⚠️ Imported but some FKs are NULL — see verification.',
      mode,
      counts,
      verification: {
        ready_for_phase_3: allClean,
        nullChecks: verification,
      },
      ready_for_phase_3: allClean,
    });
  } catch (error) {
    console.error('Error importing curriculum bundle:', error);
    return jsonResponse({
      success: false,
      error: (error as Error).message ?? 'Unknown error',
      diagnostics: { code: null, message: (error as Error).message, details: null, hint: null, table: 'unknown' },
    }, 200);
  }
});
