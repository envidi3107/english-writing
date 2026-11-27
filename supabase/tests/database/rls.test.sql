begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Fixtures (as postgres) ---------------------------------------------------
insert into auth.users (id, email, aud, role, instance_id)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

select is(
  (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'learner',
  'signup trigger creates profile with role learner'
);

update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

insert into public.levels (id, position, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, 'L1');
insert into public.topics (id, level_id, position, title) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'T1');
insert into public.exercises (id, topic_id, position, type, title, prompt, is_published) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 1, 'paragraph', 'E1', 'p', true),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 2, 'paragraph', 'E2 draft', 'p', false);
insert into public.submissions (user_id, exercise_id, answer, result, overall_score, stars)
values ('11111111-1111-1111-1111-111111111111', 'cccccccc-0000-0000-0000-000000000001', 'hi', '{}'::jsonb, 7, 2);

-- As Bob -------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*)::int from public.submissions), 0, 'learner cannot read other learner submissions');

select throws_ok(
  $$insert into public.submissions (user_id, exercise_id, answer, result, overall_score, stars)
    values ('22222222-2222-2222-2222-222222222222', 'cccccccc-0000-0000-0000-000000000001', 'x', '{}'::jsonb, 10, 3)$$,
  '42501', null, 'learner cannot insert submissions'
);

select throws_ok(
  $$update public.profiles set xp = 999 where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'learner cannot update own xp'
);

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'learner cannot update own role'
);

update public.profiles set display_name = 'Bobby' where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Bobby',
  'learner can update own display_name'
);

select is(
  (select array_agg(title order by position) from public.exercises where topic_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  array['E1'],
  'learner sees only published exercises'
);

select throws_ok(
  $$insert into public.exercises (topic_id, position, type, title, prompt)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 3, 'paragraph', 'hack', 'p')$$,
  '42501', null, 'learner cannot insert exercise'
);

-- RLS turns an unauthorized UPDATE into a silent no-op.
update public.app_settings set daily_request_budget = 1 where id = 1;
select is(
  (select daily_request_budget from public.app_settings where id = 1),
  250,
  'learner cannot change app_settings'
);

-- As admin -----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.exercises (topic_id, position, type, title, prompt)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 3, 'paragraph', 'E3', 'p')$$,
  'admin can insert exercise'
);

select throws_ok(
  $$delete from public.exercises where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  '23503', null, 'deleting exercise with submissions fails'
);

select * from finish();
rollback;
