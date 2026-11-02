-- Allow pre-training and post-training check-ins to be submitted independently.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_checkins'
      and column_name = 'hydration_ok'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_checkins'
      and column_name = 'hydratation_ok'
  ) then
    alter table public.daily_checkins rename column hydration_ok to hydratation_ok;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_checkins'
      and column_name = 'hydration_ok'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_checkins'
      and column_name = 'hydratation_ok'
  ) then
    update public.daily_checkins
    set hydratation_ok = coalesce(hydratation_ok, hydration_ok);
    alter table public.daily_checkins drop column hydration_ok;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_checkins'
      and column_name = 'hydratation_ok'
  ) then
    alter table public.daily_checkins add column hydratation_ok boolean;
  end if;
end;
$$;

alter table public.daily_checkins alter column sleep_hours drop not null;
alter table public.daily_checkins alter column emotional_fatigue_1to5 drop not null;
alter table public.daily_checkins alter column nutrition_ok drop not null;
alter table public.daily_checkins alter column hydratation_ok drop not null;
alter table public.daily_checkins alter column session_rpe_0to10 drop not null;
