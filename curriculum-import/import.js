import 'dotenv/config';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function chunk(arr, size = 500) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsert(table, rows, conflictTarget) {
  if (!rows || rows.length === 0) return;
  for (const group of chunk(rows, 500)) {
    const { error } = await supabase.from(table).upsert(group, { onConflict: conflictTarget });
    if (error) throw new Error(`Upsert ${table}: ${error.message}`);
  }
  console.log(`✓ ${table} ${rows.length}`);
}

/**
 * Transform a raw bundle (text codes / no UUIDs) into a UUID-based bundle
 * suitable for the Phase 2 schema. If your bundle.json already has UUIDs,
 * this is a no-op pass-through.
 */
function ensureUuids(bundle) {
  // Maps from natural keys → generated UUIDs
  const subjectBySlug = new Map();
  const domainByKey = new Map();      // `${subject_id}::${code}` → uuid
  const subdomainByKey = new Map();   // `${domain_id}::${code}` → uuid
  const objectiveByLegacy = new Map();
  const scByLegacy = new Map();

  // ---- subjects ----
  const subjects = (bundle.subjects ?? []).map(s => {
    const id = s.id && /^[0-9a-f-]{36}$/i.test(s.id) ? s.id : randomUUID();
    subjectBySlug.set(s.slug, id);
    return { ...s, id };
  });

  // ---- domains ----
  const domains = (bundle.domains ?? []).map(d => {
    const subject_id = d.subject_id && /^[0-9a-f-]{36}$/i.test(d.subject_id)
      ? d.subject_id
      : subjectBySlug.get(d.subject_slug ?? d.subject_id);
    const id = d.id && /^[0-9a-f-]{36}$/i.test(d.id) ? d.id : randomUUID();
    domainByKey.set(`${subject_id}::${d.code}`, id);
    return { ...d, id, subject_id };
  });

  // ---- subdomains ----
  const subdomains = (bundle.subdomains ?? []).map(s => {
    const subject_id = s.subject_id && /^[0-9a-f-]{36}$/i.test(s.subject_id)
      ? s.subject_id
      : subjectBySlug.get(s.subject_slug ?? s.subject_id);
    const domain_id = s.domain_id && /^[0-9a-f-]{36}$/i.test(s.domain_id)
      ? s.domain_id
      : domainByKey.get(`${subject_id}::${s.domain_code ?? s.domain}`);
    const id = s.id && /^[0-9a-f-]{36}$/i.test(s.id) ? s.id : randomUUID();
    subdomainByKey.set(`${domain_id}::${s.code}`, id);
    return { ...s, id, subject_id, domain_id };
  });

  // ---- objectives ----
  const objectives = (bundle.objectives ?? []).map(o => {
    const subject_id = o.subject_id && /^[0-9a-f-]{36}$/i.test(o.subject_id)
      ? o.subject_id
      : subjectBySlug.get(o.subject_slug);
    const domain_id = o.domain_id && /^[0-9a-f-]{36}$/i.test(o.domain_id)
      ? o.domain_id
      : domainByKey.get(`${subject_id}::${o.domain_code ?? o.domain}`);
    const subdomain_id = o.subdomain_id && /^[0-9a-f-]{36}$/i.test(o.subdomain_id)
      ? o.subdomain_id
      : subdomainByKey.get(`${domain_id}::${o.subdomain_code ?? o.subdomain}`);
    const id = randomUUID();
    objectiveByLegacy.set(o.id, id);
    return {
      id,
      legacy_id: o.id,
      subject_id,
      domain_id,
      subdomain_id,
      level: o.level,
      text: o.text,
      notes_from_prog: o.notes_from_prog ?? '',
      keywords: o.keywords ?? [],
      domain: o.domain,
      subdomain: o.subdomain,
    };
  });

  // ---- success criteria ----
  const success_criteria = (bundle.success_criteria ?? []).map(sc => {
    const objective_id = objectiveByLegacy.get(sc.objective_id) ?? sc.objective_id;
    const id = randomUUID();
    scByLegacy.set(sc.id, id);
    const parent = objectives.find(o => o.id === objective_id);
    return {
      id,
      legacy_id: sc.id,
      objective_id,
      subject_id: parent?.subject_id ?? null,
      domain_id: parent?.domain_id ?? null,
      subdomain_id: parent?.subdomain_id ?? null,
      text: sc.text,
    };
  });

  // ---- tasks ----
  const tasks = (bundle.tasks ?? []).map(t => {
    const success_criterion_id = scByLegacy.get(t.success_criterion_id) ?? t.success_criterion_id;
    const parentSc = success_criteria.find(s => s.id === success_criterion_id);
    return {
      id: randomUUID(),
      legacy_id: t.id,
      success_criterion_id,
      subject_id: parentSc?.subject_id ?? null,
      domain_id: parentSc?.domain_id ?? null,
      subdomain_id: parentSc?.subdomain_id ?? null,
      type: t.type,
      stem: t.stem,
      solution: t.solution ?? '',
      rubric: t.rubric ?? '',
      difficulty: t.difficulty ?? 'core',
      tags: t.tags ?? [],
      source: t.source ?? 'auto',
    };
  });

  // ---- topic_objective_links ----
  const topic_objective_links = (bundle.topic_objective_links ?? []).map(l => ({
    id: randomUUID(),
    topic_id: l.topic_id,
    objective_id: objectiveByLegacy.get(l.objective_id) ?? l.objective_id,
    order_index: l.order_index ?? 0,
  }));

  // ---- lessons ----
  const lessons = (bundle.lessons ?? []).map(l => ({
    id: randomUUID(),
    legacy_id: l.id,
    topic_id: l.topic_id ?? null,
    title: l.title,
    objective_ids: l.objective_ids ?? [],
    success_criterion_ids: l.success_criterion_ids ?? [],
    materials: l.materials ?? '',
    misconceptions: l.misconceptions ?? '',
    teacher_talk: l.teacher_talk ?? '',
    student_worksheet: l.student_worksheet ?? '',
  }));

  return {
    subjects,
    domains,
    subdomains,
    objectives,
    success_criteria,
    tasks,
    topic_objective_links,
    lessons,
  };
}

