-- Track when content became visible to learners, so drafts published later
-- (or hidden rows re-published) never re-lock progress a learner already made.

alter table public.levels add column published_at timestamptz;
alter table public.topics add column published_at timestamptz;
alter table public.exercises add column published_at timestamptz;

update public.levels set published_at = created_at where is_published;
update public.topics set published_at = created_at where is_published;
update public.exercises set published_at = created_at where is_published;

create function public.stamp_published_at() returns trigger
language plpgsql as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published or new.published_at is null) then
    new.published_at := coalesce(case when tg_op = 'INSERT' then new.published_at end, now());
  end if;
  return new;
end;
$$;

create trigger levels_stamp_published before insert or update of is_published, published_at on public.levels
  for each row execute function public.stamp_published_at();
create trigger topics_stamp_published before insert or update of is_published, published_at on public.topics
  for each row execute function public.stamp_published_at();
create trigger exercises_stamp_published before insert or update of is_published, published_at on public.exercises
  for each row execute function public.stamp_published_at();
