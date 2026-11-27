-- Atomically record one graded attempt: submission + best progress + XP + streak.
-- Locks the learner's profile row first so concurrent gradings for the same learner
-- serialize, and every value is derived from the committed state inside the transaction.
-- Mirrors supabase/functions/_shared/scoring.ts (pass = 2 stars; XP 0/10/20/30)
-- and streak.ts (Vietnam calendar days).

create function public.record_grade(
  p_user uuid,
  p_exercise uuid,
  p_answer text,
  p_result jsonb,
  p_score numeric,
  p_stars smallint,
  p_now timestamptz
) returns table (submission_id uuid, xp_gained integer, streak_count integer, newly_passed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_xp constant integer[] := array[0, 10, 20, 30];
  v_today date := (p_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_profile public.profiles%rowtype;
  v_prev public.user_progress%rowtype;
  v_gain integer;
  v_streak integer;
  v_newly boolean;
  v_sub uuid;
begin
  if p_stars < 0 or p_stars > 3 then
    raise exception 'stars out of range: %', p_stars;
  end if;

  select * into strict v_profile from public.profiles where id = p_user for update;
  select * into v_prev from public.user_progress
    where user_id = p_user and exercise_id = p_exercise for update;

  v_gain := greatest(0, v_xp[p_stars + 1] - v_xp[coalesce(v_prev.best_stars, 0) + 1]);
  v_newly := v_prev.completed_at is null and p_stars >= 2;
  v_streak := case
    when v_profile.last_active_date = v_today then greatest(v_profile.streak_count, 1)
    when v_profile.last_active_date = v_today - 1 then v_profile.streak_count + 1
    else 1
  end;

  insert into public.submissions (user_id, exercise_id, answer, result, overall_score, stars, created_at)
  values (p_user, p_exercise, p_answer, p_result, p_score, p_stars, p_now)
  returning id into v_sub;

  insert into public.user_progress as up (user_id, exercise_id, best_score, best_stars, attempts, completed_at, updated_at)
  values (p_user, p_exercise, p_score, p_stars, 1, case when p_stars >= 2 then p_now end, p_now)
  on conflict (user_id, exercise_id) do update set
    best_score = greatest(up.best_score, excluded.best_score),
    best_stars = greatest(up.best_stars, excluded.best_stars),
    attempts = up.attempts + 1,
    completed_at = coalesce(up.completed_at, excluded.completed_at),
    updated_at = excluded.updated_at;

  update public.profiles
    set xp = xp + v_gain, streak_count = v_streak, last_active_date = v_today
    where id = p_user;

  return query select v_sub, v_gain, v_streak, v_newly;
end;
$$;

revoke execute on function public.record_grade(uuid, uuid, text, jsonb, numeric, smallint, timestamptz) from public, anon, authenticated;
grant execute on function public.record_grade(uuid, uuid, text, jsonb, numeric, smallint, timestamptz) to service_role;
