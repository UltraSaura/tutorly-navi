-- Teacher review links are already bearer-token scoped. Return the subject so
-- the review page can filter the shared drafts by curriculum subject.
drop function if exists public.get_teacher_review_drafts(text);

create function public.get_teacher_review_drafts(p_token text)
returns table (
  id uuid,
  topic_id uuid,
  topic_name text,
  subject_name text,
  curriculum_level_code text,
  created_at timestamptz,
  lesson_content jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,
         v.topic_id,
         coalesce(t.name, 'Sujet'),
         coalesce(s.name, 'Matière non renseignée'),
         t.curriculum_level_code,
         v.created_at,
         v.lesson_content
  from public.teacher_review_share_tokens as share
  join public.topic_lesson_versions as v on v.status = 'draft'
  join public.topics as t on t.id = v.topic_id
  left join public.subjects as s on s.id = t.curriculum_subject_id::uuid
  where share.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and share.revoked_at is null
    and (share.expires_at is null or share.expires_at > now())
  order by v.created_at desc;
$$;

revoke all on function public.get_teacher_review_drafts(text) from public;
grant execute on function public.get_teacher_review_drafts(text) to anon, authenticated;
