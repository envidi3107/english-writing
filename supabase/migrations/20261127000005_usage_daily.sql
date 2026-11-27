-- Per-day AI usage of the current user, bucketed by Vietnam calendar date.
-- Aggregating in SQL avoids the PostgREST row cap (max_rows) on the raw log.
create function public.my_usage_daily(p_days integer default 32)
returns table (day date, requests bigint, tokens bigint)
language sql stable security invoker set search_path = public as $$
  select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
         count(*) as requests,
         coalesce(sum(input_tokens + output_tokens), 0)::bigint as tokens
  from public.ai_usage_log
  where user_id = auth.uid()
    and created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by 1
  order by 1;
$$;

revoke execute on function public.my_usage_daily(integer) from public, anon;
grant execute on function public.my_usage_daily(integer) to authenticated;
