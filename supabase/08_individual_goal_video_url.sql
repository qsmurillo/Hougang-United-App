alter table public.individual_goals
  add column if not exists video_url text;
