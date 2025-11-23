import 'dotenv/config';

import fs from 'fs';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
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

async function main() {
  const bundle = JSON.parse(fs.readFileSync('./bundle.json', 'utf-8'));

  const domains = [...new Set(bundle.domains.map(d => d.domain))].map(domain => ({ domain }));
  await upsert('domains', domains, 'domain');

  const subdomains = bundle.subdomains.map(s => ({ domain: s.domain, subdomain: s.subdomain }));
  await upsert('subdomains', subdomains, 'domain,subdomain');

  const objectives = bundle.objectives.map(o => ({
    id: o.id, level: o.level, domain: o.domain, subdomain: o.subdomain,
    text: o.text, notes_from_prog: o.notes_from_prog ?? ''
  }));
  await upsert('objectives', objectives, 'id');

  const sc = bundle.success_criteria.map(c => ({
    id: c.id, objective_id: c.objective_id, text: c.text
  }));
  await upsert('success_criteria', sc, 'id');

  const tasks = bundle.tasks.map(t => ({
    id: t.id, success_criterion_id: t.success_criterion_id, type: t.type,
    stem: t.stem, solution: t.solution ?? '', rubric: t.rubric ?? ''
  }));
  await upsert('tasks', tasks, 'id');

  const units = bundle.units.map(u => ({
    id: u.id, level: u.level, domain: u.domain, subdomain: u.subdomain,
    title: u.title, duration_weeks: u.duration_weeks ?? null
  }));
  await upsert('units', units, 'id');

  const lessons = bundle.lessons.map(l => ({
    id: l.id, unit_id: l.unit_id, title: l.title,
    objective_ids: l.objective_ids ?? [], success_criterion_ids: l.success_criterion_ids ?? [],
    materials: l.materials ?? '', teacher_talk: l.teacher_talk ?? '',
    student_worksheet: l.student_worksheet ?? '', misconceptions: l.misconceptions ?? ''
  }));
  await upsert('lessons', lessons, 'id');

  console.log('All done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
