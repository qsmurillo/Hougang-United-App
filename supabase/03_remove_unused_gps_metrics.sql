begin;

alter table public.gps_metrics
  drop column if exists accel_decel_count,
  drop column if exists fatigue_index;

commit;
