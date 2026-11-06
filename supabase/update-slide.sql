-- Fotos do slide, da galeria e dos barbeiros: corre isto UMA vez no Supabase > SQL Editor (Run).
-- Serve para quem já correu o schema.sql antes.

alter table public.settings add column if not exists hero_images jsonb not null default '[]';
alter table public.settings add column if not exists gallery_images jsonb not null default '[]';

-- Pasta pública "hero" para guardar as fotos do slide (máx. 5 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hero', 'hero', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "hero: todos veem" on storage.objects;
drop policy if exists "hero: admin envia" on storage.objects;
drop policy if exists "hero: admin apaga" on storage.objects;

create policy "hero: todos veem" on storage.objects
  for select using (bucket_id = 'hero');
create policy "hero: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'hero' and public.is_admin());
create policy "hero: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'hero' and public.is_admin());
