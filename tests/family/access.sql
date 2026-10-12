\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.denied(statement text, label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
 RAISE EXCEPTION 'FAIL (access allowed): %',label;
END $$;
INSERT INTO auth.users(id) SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,7) n;
INSERT INTO public.users(id,first_name,user_type) SELECT id, 'User '||right(id::text,1), CASE WHEN right(id::text,1) IN ('1','2') THEN 'parent' ELSE 'student' END FROM auth.users;
INSERT INTO auth.sessions VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000006'),
 ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000007');
INSERT INTO public.guardians VALUES
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','billing-a'),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','billing-b');
INSERT INTO public.children(id,user_id,grade) VALUES
 ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','CM1'),
 ('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','CM1'),
 ('30000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','CM1');
INSERT INTO public.guardian_child_links VALUES
 ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003'),
 ('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000004'),
 ('40000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000005');
INSERT INTO public.user_roles VALUES
 ('00000000-0000-0000-0000-000000000001','teacher'),
 ('00000000-0000-0000-0000-000000000007','admin');
INSERT INTO public.teachers VALUES('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
INSERT INTO public.classes VALUES('71000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001');
INSERT INTO public.class_student_links VALUES('72000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000005','71000000-0000-0000-0000-000000000001');
INSERT INTO public.exercise_history(id,user_id,exercise_content) SELECT ('50000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid, ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Private homework '||n FROM generate_series(3,6)n;
INSERT INTO public.exercise_attempts SELECT ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,('50000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(3,6)n;
INSERT INTO public.user_learning_progress(user_id,progress_type) SELECT user_id,'lesson_completed' FROM public.exercise_history;
INSERT INTO public.quiz_bank_attempts(user_id,score) SELECT user_id,3 FROM public.exercise_history;
INSERT INTO public.chat_messages(user_id,content) SELECT user_id,'Private message' FROM public.exercise_history;
INSERT INTO public.user_points SELECT user_id,50 FROM public.exercise_history;
INSERT INTO public.learner_explanations_cache(exercise_hash,exercise_content,learner_user_id) SELECT 'same-exercise',exercise_content,user_id FROM public.exercise_history;
INSERT INTO public.exercise_explanations_cache(exercise_hash,exercise_content) VALUES('legacy','Unattributed');
INSERT INTO family_private.rollout_accounts(account_id) VALUES('00000000-0000-0000-0000-000000000001');
SELECT public.family_set_pin('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','123456');
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"10000000-0000-0000-0000-000000000001"}',false) AS ignored \gset
SELECT pg_temp.assert((public.family_bootstrap()->>'isFamily')::boolean,'family bootstrap');
SELECT pg_temp.assert(jsonb_array_length(public.family_profiles())=2,'only linked chooser cards');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardians)=0,'PIN required for parent records');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=0,'no learner selected means no homework');
SELECT pg_temp.denied($q$SELECT public.family_select_child('30000000-0000-0000-0000-000000000005')$q$,'another family child rejected');
SELECT pg_temp.denied($q$SELECT public.family_set_pin('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','999999')$q$,'client PIN setup forbidden');
SELECT public.family_select_child('30000000-0000-0000-0000-000000000003')->>'token' AS token_a \gset
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'token_a')::text,false) AS ignored \gset
SELECT pg_temp.assert(public.family_current_learner()='00000000-0000-0000-0000-000000000003','existing child learner UUID');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=1,'child homework isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_attempts)=1,'child attempt isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.chat_messages)=1,'child message isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.quiz_bank_attempts)=1,'child grade isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.user_points)=1,'child points isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.user_learning_progress)=1,'child progress isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.learner_explanations_cache)=1,'private explanation cache isolation');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_explanations_cache)=0,'enrolled family cannot read unowned legacy cache');
SELECT pg_temp.assert(NOT public.has_role('00000000-0000-0000-0000-000000000001','teacher'),'child mode suppresses inherited teacher role');
SELECT pg_temp.assert(NOT family_private.can_read_learner('00000000-0000-0000-0000-000000000005'),'child mode cannot read a teacher class student');
SELECT pg_temp.denied($q$INSERT INTO family_private.rollout_accounts(account_id) VALUES('00000000-0000-0000-0000-000000000002')$q$,'browser cannot enroll another family');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardians)=0,'child cannot access parent billing');
WITH inserted AS (INSERT INTO public.quiz_bank_attempts(user_id,score) VALUES('00000000-0000-0000-0000-000000000003',4) RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM inserted)=1,'selected child can submit quiz attempt');
SELECT pg_temp.denied($q$INSERT INTO public.quiz_bank_attempts(user_id,score) VALUES('00000000-0000-0000-0000-000000000004',4)$q$,'cross-child quiz insertion denied');
WITH changed AS (UPDATE public.quiz_bank_attempts SET score=99 RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM changed)=0,'quiz attempts remain append only');
WITH removed AS (DELETE FROM public.quiz_bank_attempts RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM removed)=0,'quiz attempts cannot be deleted');
WITH inserted AS (INSERT INTO public.spaced_review_states(student_id) VALUES('00000000-0000-0000-0000-000000000003') RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM inserted)=1,'selected child can create spaced review state');
WITH changed AS (UPDATE public.spaced_review_states SET repetitions=1 RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM changed)=1,'selected child can update spaced review state');
SELECT pg_temp.denied($q$INSERT INTO public.spaced_review_states(student_id) VALUES('00000000-0000-0000-0000-000000000004')$q$,'cross-child review insertion denied');
SELECT pg_temp.denied($q$UPDATE public.spaced_review_states SET student_id='00000000-0000-0000-0000-000000000004'$q$,'review ownership cannot be reassigned');
WITH removed AS (DELETE FROM public.spaced_review_states RETURNING id)
SELECT pg_temp.assert((SELECT count(*) FROM removed)=0,'review state deletion remains forbidden');
SELECT pg_temp.denied($q$INSERT INTO public.exercise_history(user_id,exercise_content) VALUES('00000000-0000-0000-0000-000000000004','wrong child')$q$,'cross-child write rejected');
INSERT INTO public.exercise_history(user_id,exercise_content) VALUES('00000000-0000-0000-0000-000000000003','own child');
UPDATE public.users SET style='visual' WHERE id='00000000-0000-0000-0000-000000000003';
SELECT pg_temp.assert((SELECT style FROM public.users WHERE id='00000000-0000-0000-0000-000000000003')='visual','selected child can save preferences through existing approval trigger');
SELECT pg_temp.denied($q$UPDATE public.users SET approval_status='pending' WHERE id='00000000-0000-0000-0000-000000000003'$q$,'selected child cannot change approval');
SELECT pg_temp.denied($q$UPDATE public.users SET user_type='admin' WHERE id='00000000-0000-0000-0000-000000000003'$q$,'child cannot change account fields');
SELECT public.family_select_child('30000000-0000-0000-0000-000000000004')->>'token' AS token_b \gset
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=0,'old grant revoked at profile switch');
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'token_b')::text,false) AS ignored \gset
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=1,'next child sees only own homework');
SELECT pg_temp.assert(public.family_unlock_parent('wrong')->>'error'='invalid_pin','PIN checked server side');
SELECT public.family_unlock_parent('123456')->>'token' AS parent_token \gset
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'parent_token')::text,false) AS ignored \gset
SELECT pg_temp.assert(public.family_parent_authorized(),'server parent authorization');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardians)=1,'parent cannot see another family billing');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardian_child_links)=2,'parent links only their family');
SELECT pg_temp.assert(public.has_role('00000000-0000-0000-0000-000000000001','teacher'),'unlocked parent restores existing teacher role');
SELECT pg_temp.assert(family_private.can_read_learner('00000000-0000-0000-0000-000000000005'),'unlocked teacher can read an assigned class student');
SELECT pg_temp.assert(NOT family_private.can_write_learner('00000000-0000-0000-0000-000000000005'),'teacher access remains read only');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=4,'unlocked teacher sees linked children and assigned class student');
RESET ROLE;
INSERT INTO public.user_roles VALUES('00000000-0000-0000-0000-000000000001','admin');
SET ROLE authenticated;
SELECT pg_temp.assert(public.has_role('00000000-0000-0000-0000-000000000001','admin'),'unlocked parent restores existing admin role');
SELECT pg_temp.assert(family_private.can_write_learner('00000000-0000-0000-0000-000000000006'),'unlocked admin retains cross-user management access');
RESET ROLE;
DELETE FROM public.user_roles WHERE user_id='00000000-0000-0000-0000-000000000001' AND role='admin';
SET ROLE authenticated;
SELECT public.family_lock();
SELECT pg_temp.assert(NOT public.family_parent_authorized(),'leaving parent mode revokes authorization');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardians)=0,'old parent grant cannot bypass lock');
SELECT public.family_unlock_parent('000000') AS ignored \gset
SELECT public.family_unlock_parent('000000') AS ignored \gset
SELECT public.family_unlock_parent('000000') AS ignored \gset
SELECT pg_temp.assert(public.family_unlock_parent('123456')->>'error'='rate_limited','durable PIN rate limit');
SELECT pg_temp.denied($q$SELECT pin_hash FROM family_private.pins$q$,'PIN hash never exposed to client');
SELECT public.family_select_child('30000000-0000-0000-0000-000000000003')->>'token' AS expiring_token \gset
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'expiring_token')::text,false) AS ignored \gset
RESET ROLE;
UPDATE family_private.grants SET expires_at=now()-interval '1 minute';
SET ROLE authenticated;
SELECT pg_temp.assert(public.family_current_profile() IS NULL,'expired grants cannot restore a profile');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=0,'expired grants cannot read cached learner records');
SELECT public.family_select_child('30000000-0000-0000-0000-000000000003')->>'token' AS removed_token \gset
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'removed_token')::text,false) AS ignored \gset
RESET ROLE;
SELECT current_setting('request.jwt.claims') AS approval_test_claims \gset
SELECT set_config('request.jwt.claims','{}',false) AS ignored \gset
UPDATE public.users SET approval_status='pending' WHERE id='00000000-0000-0000-0000-000000000003';
SELECT set_config('request.jwt.claims',:'approval_test_claims',false) AS ignored \gset
SET ROLE authenticated;
SELECT pg_temp.assert(public.family_current_profile() IS NULL,'users approval immediately blocks selected child');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=0,'unapproved child cannot read learner history');
SELECT pg_temp.denied($q$SELECT public.family_select_child('30000000-0000-0000-0000-000000000003')$q$,'unapproved user cannot be selected');
RESET ROLE;
SELECT set_config('request.jwt.claims','{}',false) AS ignored \gset
UPDATE public.users SET approval_status='approved' WHERE id='00000000-0000-0000-0000-000000000003';
SELECT set_config('request.jwt.claims',:'approval_test_claims',false) AS ignored \gset
DELETE FROM public.guardian_child_links WHERE child_id='30000000-0000-0000-0000-000000000003';
SET ROLE authenticated;
SELECT pg_temp.assert(public.family_current_profile() IS NULL,'removed child immediately invalidates grant');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=0,'removed child read denied');
SELECT public.family_select_child('30000000-0000-0000-0000-000000000004')->>'token' AS reset_token \gset
SELECT set_config('request.headers',jsonb_build_object('x-family-grant',:'reset_token')::text,false) AS ignored \gset
RESET ROLE;
SELECT public.family_set_pin('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','654321');
SELECT pg_temp.assert((SELECT pin_hash <> '654321' AND left(pin_hash,4)='$2a$' FROM family_private.pins),'PIN uses bcrypt hashing');
SET ROLE authenticated;
SELECT pg_temp.assert(public.family_current_profile() IS NULL,'PIN reset revokes every grant');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","session_id":"10000000-0000-0000-0000-000000000002"}',false) AS ignored \gset
SELECT pg_temp.assert(public.family_bootstrap() IS NULL,'grant cannot use another accounts Auth session');
SELECT pg_temp.denied($q$SELECT public.family_select_child('30000000-0000-0000-0000-000000000004')$q$,'mismatched session rejected');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000006","session_id":"10000000-0000-0000-0000-000000000006"}',false) AS ignored \gset
SELECT set_config('request.headers','{}',false) AS ignored \gset
SELECT pg_temp.assert(NOT (public.family_bootstrap()->>'isFamily')::boolean,'independent student stays independent');
SELECT pg_temp.assert(public.family_current_learner()='00000000-0000-0000-0000-000000000006','independent identity unchanged');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=1,'independent student isolation');
RESET ROLE;
DELETE FROM auth.sessions WHERE id='10000000-0000-0000-0000-000000000006';
SET ROLE authenticated;
SELECT pg_temp.assert(public.family_current_learner() IS NULL,'revoked Auth session denied');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","session_id":"10000000-0000-0000-0000-000000000002"}',false) AS ignored \gset
SELECT pg_temp.assert(NOT (public.family_bootstrap()->>'isFamily')::boolean AND (public.family_bootstrap()->>'isGuardian')::boolean,'unenrolled parent stays on legacy guardian flow');
SELECT pg_temp.assert((SELECT count(*) FROM public.guardians)=2,'disabled cohort retains fixture legacy guardian policy');
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_history)=1,'legacy parent keeps linked-child history');
SELECT pg_temp.assert(public.is_guardian_of_child('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005'),'legacy guardian helper keeps ownership access');
INSERT INTO public.exercise_explanations_cache(exercise_hash,exercise_content) VALUES('legacy','Updated') ON CONFLICT(exercise_hash) DO UPDATE SET exercise_content=EXCLUDED.exercise_content;
SELECT pg_temp.assert((SELECT count(*) FROM public.exercise_explanations_cache WHERE exercise_content='Updated')=1,'old global-hash cache upsert remains valid');
SELECT pg_temp.assert((SELECT count(*) FROM public.learner_explanations_cache)=1,'legacy parent cannot read another family private cache');
SELECT pg_temp.denied($q$SELECT public.family_select_child('30000000-0000-0000-0000-000000000005')$q$,'unenrolled parent cannot enter new child mode');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000007","session_id":"10000000-0000-0000-0000-000000000007"}',false) AS ignored \gset
SELECT pg_temp.assert(NOT (public.family_bootstrap()->>'isFamily')::boolean,'independent admin stays outside family mode');
SELECT pg_temp.assert(public.has_role('00000000-0000-0000-0000-000000000007','admin'),'independent admin role remains available');
SELECT pg_temp.assert(family_private.can_read_learner('00000000-0000-0000-0000-000000000003'),'independent admin retains cross-user reads');
SELECT pg_temp.assert(family_private.can_write_learner('00000000-0000-0000-0000-000000000003'),'independent admin retains cross-user writes');
RESET ROLE;
SELECT 'Family access assertions passed' AS result;
