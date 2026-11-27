-- Core schema for the English writing practice app.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  xp integer not null default 0,
  streak_count integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  title text not null,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels (id) on delete restrict,
  position integer not null,
  title text not null,
  description text,
  icon text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index topics_level_idx on public.topics (level_id, position);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete restrict,
  position integer not null,
  type text not null check (type in ('paragraph', 'translate_vi_en', 'translate_en_vi')),
  title text not null,
  prompt text not null,
  source_text text,
  hints jsonb not null default '{"vocabulary": []}'::jsonb,
  min_words integer check (min_words is null or min_words >= 0),
  max_words integer check (max_words is null or max_words >= 0),
  reference_answer text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_words is null or max_words is null or min_words <= max_words)
);
create index exercises_topic_idx on public.exercises (topic_id, position);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  answer text not null,
  result jsonb not null,
  overall_score numeric(3, 1) not null,
  stars smallint not null check (stars between 0 and 3),
  created_at timestamptz not null default now()
);
create index submissions_user_idx on public.submissions (user_id, created_at desc);
create index submissions_exercise_idx on public.submissions (exercise_id);

create table public.user_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  best_score numeric(3, 1) not null default 0,
  best_stars smallint not null default 0,
  attempts integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index user_progress_exercise_idx on public.user_progress (exercise_id);

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('grade', 'admin_test')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index ai_usage_log_user_idx on public.ai_usage_log (user_id, created_at desc);

create table public.app_settings (
  id integer primary key check (id = 1),
  daily_request_budget integer not null default 250 check (daily_request_budget > 0),
  monthly_token_budget bigint not null default 10000000 check (monthly_token_budget > 0)
);
insert into public.app_settings (id) values (1);

-- Keep exercises.updated_at fresh.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();

-- Create a profile for every new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
