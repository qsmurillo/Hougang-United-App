-- LOCAL/DEVELOPMENT DATA ONLY.
-- NEVER run this file against production or a database containing real users.
-- It writes sample accounts directly to auth.users with a shared development
-- password and inserts synthetic player records.
-- Prerequisite: apply 01_schema.sql first.
--
-- Demo accounts: player01@hougang.demo through player45@hougang.demo
-- Shared development password: HougangDemo!2026

insert into public.teams (name) values ('SPL1'), ('SPL2')
on conflict (name) do nothing;

do $$
declare
  names text[] := array[
    'Ethan Tan','Lucas Lim','Noah Lee','Ryan Wong','Kai Chen','Aiden Ng','Dylan Koh','Jasper Goh','Liam Teo','Mason Chua',
    'Caleb Ong','Isaac Ho','Elliot Yeo','Jayden Low','Aaron Sim','Zachary Tay','Daniel Foo','Nathaniel Quek','Marcus Lau','Theo Chan',
    'Oliver Seah','Benjamin Yap','Gabriel Toh','Joshua Wee','Adrian Poh','Samuel Ang','Leonard Tan','Reuben Lim','Harrison Lee','Dominic Wong',
    'Matteo Chen','Rafael Ng','Cameron Koh','Felix Goh','Julian Teo','Xavier Chua','Kieran Ong','Evan Ho','Darius Yeo','Shawn Low',
    'Isaiah Sim','Nicholas Tay','Joel Foo','Tobias Quek','Aaron Lau'
  ];
  positions text[] := array['Goalkeeper','Defender','Defender','Defender','Midfielder','Midfielder','Midfielder','Forward','Forward'];
  i integer;
  uid uuid;
  tid uuid;
  session_date date;
  session_index integer;
  day_index integer;
begin
  for i in 1..45 loop
    uid := gen_random_uuid();
    select t.id into tid
    from public.teams t
    where t.name = case when i <= 23 then 'SPL1' else 'SPL2' end;

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'player' || lpad(i::text, 2, '0') || '@hougang.demo',
      crypt('HougangDemo!2026', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'role', 'player',
        'team_id', tid::text
      ),
      jsonb_build_object('full_name', names[i]),
      now(), now()
    ) on conflict (email) do nothing;

    select u.id into uid
    from auth.users u
    where u.email = 'player' || lpad(i::text, 2, '0') || '@hougang.demo';

    insert into public.profiles (id, full_name, role, team_id, squad_number, position, birth_date, nationality, photo_url)
    values (
      uid, names[i], 'player', tid, ((i - 1) % 23) + 1,
      positions[((i - 1) % array_length(positions, 1)) + 1],
      date '1997-01-01' + ((i * 113) % 3100),
      case when i % 4 = 0 then 'Malaysia' when i % 7 = 0 then 'Japan' else 'Singapore' end,
      format('https://api.dicebear.com/9.x/initials/svg?seed=%s&backgroundColor=1e3a8a', replace(names[i], ' ', ''))
    ) on conflict (id) do update
      set team_id = excluded.team_id, squad_number = excluded.squad_number;

    insert into public.activity_stats (player_id, season, minutes_played, started_matches, sub_matches, training_attendance_pct, total_goals, total_assists)
    values (uid, '2025/26', 360 + ((i * 37) % 1100), 4 + (i % 14), i % 8, 72 + ((i * 3) % 27), i % 9, (i * 2) % 7)
    on conflict (player_id, season) do nothing;

    for session_index in 0..5 loop
      for day_index in 0..2 loop
        session_date := current_date - ((5 - session_index) * 7 + (2 - day_index) * 2);

        insert into public.gps_metrics (player_id, date, event_type, total_distance, dist_per_min, max_speed, hsr_distance, sprint_count, accelerations, decelerations, hml_distance)
        select
          uid, session_date,
          case when (i + session_index * 3 + day_index) % 5 = 0 then 'match' else 'training' end,
          6400 + ((i * 173 + session_index * 211 + day_index * 83) % 5100),
          82 + ((i * 7 + session_index * 3 + day_index) % 31),
          27 + ((i * 13 + session_index * 5 + day_index * 3) % 92) / 10.0,
          280 + ((i * 41 + session_index * 29 + day_index * 17) % 710),
          8 + ((i + session_index * 2 + day_index) % 24),
          18 + ((i * 5 + session_index * 3 + day_index * 2) % 48),
          16 + ((i * 7 + session_index * 4 + day_index * 3) % 46),
          510 + ((i * 53 + session_index * 37 + day_index * 23) % 1120)
        where not exists (
          select 1 from public.gps_metrics m where m.player_id = uid and m.date = session_date
        );

        insert into public.daily_checkins (player_id, date, sleep_hours, emotional_fatigue_1to5, nutrition_ok, hydration_ok, session_rpe_0to10)
        values (uid, session_date, 6 + (i % 5) * 0.5, 2 + (i % 4), i % 6 <> 0, i % 7 <> 0, 4 + ((i + session_index * 3 + day_index) % 6))
        on conflict (player_id, date) do nothing;
      end loop;
    end loop;
  end loop;

  insert into public.calendar_events (team_id, title, event_type, date, time, location, details, opponent)
  select t.id, v.title, v.event_type, v.event_date, v.event_time, v.location, v.details, nullif(v.opponent, '')
  from (values
    ('SPL1','First team training','training',current_date + 1,'09:00'::time,'Hougang Stadium','Technical activation and possession.',''),
    ('SPL1','Match day','match',current_date + 3,'19:45'::time,'Hougang Stadium','Singapore Premier League fixture.','Lion City Sailors'),
    ('SPL1','Video review','meeting',current_date + 5,'10:30'::time,'Analysis Room','Review match clips and key moments.',''),
    ('SPL2','Development training','training',current_date + 1,'17:30'::time,'Hougang Stadium','Small-sided games and finishing.',''),
    ('SPL2','League fixture','match',current_date + 4,'16:00'::time,'Away Ground','SPL2 league fixture.','Young Lions'),
    ('SPL2','Squad meeting','meeting',current_date + 6,'18:00'::time,'Meeting Room','Weekly squad check-in.','')
  ) as v(team_name,title,event_type,event_date,event_time,location,details,opponent)
  join public.teams t on t.name = v.team_name
  where not exists (
    select 1 from public.calendar_events e where e.team_id = t.id and e.title = v.title and e.date = v.event_date
  );

  insert into public.individual_goals (player_id, title, description, category, start_value, current_value, target_value)
  select p.id, g.title, g.description, g.category, 2, 3, 4
  from public.profiles p
  cross join lateral (values
    ('Scan before receiving','Check both shoulders before the first touch.','Decision-making'),
    ('Communicate early','Give clear information to teammates in defensive transitions.','Communication'),
    ('Repeated sprint capacity','Improve repeated high-intensity effort across the match.','Fitness')
  ) as g(title,description,category)
  where p.role = 'player'
    and p.squad_number = 1
    and not exists (
      select 1 from public.individual_goals existing
      where existing.player_id = p.id and existing.title = g.title
    );
end $$;
