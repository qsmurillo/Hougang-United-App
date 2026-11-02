insert into storage.buckets (id, name, public, allowed_mime_types)
values ('hougang-assets', 'hougang-assets', true, array['image/webp'])
on conflict (id) do nothing;
