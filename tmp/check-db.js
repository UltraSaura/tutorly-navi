import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
);

async function check() {
  const { data: papers, error: papersError } = await supabase
    .from('exam_papers')
    .select('exam, discipline, level');

  if (papersError) console.error(papersError);
  
  const papersGroup = {};
  papers?.forEach(p => {
    const key = `${p.exam}|${p.discipline}|${p.level}`;
    papersGroup[key] = (papersGroup[key] || 0) + 1;
  });
  console.log('--- EXAM PAPERS ---');
  console.table(Object.entries(papersGroup).map(([k, v]) => {
    const [exam, discipline, level] = k.split('|');
    return { exam, discipline, level, count: v };
  }));

  const { data: items, error: itemsError } = await supabase
    .from('exam_training_items')
    .select('exam, subject_slug, level, status');

  if (itemsError) console.error(itemsError);
  
  const itemsGroup = {};
  items?.forEach(i => {
    const key = `${i.exam}|${i.subject_slug}|${i.level}|${i.status}`;
    itemsGroup[key] = (itemsGroup[key] || 0) + 1;
  });
  console.log('\n--- EXAM TRAINING ITEMS ---');
  console.table(Object.entries(itemsGroup).map(([k, v]) => {
    const [exam, subject_slug, level, status] = k.split('|');
    return { exam, subject_slug, level, status, count: v };
  }));
}

check();
