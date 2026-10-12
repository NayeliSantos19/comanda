-- Comanda · Fotos de los platos
-- Córrelo DESPUÉS de supabase-schema.sql: SQL Editor -> New query -> Run
-- Se puede correr más de una vez sin problema.

-- 1. Columna para la foto
alter table platos add column if not exists imagen_url text;

-- 2. Fotos de ejemplo (Unsplash, licencia gratuita). Solo se ponen si el plato no tiene foto.
update platos p
set imagen_url = v.url
from (values
  ('Revuelta',                 'https://images.unsplash.com/photo-1644753787071-8933b5daed2d'),
  ('Queso con loroco',         'https://images.unsplash.com/photo-1617902271850-21d560795d60'),
  ('Frijol con queso',         'https://images.unsplash.com/photo-1747671730852-357e42bb9372'),
  ('Ayote',                    'https://images.unsplash.com/photo-1644753787071-8933b5daed2d'),
  ('Yuca con chicharrón',      'https://images.unsplash.com/photo-1684893265739-a88b30c33e92'),
  ('Pastelitos de carne (3)',  'https://images.unsplash.com/photo-1624128082323-beb6b8b508db'),
  ('Plátano frito completo',   'https://images.unsplash.com/photo-1702827482556-481adcd68f3b'),
  ('Sopa de gallina india',    'https://images.unsplash.com/photo-1665594051407-7385d281ad76'),
  ('Horchata',                 'https://images.unsplash.com/photo-1724198218217-342f615dc034'),
  ('Fresco de ensalada',       'https://images.unsplash.com/photo-1680954464671-6191ab264214'),
  ('Café de palo',             'https://images.unsplash.com/photo-1595434091143-b375ced5fe5c'),
  ('Agua embotellada',         'https://images.unsplash.com/photo-1639256150782-ecdb00b01e84'),
  ('Quesadilla salvadoreña',   'https://images.unsplash.com/photo-1514435390218-898a0e01517a'),
  ('Empanadas de plátano (2)', 'https://images.unsplash.com/photo-1667113227378-f4fe9f7cd468')
) as v(nombre, url)
where p.nombre = v.nombre and p.imagen_url is null;

-- 3. Carpeta pública "platos" en Supabase Storage para las fotos que subas desde /menu
--    (máximo 2 MB por foto; la app ya las reduce antes de subirlas)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('platos', 'platos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cualquiera puede ver las fotos; solo el personal puede subir, cambiar o borrar
drop policy if exists "Fotos de platos visibles" on storage.objects;
drop policy if exists "Personal sube fotos de platos" on storage.objects;
drop policy if exists "Personal cambia fotos de platos" on storage.objects;
drop policy if exists "Personal borra fotos de platos" on storage.objects;

create policy "Fotos de platos visibles" on storage.objects
  for select using (bucket_id = 'platos');
create policy "Personal sube fotos de platos" on storage.objects
  for insert to authenticated with check (bucket_id = 'platos');
create policy "Personal cambia fotos de platos" on storage.objects
  for update to authenticated using (bucket_id = 'platos');
create policy "Personal borra fotos de platos" on storage.objects
  for delete to authenticated using (bucket_id = 'platos');
