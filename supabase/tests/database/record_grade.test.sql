begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role, instance_id)
values ('44444444-4444-4444-4444-444444444444', 'rg@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.levels (id, position, title) values ('aaaaaaaa-0000-0000-0000-0000000000e1', 98, 'L');
insert into public.topics (id, level_id, position, title) values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000e1', 1, 'T');
insert into public.exercises (id, topic_id, position, type, title, prompt) values
  ('cccccccc-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-0000000000e1', 1, 'paragraph', 'E', 'p');

-- First attempt: 2 stars on 2026-11-26 (VN).
select is(
  (select row(xp_gained, streak_count, newly_passed)::text from public.record_grade(
    '44444444-4444-4444-4444-444444444444', 'cccccccc-0000-0000-0000-0000000000e1', 'a', '{}'::jsonb, 7, 2::smallint, '2026-11-26T03:00:00Z')),
  '(20,1,t)', 'first 2-star attempt gains 20 XP, starts streak, marks passed'
);

-- Second attempt next VN day with 3 stars: only the improvement counts.
select is(
  (select row(xp_gained, streak_count, newly_passed)::text from public.record_grade(
    '44444444-4444-4444-4444-444444444444', 'cccccccc-0000-0000-0000-0000000000e1', 'b', '{}'::jsonb, 9, 3::smallint, '2026-11-26T18:00:00Z')),
  '(10,2,f)', 'improving to 3 stars adds 10 XP and extends the streak across VN midnight'
);

-- Late, worse result must not regress best or clear completion.
select is(
  (select xp_gained from public.record_grade(
    '44444444-4444-4444-4444-444444444444', 'cccccccc-0000-0000-0000-0000000000e1', 'c', '{}'::jsonb, 5.5, 1::smallint, '2026-11-27T05:00:00Z')),
  0, 'worse retry gains nothing'
);
select is(
  (select row(best_stars, best_score, attempts, completed_at is not null)::text from public.user_progress
   where user_id = '44444444-4444-4444-4444-444444444444' and exercise_id = 'cccccccc-0000-0000-0000-0000000000e1'),
  '(3,9.0,3,t)', 'progress keeps best stars/score, counts attempts, keeps completion'
);
select is((select xp from public.profiles where id = '44444444-4444-4444-4444-444444444444'), 30, 'profile XP is the sum of gains');
select is((select count(*)::int from public.submissions where user_id = '44444444-4444-4444-4444-444444444444'), 3, 'every attempt is stored');

-- A gap of more than one day resets the streak.
select is(
  (select streak_count from public.record_grade(
    '44444444-4444-4444-4444-444444444444', 'cccccccc-0000-0000-0000-0000000000e1', 'd', '{}'::jsonb, 9, 3::smallint, '2026-11-30T05:00:00Z')),
  1, 'streak resets after a missed day'
);

-- Only the service role may call it.
select ok(not has_function_privilege('authenticated', 'public.record_grade(uuid, uuid, text, jsonb, numeric, smallint, timestamptz)', 'execute'), 'authenticated cannot execute record_grade');
select ok(has_function_privilege('service_role', 'public.record_grade(uuid, uuid, text, jsonb, numeric, smallint, timestamptz)', 'execute'), 'service_role can execute record_grade');

select * from finish();
rollback;