async function main() {
  const raw = JSON.parse(fs.readFileSync('./bundle.json', 'utf-8'));
  const bundle = ensureUuids(raw);

  // Subjects → Domains → Subdomains → Objectives → SC → Tasks → Links → Lessons
  await upsert('subjects', bundle.subjects, 'id');
  await upsert('domains', bundle.domains, 'id');

  // subdomains: bigint id is auto, conflict on uuid id_new
  const subdomainRows = bundle.subdomains.map(s => ({
    id_new: s.id,
    subject_id: s.subject_id,
    domain_id_new: s.domain_id,
    code: s.code,
    label: s.label,
    domain: s.domain ?? null,
    subdomain: s.subdomain ?? s.label,
  }));
  await upsert('subdomains', subdomainRows, 'id_new');

  const objectiveRows = bundle.objectives.map(o => ({
    id: o.legacy_id ?? o.id,
    id_new: o.id,
    level: o.level,
    text: o.text,
    notes_from_prog: o.notes_from_prog,
    keywords: o.keywords,
    subject_id_uuid: o.subject_id,
    domain_id_uuid: o.domain_id,
    subdomain_id_uuid: o.subdomain_id,
    domain: o.domain ?? null,
    subdomain: o.subdomain ?? '',
  }));
  await upsert('objectives', objectiveRows, 'id');

  const scRows = bundle.success_criteria.map(sc => ({
    id: sc.legacy_id ?? sc.id,
    id_new: sc.id,
    text: sc.text,
    objective_id_uuid: sc.objective_id,
    subject_id_uuid: sc.subject_id,
    domain_id_uuid: sc.domain_id,
    subdomain_id_uuid: sc.subdomain_id,
  }));
  await upsert('success_criteria', scRows, 'id');

  const taskRows = bundle.tasks.map(t => ({
    id: t.legacy_id ?? t.id,
    id_new: t.id,
    type: t.type,
    stem: t.stem,
    solution: t.solution,
    rubric: t.rubric,
    difficulty: t.difficulty,
    tags: t.tags,
    source: t.source,
    success_criterion_id_uuid: t.success_criterion_id,
    subject_id_uuid: t.subject_id,
    domain_id_uuid: t.domain_id,
    subdomain_id_uuid: t.subdomain_id,
  }));
  await upsert('tasks', taskRows, 'id');

  const linkRows = bundle.topic_objective_links.map(l => ({
    id: l.id,
    topic_id: l.topic_id,
    objective_id_uuid: l.objective_id,
    objective_id: l.objective_id, // legacy text col is NOT NULL
    order_index: l.order_index,
  }));
  await upsert('topic_objective_links', linkRows, 'topic_id,objective_id_uuid');

  const lessonRows = bundle.lessons.map(l => ({
    id: l.legacy_id ?? l.id,
    id_new: l.id,
    title: l.title,
    topic_id: l.topic_id,
    objective_ids: l.objective_ids,
    success_criterion_ids: l.success_criterion_ids,
    materials: l.materials,
    misconceptions: l.misconceptions,
    teacher_talk: l.teacher_talk,
    student_worksheet: l.student_worksheet,
  }));
  await upsert('lessons', lessonRows, 'id');

  console.log('All done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
