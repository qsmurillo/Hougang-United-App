-- Hougang United Performance Hub
-- Production schema only. Provision SPL1 and SPL2 team rows before enabling signup.

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('SPL1', 'SPL2'))
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null default 'player' check (role in ('admin', 'official', 'player')),
  team_id uuid not null references public.teams(id),
  squad_number smallint check (squad_number between 1 and 99),
  position text,
  birth_date date,
  nationality text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- Existing installations may still have the original auth.users foreign key.
-- Player roster records do not require a Supabase Auth account.
alter table public.profiles alter column id set default gen_random_uuid();
do $$
declare
  auth_user_fk text;
begin
  select constraint_info.conname into auth_user_fk
  from pg_constraint constraint_info
  where constraint_info.conrelid = 'public.profiles'::regclass
    and constraint_info.confrelid = 'auth.users'::regclass
    and constraint_info.contype = 'f';
  if auth_user_fk is not null then
    execute format('alter table public.profiles drop constraint %I', auth_user_fk);
  end if;
end;
$$;

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  sleep_hours numeric(3,1) not null check (sleep_hours between 0 and 24),
  emotional_fatigue_1to5 smallint not null check (emotional_fatigue_1to5 between 1 and 5),
  nutrition_ok boolean not null default false,
  hydration_ok boolean not null default false,
  session_rpe_0to10 smallint not null check (session_rpe_0to10 between 0 and 10),
  submitted_at timestamptz not null default now(),
  unique (player_id, date)
);

create table if not exists public.gps_metrics (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  session_id text not null default gen_random_uuid()::text,
  date date not null,
  event_type text not null check (event_type in ('training', 'match')),
  total_distance integer not null default 0 check (total_distance >= 0),
  dist_per_min numeric(6,2) not null default 0 check (dist_per_min >= 0),
  max_speed numeric(5,2) not null default 0 check (max_speed >= 0),
  hsr_distance integer not null default 0 check (hsr_distance >= 0),
  sprint_count integer not null default 0 check (sprint_count >= 0),
  accelerations integer check (accelerations >= 0),
  decelerations integer check (decelerations >= 0),
  hml_distance integer not null default 0 check (hml_distance >= 0)
);

alter table public.gps_metrics add column if not exists session_id text;
update public.gps_metrics set session_id = gen_random_uuid()::text where session_id is null;
alter table public.gps_metrics alter column session_id set default gen_random_uuid()::text;
alter table public.gps_metrics alter column session_id set not null;
alter table public.gps_metrics add column if not exists accelerations integer check (accelerations >= 0);
alter table public.gps_metrics add column if not exists decelerations integer check (decelerations >= 0);

create table if not exists public.activity_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  season text not null,
  minutes_played integer not null default 0 check (minutes_played >= 0),
  started_matches integer not null default 0 check (started_matches >= 0),
  sub_matches integer not null default 0 check (sub_matches >= 0),
  training_attendance_pct numeric(5,2) not null default 0 check (training_attendance_pct between 0 and 100),
  total_goals integer not null default 0 check (total_goals >= 0),
  total_assists integer not null default 0 check (total_assists >= 0),
  unique (player_id, season)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  event_type text not null check (event_type in ('match', 'training', 'meeting')),
  date date not null,
  time time not null,
  location text not null,
  details text,
  opponent text
);

create table if not exists public.individual_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Communication', 'Decision-making', 'Execution', 'Fitness')),
  start_value numeric(4,1) not null default 1,
  current_value numeric(4,1) not null default 1,
  target_value numeric(4,1) not null default 5,
  check (start_value between 0 and 5 and current_value between 0 and 5 and target_value between 0 and 5)
);

create table if not exists public.goal_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.individual_goals(id) on delete cascade,
  observed_value numeric(4,1) not null check (observed_value between 0 and 5),
  next_review_date date not null,
  observation_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_team_idx on public.profiles(team_id);
create index if not exists checkins_player_date_idx on public.daily_checkins(player_id, date desc);
create index if not exists gps_player_date_idx on public.gps_metrics(player_id, date desc);
create index if not exists activity_player_season_idx on public.activity_stats(player_id, season);
create index if not exists events_team_date_idx on public.calendar_events(team_id, date);
create index if not exists goals_player_idx on public.individual_goals(player_id);
create index if not exists reviews_goal_date_idx on public.goal_reviews(goal_id, created_at desc);
create index if not exists messages_player_date_idx on public.chat_messages(player_id, created_at);

-- RLS policies must not query public.profiles directly. Doing so re-enters the
-- same policy stack and produces the "infinite recursion detected" error.
-- Use the authenticated JWT claims for role/team checks instead.
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')
  )
$$;

