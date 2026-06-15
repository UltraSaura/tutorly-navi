-- ===== HARDENING CHECKS (are last turn's fixes in?) =====
-- H1: placeholder editions should be 'projet', not 'active'
select subject, cycle, status from public.curriculum_edition
where cycle = 'cycle 3 ancien' order by subject;

-- H2: resolve_edition should join curriculum_edition on status = 'active'
select pg_get_functiondef('public.resolve_edition'::regproc);

-- H3: unique constraint should be NULLS NOT DISTINCT
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.curriculum_applicability'::regclass and contype = 'u';

-- H4: do objectives/success_criteria actually have created_at? (the service orders by it)
select table_name, column_name from information_schema.columns
where table_schema='public' and table_name in ('objectives','success_criteria')
  and column_name='created_at' order by table_name;

-- ===== FUNCTIONAL CHECKS =====
-- Q1: school-year boundary
select public.current_school_year(date '2026-03-01') as march_2026,
       public.current_school_year(date '2026-10-01') as oct_2026;

-- Q2: 6e maths in 2025-2026 -> new cycle-3 programme
select 'Q2' as q, e.bo_reference, e.cycle, e.status from public.curriculum_edition e
where e.id = public.resolve_edition('6e','mathematiques', null, date '2026-03-01');

-- Q3: CM2 maths in 2025-2026 -> SAFE result is ZERO ROWS (old programme not ready)
select 'Q3' as q, e.bo_reference, e.cycle, e.status from public.curriculum_edition e
where e.id = public.resolve_edition('CM2','mathematiques', null, date '2026-03-01');

-- Q4: CM2 maths in 2026-2027 -> new cycle-3 programme (planned flip)
select 'Q4' as q, e.bo_reference, e.cycle, e.status from public.curriculum_edition e
where e.id = public.resolve_edition('CM2','mathematiques', null, date '2026-10-01');
