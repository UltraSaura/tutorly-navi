import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ImportMode = 'upsert' | 'replace';

interface TrainingItem {
  id: string;
  source_exercise_id?: string | null;
  paper_id?: string | null;
  exam: string;
  subject_slug: string;
  level?: string | null;
  skill_tags?: string[];
  curriculum_objective_ids?: string[] | null;
  item_type: string;
  prompt: string;
  context?: string | null;
  documents?: unknown[];
  choices?: unknown[] | null;
  expected_answer?: unknown | null;
  solution?: string | null;
  hints?: unknown[] | null;
  questions?: unknown[];
  difficulty: string;
  exam_style?: string | null;
  source_year?: number | null;
  source_label?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
}

interface Payload {
  mode?: ImportMode;
  training_items?: TrainingItem[];
}

const TRAINING_ITEMS_MIGRATION_VERSION = '20260508160000';
const TRAINING_ITEMS_MIGRATION_NAME = 'create_exam_training_items';
const TRAINING_ITEM_GUIDANCE_MIGRATION_VERSION = '20260508170000';
const TRAINING_ITEM_GUIDANCE_MIGRATION_NAME = 'training_item_question_guidance';

const trainingItemsSchemaSql = `
create table if not exists public.exam_training_items (
  id uuid primary key,
  source_exercise_id uuid references public.exam_exercises(id) on delete set null,
  paper_id uuid references public.exam_papers(id) on delete set null,
  exam text not null,
  subject_slug text not null,
  level text not null,
  skill_tags text[] not null default '{}',
  curriculum_objective_ids uuid[],
  item_type text not null check (
    item_type in (
      'multiple_choice',
      'short_answer',
      'numeric',
      'free_response',
      'guided_problem',
      'document_question',
      'proof',
      'calculation'
    )
  ),
  prompt text not null,
  context text,
  documents jsonb not null default '[]'::jsonb,
  choices jsonb,
  expected_answer jsonb,
  solution text,
  hints jsonb,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  exam_style text,
  source_year integer,
  source_label text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exam_training_items
  add column if not exists questions jsonb not null default '[]'::jsonb;

create index if not exists idx_exam_training_items_subject_slug
  on public.exam_training_items (subject_slug);
create index if not exists idx_exam_training_items_level
  on public.exam_training_items (level);
create index if not exists idx_exam_training_items_item_type
  on public.exam_training_items (item_type);
create index if not exists idx_exam_training_items_difficulty
  on public.exam_training_items (difficulty);
create index if not exists idx_exam_training_items_status
  on public.exam_training_items (status);
create index if not exists idx_exam_training_items_source_year
  on public.exam_training_items (source_year);
create index if not exists idx_exam_training_items_skill_tags_gin
  on public.exam_training_items using gin (skill_tags);

drop trigger if exists update_exam_training_items_updated_at on public.exam_training_items;
create trigger update_exam_training_items_updated_at
  before update on public.exam_training_items
  for each row
  execute function public.update_updated_at_column();

alter table public.exam_training_items enable row level security;

drop policy if exists "Students can read published exam training items" on public.exam_training_items;
create policy "Students can read published exam training items"
  on public.exam_training_items for select
  to authenticated
  using (status = 'published');

drop policy if exists "Admins can read all exam training items" on public.exam_training_items;
create policy "Admins can read all exam training items"
  on public.exam_training_items for select
  using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.training_item_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.exam_training_items(id) on delete cascade,
  question_id text not null,
  answer_text text not null default '',
  hint_level integer not null default 0,
  guidance_feedback text,
  is_correct boolean,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_training_item_answers_item_question
  on public.training_item_answers (item_id, question_id);
create index if not exists idx_training_item_answers_user_submitted
  on public.training_item_answers (user_id, submitted_at desc);

alter table public.training_item_answers enable row level security;

drop policy if exists "Students can insert their own training item answers" on public.training_item_answers;
create policy "Students can insert their own training item answers"
  on public.training_item_answers for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Students can read their own training item answers" on public.training_item_answers;
create policy "Students can read their own training item answers"
  on public.training_item_answers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read training item answers" on public.training_item_answers;
create policy "Admins can read training item answers"
  on public.training_item_answers for select
  using (public.has_role(auth.uid(), 'admin'));
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function levelForExam(exam: string | undefined | null): string | null {
  if (exam === 'dnb') return '3eme';
  if (exam === 'bac') return 'terminale';
  if (exam === 'bac_francais') return '1ere';
  if (exam === 'cap') return 'cap';
  return null;
}

function resolveTrainingItemLevel(item: TrainingItem): string {
  return item.level?.trim() || levelForExam(item.exam) || 'unknown';
}

async function ensureTrainingItemsSchema(): Promise<void> {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) throw new Error('SUPABASE_DB_URL is not configured');

  const client = new Client(dbUrl);
  try {
    await client.connect();
    await client.queryArray(trainingItemsSchemaSql);
    await client.queryArray(
      `
      insert into supabase_migrations.schema_migrations(version, name, statements)
      values ($1, $2, $3::text[])
      on conflict (version) do nothing
      `,
      [TRAINING_ITEMS_MIGRATION_VERSION, TRAINING_ITEMS_MIGRATION_NAME, [trainingItemsSchemaSql]],
    );
    await client.queryArray(
      `
      insert into supabase_migrations.schema_migrations(version, name, statements)
      values ($1, $2, $3::text[])
      on conflict (version) do nothing
      `,
      [TRAINING_ITEM_GUIDANCE_MIGRATION_VERSION, TRAINING_ITEM_GUIDANCE_MIGRATION_NAME, [trainingItemsSchemaSql]],
    );
    await client.queryArray(`select pg_notify('pgrst', 'reload schema')`);
  } finally {
    await client.end();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ success: false, error: 'No authorization header' }, 200);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let isAuthorized = token === serviceKey;

    if (!isAuthorized) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        isAuthorized = (roles ?? []).length > 0;
      }
    }

    if (!isAuthorized) return jsonResponse({ success: false, error: 'Unauthorized' }, 200);

    const payload: Payload = await req.json();
    const mode: ImportMode = payload.mode === 'replace' ? 'replace' : 'upsert';
    const items = payload.training_items ?? [];
    const diagnostics: Array<{ code: string; message: string }> = [];

    await ensureTrainingItemsSchema();

    if (mode === 'replace' && items.length > 0) {
      const ids = items.map((item) => item.id);
      for (const batch of chunk(ids, 100)) {
        const { error } = await supabaseAdmin.from('exam_training_items').delete().in('id', batch);
        if (error) return jsonResponse({ success: false, error: error.message, diagnostics }, 200);
      }
    }

    let count = 0;
    const rows = items.map((item) => ({
      id: item.id,
      source_exercise_id: item.source_exercise_id ?? null,
      paper_id: item.paper_id ?? null,
      exam: item.exam,
      subject_slug: item.subject_slug,
      level: resolveTrainingItemLevel(item),
      skill_tags: item.skill_tags ?? [],
      curriculum_objective_ids: item.curriculum_objective_ids ?? null,
      item_type: item.item_type,
      prompt: item.prompt,
      context: item.context ?? null,
      documents: item.documents ?? [],
      choices: item.choices ?? null,
      expected_answer: item.expected_answer ?? null,
      solution: item.solution ?? null,
      hints: item.hints ?? null,
      questions: item.questions ?? [],
      difficulty: item.difficulty,
      exam_style: item.exam_style ?? null,
      source_year: item.source_year ?? null,
      source_label: item.source_label ?? null,
      metadata: item.metadata ?? {},
      status: item.status ?? 'draft',
      updated_at: new Date().toISOString(),
    }));

    for (const batch of chunk(rows, 100)) {
      const { error } = await supabaseAdmin.from('exam_training_items').upsert(batch, { onConflict: 'id' });
      if (error) return jsonResponse({ success: false, error: error.message, diagnostics }, 200);
      count += batch.length;
    }

    return jsonResponse({
      success: true,
      mode,
      counts: { training_items: count },
      diagnostics,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      diagnostics: [{ code: 'UNKNOWN', message: error instanceof Error ? error.message : String(error) }],
    }, 200);
  }
});
