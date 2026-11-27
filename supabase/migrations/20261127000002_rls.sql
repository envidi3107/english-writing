-- Row Level Security. Scores, progress and usage are written only by the
-- grade-submission Edge Function (service role bypasses RLS).

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.topics enable row level security;
alter table public.exercises enable row level security;
alter table public.submissions enable row level security;
alter table public.user_progress enable row level security;
alter table public.ai_usage_log enable row level security;
alter table public.app_settings enable row level security;

-- Curriculum: published content for every signed-in user, everything for admins.
create policy levels_select on public.levels for select to authenticated using (is_published or public.is_admin());
create policy levels_admin_insert on public.levels for insert to authenticated with check (public.is_admin());
create policy levels_admin_update on public.levels for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy levels_admin_delete on public.levels for delete to authenticated using (public.is_admin());

create policy topics_select on public.topics for select to authenticated using (is_published or public.is_admin());
create policy topics_admin_insert on public.topics for insert to authenticated with check (public.is_admin());
create policy topics_admin_update on public.topics for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy topics_admin_delete on public.topics for delete to authenticated using (public.is_admin());

create policy exercises_select on public.exercises for select to authenticated using (is_published or public.is_admin());
create policy exercises_admin_insert on public.exercises for insert to authenticated with check (public.is_admin());
create policy exercises_admin_update on public.exercises for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy exercises_admin_delete on public.exercises for delete to authenticated using (public.is_admin());

-- Learner data: read own (admins read all); no client writes.
create policy submissions_select on public.submissions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy progress_select on public.user_progress for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy usage_select on public.ai_usage_log for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.submissions, public.user_progress, public.ai_usage_log from anon, authenticated;

-- Profiles: read own; only display_name is editable by the owner.
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Settings: readable by signed-in users, editable by admins.
create policy settings_select on public.app_settings for select to authenticated using (true);
create policy settings_admin_update on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.app_settings from anon, authenticated;

-- Anonymous visitors get nothing.
revoke all on public.levels, public.topics, public.exercises, public.app_settings from anon;

-- Explicit table privileges (do not rely on project default privileges).
grant select, insert, update, delete on public.levels, public.topics, public.exercises to authenticated;
grant select on public.submissions, public.user_progress, public.ai_usage_log, public.profiles to authenticated;
grant select, update on public.app_settings to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.is_admin() to authenticated;
