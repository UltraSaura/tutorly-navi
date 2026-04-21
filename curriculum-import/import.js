import 'dotenv/config';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- helpers ----------
const chunk = (arr, n = 200) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

async function upsert(table, rows, conflictTarget) {
  if (!rows?.length) return;
  for (const group of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(group, { onConflict: conflictTarget });
    if (error) throw new Error(`Upsert ${table}: ${error.message}`);
  }
  console.log(`  ✓ ${table}: ${rows.length}`);
}

// ---------- resolvers ----------
async function loadSubjectMap() {
  const { data, error } = await supabase.from('subjects').select('id, slug');
  if (error) throw error;
  const m = new Map();
  for (const r of data) m.set(r.slug, r.id);
  return m;
}

async function loadDomainMap() {
  const { data, error } = await supabase.from('domains').select('id, subject_id, code, domain');
  if (error) throw error;
  const byKey = new Map();   // `${subject_id}::${code}` → id
  const byText = new Map();  // `${domain}` → id (legacy fallback)
  for (const r of data) {
    if (r.subject_id && r.code) byKey.set(`${r.subject_id}::${r.code}`, r.id);
    if (r.domain) byText.set(r.domain, r.id);
  }
  return { byKey, byText };
}

async function loadSubdomainMap() {
  const { data, error } = await supabase
    .from('subdomains')
    .select('id_new, domain_id_new, subject_id, code, domain, subdomain');
  if (error) throw error;
  const byKey = new Map(); // `${domain_id_new}::${code}` → id_new
  const byNat = new Map(); // `${domain}::${subdomain}` → id_new (legacy fallback)
  for (const r of data) {
    if (r.domain_id_new && r.code) byKey.set(`${r.domain_id_new}::${r.code}`, r.id_new);
    if (r.domain && r.subdomain) byNat.set(`${r.domain}::${r.subdomain}`, r.id_new);
  }
  return { byKey, byNat };
}

// ---------- transform pass ----------
function transform(bundle) {
  const subjectBySlug = new Map();
  const domainByKey = new Map();
  const subdomainByKey = new Map();
  const objByLegacy = new Map();
  const scByLegacy = new Map();

  const subjects = (bundle.subjects ?? []).map(s => {
    const id = isUuid(s.id) ? s.id : randomUUID();
    subjectBySlug.set(s.slug, id);
    return { ...s, id };
  });

  const domains = (bundle.domains ?? []).map(d => {
    const subject_id = isUuid(d.subject_id)
      ? d.subject_id
      : subjectBySlug.get(d.subject_slug ?? d.subject_id);
    const id = isUuid(d.id) ? d.id : randomUUID();
    domainByKey.set(`${subject_id}::${d.code}`, id);
    return { ...d, id, subject_id };
  });

  const subdomains = (bundle.subdomains ?? []).map(s => {
    const subject_id = isUuid(s.subject_id)
      ? s.subject_id
      : subjectBySlug.get(s.subject_slug ?? s.subject_id);
    const domain_id = isUuid(s.domain_id)
      ? s.domain_id
      : domainByKey.get(`${subject_id}::${s.domain_code ?? s.domain}`);
    const id = isUuid(s.id) ? s.id : randomUUID();
    subdomainByKey.set(`${domain_id}::${s.code}`, id);
    return { ...s, id, subject_id, domain_id };
  });

  const objectives = (bundle.objectives ?? []).map(o => {
    const subject_id = isUuid(o.subject_id) ? o.subject_id : subjectBySlug.get(o.subject_slug);
    const domain_id = isUuid(o.domain_id)
      ? o.domain_id
      : domainByKey.get(`${subject_id}::${o.domain_code ?? o.domain}`);
    const subdomain_id = isUuid(o.subdomain_id)
      ? o.subdomain_id
      : subdomainByKey.get(`${domain_id}::${o.subdomain_code ?? o.subdomain}`);
    const id = randomUUID();
    objByLegacy.set(o.id, id);
    return {
      id, legacy_id: o.id, subject_id, domain_id, subdomain_id,
      level: o.level, text: o.text,
      notes_from_prog: o.notes_from_prog ?? '',
      keywords: o.keywords ?? [],
      domain: o.domain, subdomain: o.subdomain,
    };
  });

  const success_criteria = (bundle.success_criteria ?? []).map(sc => {
    const objective_id = objByLegacy.get(sc.objective_id) ?? sc.objective_id;
    const id = randomUUID();
    scByLegacy.set(sc.id, id);
    const parent = objectives.find(o => o.id === objective_id);
    return {
      id, legacy_id: sc.id, objective_id,
      subject_id: parent?.subject_id ?? null,
      domain_id: parent?.domain_id ?? null,
      subdomain_id: parent?.subdomain_id ?? null,
      text: sc.text,
    };
  });

  const tasks = (bundle.tasks ?? []).map(t => {
    const success_criterion_id = scByLegacy.get(t.success_criterion_id) ?? t.success_criterion_id;
    const parentSc = success_criteria.find(s => s.id === success_criterion_id);
    return {
      id: randomUUID(), legacy_id: t.id, success_criterion_id,
      subject_id: parentSc?.subject_id ?? null,
      domain_id: parentSc?.domain_id ?? null,
      subdomain_id: parentSc?.subdomain_id ?? null,
      type: t.type, stem: t.stem,
      solution: t.solution ?? '', rubric: t.rubric ?? '',
      difficulty: t.difficulty ?? 'core',
      tags: t.tags ?? [], source: t.source ?? 'auto',
    };
  });

  const topic_objective_links = (bundle.topic_objective_links ?? []).map(l => ({
    id: randomUUID(),
    topic_id: l.topic_id,
    objective_id: objByLegacy.get(l.objective_id) ?? l.objective_id,
    order_index: l.order_index ?? 0,
  }));

  const lessons = (bundle.lessons ?? []).map(l => ({
    id: randomUUID(), legacy_id: l.id,
    topic_id: l.topic_id ?? null, title: l.title,
    objective_ids: l.objective_ids ?? [],
    success_criterion_ids: l.success_criterion_ids ?? [],
    materials: l.materials ?? '', misconceptions: l.misconceptions ?? '',
    teacher_talk: l.teacher_talk ?? '', student_worksheet: l.student_worksheet ?? '',
  }));

  return { subjects, domains, subdomains, objectives, success_criteria, tasks, topic_objective_links, lessons };
}

