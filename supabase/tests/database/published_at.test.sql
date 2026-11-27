begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.levels (id, position, title) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 99, 'L');
insert into public.topics (id, level_id, position, title) values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 1, 'T');
insert into public.exercises (id, topic_id, position, type, title, prompt, is_published) values
  ('cccccccc-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1', 1, 'paragraph', 'draft', 'p', false),
  ('cccccccc-0000-0000-0000-0000000000f2', 'bbbbbbbb-0000-0000-0000-0000000000f1', 2, 'paragraph', 'live', 'p', true);

select is((select published_at from public.exercises where id = 'cccccccc-0000-0000-0000-0000000000f1'), null, 'draft has no published_at');
select isnt((select published_at from public.exercises where id = 'cccccccc-0000-0000-0000-0000000000f2'), null, 'published insert sets published_at');

-- Pretend the draft was created long ago, then publish it now.
update public.exercises set created_at = now() - interval '30 days' where id = 'cccccccc-0000-0000-0000-0000000000f1';
update public.exercises set is_published = true where id = 'cccccccc-0000-0000-0000-0000000000f1';
select ok(
  (select published_at > created_at + interval '29 days' from public.exercises where id = 'cccccccc-0000-0000-0000-0000000000f1'),
  'publishing a draft stamps published_at with the publish time'
);

update public.topics set is_published = false where id = 'bbbbbbbb-0000-0000-0000-0000000000f1';
update public.topics set published_at = null where id = 'bbbbbbbb-0000-0000-0000-0000000000f1';
update public.topics set is_published = true where id = 'bbbbbbbb-0000-0000-0000-0000000000f1';
select isnt((select published_at from public.topics where id = 'bbbbbbbb-0000-0000-0000-0000000000f1'), null, 're-publishing a topic stamps published_at');

select * from finish();
rollback;
