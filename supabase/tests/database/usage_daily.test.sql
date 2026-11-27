begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role, instance_id) values
  ('55555555-5555-5555-5555-555555555555', 'u1@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('66666666-6666-6666-6666-666666666666', 'u2@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

-- 1500 calls today (more than the 1000-row API cap) plus one at 23:30 VN yesterday.
insert into public.ai_usage_log (user_id, kind, model, input_tokens, output_tokens, success, created_at)
select '55555555-5555-5555-5555-555555555555', 'grade', 'm', 10, 5, true, now() - interval '1 minute'
from generate_series(1, 1500);
insert into public.ai_usage_log (user_id, kind, model, input_tokens, output_tokens, success, created_at)
values
  ('55555555-5555-5555-5555-555555555555', 'grade', 'm', 1, 1, true,
   ((((now() at time zone 'Asia/Ho_Chi_Minh')::date - 1) + time '23:30') at time zone 'Asia/Ho_Chi_Minh')),
  ('66666666-6666-6666-6666-666666666666', 'grade', 'm', 1, 1, true, now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

select is(
  (select sum(requests)::int from public.my_usage_daily(32)),
  1501,
  'counts every call of the current user, beyond 1000 rows'
);
select is(
  (select row(requests, tokens)::text from public.my_usage_daily(32) where day = (now() at time zone 'Asia/Ho_Chi_Minh')::date),
  '(1500,22500)',
  'buckets today by Vietnam date with summed tokens'
);
select is(
  (select requests from public.my_usage_daily(32) where day = (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1),
  1::bigint,
  '23:30 VN yesterday falls on yesterday'
);

select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
select is((select sum(requests)::int from public.my_usage_daily(32)), 1, 'other users only see their own usage');

select * from finish();
rollback;
