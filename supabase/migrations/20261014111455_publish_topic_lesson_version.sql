alter table public.topic_lesson_versions
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id) on delete restrict,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete restrict;

create or replace function public.publish_topic_lesson_version(
  p_version_id uuid,
  p_topic_id uuid,
  p_confirm boolean default false
)
returns public.topic_lesson_versions
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  version_row public.topic_lesson_versions;
  published_row public.topic_lesson_versions;
begin
  if not p_confirm then
    raise exception 'Explicit confirmation is required to publish a lesson version' using errcode = '42501';
  end if;

  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only administrators can publish lesson versions' using errcode = '42501';
  end if;

  select * into version_row
  from public.topic_lesson_versions
  where id = p_version_id
    and topic_id = p_topic_id
    and status = 'validated'
  for update;

  if not found then
    raise exception 'Only a validated version for the intended topic can be published' using errcode = '23514';
  end if;

  update public.topics
  set lesson_content = version_row.lesson_content,
      updated_at = now()
  where id = p_topic_id;

  if not found then
    raise exception 'Target topic was not found or is not writable' using errcode = '42501';
  end if;

  update public.topic_lesson_versions
  set status = 'published',
      published_at = now(),
      published_by = auth.uid(),
      updated_at = now()
  where id = p_version_id
  returning * into published_row;

  return published_row;
end;
$$;

revoke all on function public.publish_topic_lesson_version(uuid, uuid, boolean) from public;
grant execute on function public.publish_topic_lesson_version(uuid, uuid, boolean) to authenticated;
