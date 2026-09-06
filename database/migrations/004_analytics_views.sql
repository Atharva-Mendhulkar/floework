create materialized view public.mv_focus_stability as
select
  user_id,
  extract(dow  from started_at at time zone 'Asia/Kolkata')::int as day_of_week,
  extract(hour from started_at at time zone 'Asia/Kolkata')::int as hour_of_day,
  round(avg(duration_secs) / 60.0, 2) as avg_minutes,
  count(*) as session_count,
  round(1.0 - (avg(interrupts)::numeric / nullif(avg(duration_secs / 900.0), 0)), 2) as score
from public.focus_sessions
where ended_at is not null
group by 1, 2, 3;

create unique index on public.mv_focus_stability (user_id, day_of_week, hour_of_day);
