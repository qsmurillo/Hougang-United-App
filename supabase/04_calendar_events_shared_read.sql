begin;

grant select on public.calendar_events to authenticated;

drop policy if exists "Team members read events" on public.calendar_events;
drop policy if exists "Authenticated users read all events" on public.calendar_events;

create policy "Authenticated users read all events" on public.calendar_events
  for select to authenticated using (true);

commit;