create or replace function public.current_user_team()
returns uuid language sql stable security definer set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'team_id', '')::uuid
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_team() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_team() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Public signup may supply a name only. Role is always forced to player.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  default_team uuid;
begin
  select t.id into default_team from public.teams t where t.name = 'SPL1';
  if default_team is null then
    raise exception 'Provision the SPL1 and SPL2 rows in public.teams before enabling signup.';
  end if;
  insert into public.profiles (id, full_name, role, team_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'player',
    default_team
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_deleted_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_deleted_user();

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.gps_metrics enable row level security;
alter table public.activity_stats enable row level security;
alter table public.calendar_events enable row level security;
alter table public.individual_goals enable row level security;
alter table public.goal_reviews enable row level security;
alter table public.chat_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.profiles, public.daily_checkins,
  public.gps_metrics, public.activity_stats, public.calendar_events,
  public.individual_goals, public.goal_reviews, public.chat_messages to authenticated;

drop policy if exists "Authenticated users can read teams" on public.teams;
drop policy if exists "Admins manage teams" on public.teams;
drop policy if exists "Admins manage all profiles" on public.profiles;
drop policy if exists "Officials read all profiles" on public.profiles;
drop policy if exists "Players read own profile" on public.profiles;
drop policy if exists "Admins manage all checkins" on public.daily_checkins;
drop policy if exists "Officials read all checkins" on public.daily_checkins;
drop policy if exists "Players manage own checkins" on public.daily_checkins;
drop policy if exists "Admins manage all GPS" on public.gps_metrics;
drop policy if exists "Officials read all GPS" on public.gps_metrics;
drop policy if exists "Players read own GPS" on public.gps_metrics;
drop policy if exists "Admins manage all activity" on public.activity_stats;
drop policy if exists "Officials read all activity" on public.activity_stats;
drop policy if exists "Players read own activity" on public.activity_stats;
drop policy if exists "Admins manage all events" on public.calendar_events;
drop policy if exists "Team members read events" on public.calendar_events;
drop policy if exists "Officials read all events" on public.calendar_events;
drop policy if exists "Authenticated users read all events" on public.calendar_events;
drop policy if exists "Admins manage all goals" on public.individual_goals;
drop policy if exists "Officials read all goals" on public.individual_goals;
drop policy if exists "Players manage own goals" on public.individual_goals;
drop policy if exists "Admins manage all goal reviews" on public.goal_reviews;
drop policy if exists "Officials read all goal reviews" on public.goal_reviews;
drop policy if exists "Players manage reviews for own goals" on public.goal_reviews;
drop policy if exists "Admins manage all chat" on public.chat_messages;
drop policy if exists "Officials read all chat" on public.chat_messages;
drop policy if exists "Players manage own chat" on public.chat_messages;

create policy "Authenticated users can read teams" on public.teams
  for select to authenticated using (true);
create policy "Admins manage teams" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage all profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Officials read all profiles" on public.profiles
  for select to authenticated using (public.current_user_role() = 'official');
create policy "Players read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "Admins manage all checkins" on public.daily_checkins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Officials read all checkins" on public.daily_checkins
  for select to authenticated using (public.current_user_role() = 'official');
create policy "Players manage own checkins" on public.daily_checkins
  for all to authenticated using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));

create policy "Admins manage all GPS" on public.gps_metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Officials read all GPS" on public.gps_metrics
  for select to authenticated using (public.current_user_role() = 'official');
create policy "Players read own GPS" on public.gps_metrics
  for select to authenticated using (player_id = (select auth.uid()));

create policy "Admins manage all activity" on public.activity_stats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Officials read all activity" on public.activity_stats
  for select to authenticated using (public.current_user_role() = 'official');
create policy "Players read own activity" on public.activity_stats
  for select to authenticated using (player_id = (select auth.uid()));

create policy "Admins manage all events" on public.calendar_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users read all events" on public.calendar_events
  for select to authenticated using (true);
create policy "Officials read all events" on public.calendar_events
  for select to authenticated using (public.current_user_role() = 'official');

create policy "Admins manage all goals" on public.individual_goals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Players manage own goals" on public.individual_goals
  for all to authenticated using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));

create policy "Admins manage all goal reviews" on public.goal_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Players manage reviews for own goals" on public.goal_reviews
  for all to authenticated
  using (exists (select 1 from public.individual_goals g where g.id = goal_id and g.player_id = (select auth.uid())))
  with check (exists (select 1 from public.individual_goals g where g.id = goal_id and g.player_id = (select auth.uid())));

create policy "Admins manage all chat" on public.chat_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Players manage own chat" on public.chat_messages
  for all to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and sender_id = (select auth.uid()));
