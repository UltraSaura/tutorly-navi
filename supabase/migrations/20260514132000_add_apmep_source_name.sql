-- Allow 'apmep' as a valid source_name for APMEP LaTeX-sourced exams

alter table exam_sources
  drop constraint if exists exam_sources_source_name_check,
  add constraint exam_sources_source_name_check
    check (source_name in ('eduscol', 'ac-amiens-maths', 'apmep'));

alter table exam_papers
  drop constraint if exists exam_papers_source_name_check,
  add constraint exam_papers_source_name_check
    check (source_name in ('eduscol', 'ac-amiens-maths', 'apmep'));

alter table exam_exercises
  drop constraint if exists exam_exercises_source_name_check,
  add constraint exam_exercises_source_name_check
    check (source_name in ('eduscol', 'ac-amiens-maths', 'apmep'));