// ---------- main ----------
async function main() {
  const path = process.argv[2] ?? './bundle.json';
  console.log(`📥 Reading ${path}`);
  const raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const bundle = transform(raw);

  console.log('\n📊 Pre-import bundle counts:');
  for (const k of Object.keys(bundle)) console.log(`  ${k}: ${bundle[k].length}`);

  // 1. Subjects
  console.log('\n🚀 Inserting…');
  await upsert('subjects', bundle.subjects.map(s => ({
    id: s.id, slug: s.slug, name: s.name,
    language: s.language ?? 'en',
    color_scheme: s.color_scheme ?? 'blue',
    icon_name: s.icon_name ?? 'BookOpen',
  })), 'id');

  // 2. Domains  (id is UUID PK; legacy `domain` text col required NOT NULL)
  await upsert('domains', bundle.domains.map(d => ({
    id: d.id, subject_id: d.subject_id, code: d.code, label: d.label,
    domain: d.domain ?? d.code,
  })), 'id');

  // 3. Subdomains (bigint id auto; conflict on id_new uuid)
  await upsert('subdomains', bundle.subdomains.map(s => ({
    id_new: s.id, subject_id: s.subject_id, domain_id_new: s.domain_id,
    code: s.code, label: s.label,
    domain: s.domain ?? null,
    subdomain: s.subdomain ?? s.label,
  })), 'id_new');

  // 4. Objectives (text PK + uuid id_new + uuid FKs)
  await upsert('objectives', bundle.objectives.map(o => ({
    id: o.legacy_id ?? o.id, id_new: o.id,
    level: o.level, text: o.text,
    notes_from_prog: o.notes_from_prog, keywords: o.keywords,
    subject_id_uuid: o.subject_id,
    domain_id_uuid: o.domain_id,
    subdomain_id_uuid: o.subdomain_id,
    domain: o.domain ?? null,
    subdomain: o.subdomain ?? '',
  })), 'id');

  // 5. Success criteria
  await upsert('success_criteria', bundle.success_criteria.map(sc => ({
    id: sc.legacy_id ?? sc.id, id_new: sc.id, text: sc.text,
    objective_id_uuid: sc.objective_id,
    subject_id_uuid: sc.subject_id,
    domain_id_uuid: sc.domain_id,
    subdomain_id_uuid: sc.subdomain_id,
  })), 'id');

  // 6. Tasks
  await upsert('tasks', bundle.tasks.map(t => ({
    id: t.legacy_id ?? t.id, id_new: t.id,
    type: t.type, stem: t.stem, solution: t.solution, rubric: t.rubric,
    difficulty: t.difficulty, tags: t.tags, source: t.source,
    success_criterion_id_uuid: t.success_criterion_id,
    subject_id_uuid: t.subject_id,
    domain_id_uuid: t.domain_id,
    subdomain_id_uuid: t.subdomain_id,
  })), 'id');

  // 7. Topic-objective links (legacy text col is NOT NULL)
  await upsert('topic_objective_links', bundle.topic_objective_links.map(l => ({
    id: l.id, topic_id: l.topic_id,
    objective_id_uuid: l.objective_id,
    objective_id: l.objective_id,
    order_index: l.order_index,
  })), 'topic_id,objective_id_uuid');

  // 8. Lessons
  await upsert('lessons', bundle.lessons.map(l => ({
    id: l.legacy_id ?? l.id, id_new: l.id, title: l.title, topic_id: l.topic_id,
    objective_ids: l.objective_ids, success_criterion_ids: l.success_criterion_ids,
    materials: l.materials, misconceptions: l.misconceptions,
    teacher_talk: l.teacher_talk, student_worksheet: l.student_worksheet,
  })), 'id');

  // ---------- post-import verification ----------
  console.log('\n🔎 Verifying coverage…');
  const checks = [
    ['objectives', 'subdomain_id_uuid'],
    ['objectives', 'domain_id_uuid'],
    ['objectives', 'subject_id_uuid'],
    ['success_criteria', 'objective_id_uuid'],
    ['topic_objective_links', 'objective_id_uuid'],
  ];
  let bad = 0;
  for (const [t, col] of checks) {
    const { count, error } = await supabase
      .from(t).select('*', { count: 'exact', head: true }).is(col, null);
    if (error) throw error;
    const flag = count > 0 ? '❌' : '✓';
    if (count > 0) bad++;
    console.log(`  ${flag} ${t}.${col} NULL = ${count}`);
  }
  if (bad === 0) console.log('\n✅ All FKs resolved. Ready for Phase 3.');
  else console.log(`\n⚠️  ${bad} NULL FK group(s) — fix bundle/transformer before Phase 3.`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });
