import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      // Remove surrounding quotes if present
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase URL or Anon Key. Please check your .env file.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function runDiagnostics() {
  console.log(`=== DNB Visibility Diagnostics ===`);
  console.log(`Using ${SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'} client`);

  console.log('\n--- A. exam_papers ---');
  
  const { count: epTotalCount } = await client.from('exam_papers').select('*', { count: 'exact', head: true }).eq('exam', 'dnb');
  console.log(`Total exam_papers (exam='dnb'): ${epTotalCount ?? 'N/A'}`);

  const { count: ep3emeCount } = await client.from('exam_papers').select('*', { count: 'exact', head: true }).eq('exam', 'dnb').eq('level', '3eme');
  console.log(`Total exam_papers (exam='dnb', level='3eme'): ${ep3emeCount ?? 'N/A'}`);

  const { data: epDistinctLevels } = await client.from('exam_papers').select('level').eq('exam', 'dnb');
  const distinctEPLevels = [...new Set((epDistinctLevels || []).map(r => r.level))];
  console.log(`Distinct exam_papers levels (exam='dnb'):`, distinctEPLevels);

  const { data: epDistinctDisciplines } = await client.from('exam_papers').select('discipline').eq('exam', 'dnb');
  const distinctEPDisciplines = [...new Set((epDistinctDisciplines || []).map(r => r.discipline))];
  console.log(`Distinct exam_papers disciplines (exam='dnb'):`, distinctEPDisciplines);


  console.log('\n--- B. exam_training_items ---');

  const { count: tiTotalCount } = await client.from('exam_training_items').select('*', { count: 'exact', head: true }).eq('exam', 'dnb');
  console.log(`Total exam_training_items (exam='dnb'): ${tiTotalCount ?? 'N/A'}`);

  const { count: ti3emeCount } = await client.from('exam_training_items').select('*', { count: 'exact', head: true }).eq('exam', 'dnb').eq('level', '3eme');
  console.log(`Total exam_training_items (exam='dnb', level='3eme'): ${ti3emeCount ?? 'N/A'}`);

  const { count: ti3emePublishedCount } = await client.from('exam_training_items').select('*', { count: 'exact', head: true }).eq('exam', 'dnb').eq('level', '3eme').eq('status', 'published');
  console.log(`Total exam_training_items (exam='dnb', level='3eme', status='published'): ${ti3emePublishedCount ?? 'N/A'}`);

  const { data: tiDistinctLevels } = await client.from('exam_training_items').select('level').eq('exam', 'dnb');
  const distinctTILevels = [...new Set((tiDistinctLevels || []).map(r => r.level))];
  console.log(`Distinct exam_training_items levels (exam='dnb'):`, distinctTILevels);

  const { data: tiDistinctSubjects } = await client.from('exam_training_items').select('subject_slug').eq('exam', 'dnb');
  const distinctTISubjects = [...new Set((tiDistinctSubjects || []).map(r => r.subject_slug))];
  console.log(`Distinct exam_training_items subject_slugs (exam='dnb'):`, distinctTISubjects);

  const { data: tiDistinctStatus } = await client.from('exam_training_items').select('status').eq('exam', 'dnb');
  const distinctTIStatus = [...new Set((tiDistinctStatus || []).map(r => r.status))];
  console.log(`Distinct exam_training_items status (exam='dnb'):`, distinctTIStatus);

  console.log('\n--- C. Access test for mathematics ---');
  
  const subjectAliases = ['mathematiques', 'mathematics', 'maths'];
  const { data: testMath } = await client
    .from('exam_training_items')
    .select('id, subject_slug, status')
    .eq('level', '3eme')
    .eq('status', 'published')
    .in('subject_slug', subjectAliases);

  console.log(`Query math for 3eme published training items: found ${testMath?.length ?? 0}`);

}

runDiagnostics().catch(console.error);
