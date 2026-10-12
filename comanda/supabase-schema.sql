-- Comanda · Esquema de base de datos
-- Pega esto en Supabase: SQL Editor -> New query -> Run

-- Fecha "de hoy" según la hora local del restaurante (los números de pedido se reinician cada día)
create or replace function hoy_local() returns date
language sql stable as $$
  select (now() at time zone 'America/El_Salvador')::date
$$;

-- ───────────── Tablas ─────────────

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0
);

create table platos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nombre text not null,
  descripcion text,
  precio numeric(8, 2) not null check (precio >= 0),
  disponible boolean not null default true,   -- false = "Agotado"
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- El código va dentro del QR. Es aleatorio para que nadie pueda pedir
-- a una mesa adivinando la URL (/mesa/1, /mesa/2…).
create table mesas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  codigo text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  activa boolean not null default true,
  llamado text check (llamado in ('mesero', 'cuenta')),   -- el cliente pidió ayuda
  llamado_en timestamptz,
  orden int not null default 0
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references mesas(id),
  numero int not null,                         -- #001, #002… se reinicia cada día
  fecha date not null default hoy_local(),
  estado text not null default 'recibido'
    check (estado in ('recibido', 'preparando', 'listo', 'entregado', 'cancelado')),
  nota text,
  total numeric(10, 2) not null default 0,
  pagado boolean not null default false,       -- true cuando se cierra la cuenta de la mesa
  creado_en timestamptz not null default now(),
  preparando_en timestamptz,
  listo_en timestamptz,
  entregado_en timestamptz,
  unique (fecha, numero)
);

create index pedidos_fecha_estado_idx on pedidos (fecha, estado, creado_en);
create index pedidos_mesa_abiertos_idx on pedidos (mesa_id) where not pagado;

-- Se guarda una copia del nombre y precio: si mañana cambias el menú,
-- los pedidos y cuentas de hoy no cambian.
create table pedido_items (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  plato_id uuid references platos(id) on delete set null,
  nombre text not null,
  precio_unitario numeric(8, 2) not null,
  cantidad int not null check (cantidad between 1 and 20),
  nota text
);

create index pedido_items_pedido_idx on pedido_items (pedido_id);

-- La mesa de la demo pública no se puede desactivar ni cambiar de código
-- (si no, el botón "Probar como cliente" de la portada dejaría de funcionar).
create or replace function proteger_mesa_demo() returns trigger
language plpgsql as $$
begin
  if old.codigo = 'demo' then
    new.codigo := 'demo';
    new.activa := true;
  end if;
  return new;
end $$;

create trigger mesas_proteger_demo before update on mesas
for each row execute function proteger_mesa_demo();

-- ───────────── Funciones para el cliente (sin sesión) ─────────────
-- El cliente nunca toca las tablas directo: solo estas funciones, y siempre
-- con el código de su mesa (el que viene en el QR).

-- Nombre de la mesa y si ya llamó al mesero
create or replace function mesa_por_codigo(p_codigo text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nombre', nombre, 'llamado', llamado)
  from mesas where codigo = p_codigo and activa;
$$;

-- Crea el pedido. Los precios se toman de la base de datos (no del navegador)
-- y el número se calcula con un candado para que nunca se repita.
create or replace function crear_pedido(p_codigo text, p_items jsonb, p_nota text default null)
returns pedidos
language plpgsql security definer set search_path = public as $$
declare
  v_mesa mesas;
  v_pedido pedidos;
  v_numero int;
  v_item jsonb;
  v_plato platos;
  v_cantidad int;
  v_total numeric := 0;
  v_en_espera int;
begin
  select * into v_mesa from mesas where codigo = p_codigo and activa;
  if not found then
    raise exception 'Mesa no encontrada';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Demasiados productos en un solo pedido';
  end if;

  -- Freno contra spam: máximo 5 pedidos de la mesa esperando a cocina
  select count(*) into v_en_espera
  from pedidos where mesa_id = v_mesa.id and estado = 'recibido';
  if v_en_espera >= 5 then
    raise exception 'Hay demasiados pedidos esperando';
  end if;

  perform pg_advisory_xact_lock(hashtext('pedidos-' || hoy_local()::text));

  select coalesce(max(numero), 0) + 1 into v_numero
  from pedidos where fecha = hoy_local();

  insert into pedidos (mesa_id, numero, nota)
  values (v_mesa.id, v_numero, nullif(left(trim(p_nota), 200), ''))
  returning * into v_pedido;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cantidad := (v_item ->> 'cantidad')::int;
    if v_cantidad is null or v_cantidad < 1 or v_cantidad > 20 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_plato from platos
    where id = (v_item ->> 'plato_id')::uuid and disponible;
    if not found then
      raise exception 'Uno de los platos ya no está disponible';
    end if;

    insert into pedido_items (pedido_id, plato_id, nombre, precio_unitario, cantidad, nota)
    values (v_pedido.id, v_plato.id, v_plato.nombre, v_plato.precio, v_cantidad,
            nullif(left(trim(v_item ->> 'nota'), 120), ''));

    v_total := v_total + v_plato.precio * v_cantidad;
  end loop;

  update pedidos set total = v_total where id = v_pedido.id
  returning * into v_pedido;

  return v_pedido;
end $$;

-- Pedidos de hoy de la mesa que todavía no se han cobrado (la "cuenta abierta")
create or replace function pedidos_de_mesa(p_codigo text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'numero', p.numero,
      'estado', p.estado,
      'nota', p.nota,
      'total', p.total,
      'creado_en', p.creado_en,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'nombre', i.nombre, 'cantidad', i.cantidad,
          'precio_unitario', i.precio_unitario, 'nota', i.nota
        ) order by i.id), '[]'::jsonb)
        from pedido_items i where i.pedido_id = p.id
      )
    ) order by p.creado_en), '[]'::jsonb)
  from pedidos p
  join mesas m on m.id = p.mesa_id
  where m.codigo = p_codigo and m.activa and not p.pagado and p.fecha = hoy_local();
$$;

-- El cliente puede cancelar mientras la cocina no lo haya empezado
create or replace function cancelar_pedido(p_codigo text, p_pedido_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update pedidos set estado = 'cancelado'
  where id = p_pedido_id and estado = 'recibido'
    and mesa_id = (select id from mesas where codigo = p_codigo and activa);
  return found;
end $$;

-- Botones "Llamar al mesero" y "Pedir la cuenta"
create or replace function llamar_personal(p_codigo text, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_motivo not in ('mesero', 'cuenta') then
    raise exception 'Motivo inválido';
  end if;
  update mesas set llamado = p_motivo, llamado_en = now()
  where codigo = p_codigo and activa;
end $$;

revoke execute on function mesa_por_codigo(text) from public;
revoke execute on function crear_pedido(text, jsonb, text) from public;
revoke execute on function pedidos_de_mesa(text) from public;
revoke execute on function cancelar_pedido(text, uuid) from public;
revoke execute on function llamar_personal(text, text) from public;
grant execute on function mesa_por_codigo(text) to anon, authenticated;
grant execute on function crear_pedido(text, jsonb, text) to anon, authenticated;
grant execute on function pedidos_de_mesa(text) to anon, authenticated;
grant execute on function cancelar_pedido(text, uuid) to anon, authenticated;
grant execute on function llamar_personal(text, text) to anon, authenticated;

-- ───────────── Seguridad (RLS) ─────────────
-- El menú es público. Mesas y pedidos solo los ve el personal (usuarios autenticados);
-- los clientes llegan a ellos únicamente por las funciones de arriba.

alter table categorias enable row level security;
create policy "Categorías visibles" on categorias for select using (true);
create policy "Personal gestiona categorías" on categorias for all to authenticated
  using (true) with check (true);

alter table platos enable row level security;
create policy "Platos visibles" on platos for select using (true);
create policy "Personal gestiona platos" on platos for all to authenticated
  using (true) with check (true);

alter table mesas enable row level security;
create policy "Personal gestiona mesas" on mesas for all to authenticated
  using (true) with check (true);

alter table pedidos enable row level security;
create policy "Personal ve pedidos" on pedidos for select to authenticated using (true);
create policy "Personal actualiza pedidos" on pedidos for update to authenticated
  using (true) with check (true);
-- Sin política de insert: los pedidos solo se crean con crear_pedido().

alter table pedido_items enable row level security;
create policy "Personal ve items" on pedido_items for select to authenticated using (true);

-- ───────────── Tiempo real (cocina y mesas) ─────────────
alter publication supabase_realtime add table pedidos;
alter publication supabase_realtime add table mesas;

-- ───────────── Datos de ejemplo: un comedor salvadoreño ─────────────
insert into categorias (nombre, orden) values
  ('Pupusas', 1), ('Platos', 2), ('Bebidas', 3), ('Postres', 4);

insert into platos (categoria_id, nombre, descripcion, precio, orden)
select c.id, p.nombre, p.descripcion, p.precio, p.orden
from (values
  ('Pupusas', 'Revuelta', 'Chicharrón, queso y frijol. Con curtido y salsa.', 0.75, 1),
  ('Pupusas', 'Queso con loroco', 'Queso fresco con flor de loroco.', 0.85, 2),
  ('Pupusas', 'Frijol con queso', 'Clásica, para los que no fallan.', 0.70, 3),
  ('Pupusas', 'Ayote', 'Ayote tierno con queso.', 0.85, 4),
  ('Platos', 'Yuca con chicharrón', 'Yuca frita o salcochada, chicharrón y curtido.', 4.50, 1),
  ('Platos', 'Pastelitos de carne (3)', 'Masa crujiente rellena de carne y verduras.', 3.25, 2),
  ('Platos', 'Plátano frito completo', 'Con frijoles, crema y queso.', 3.50, 3),
  ('Platos', 'Sopa de gallina india', 'Con verduras, arroz y tortillas.', 6.75, 4),
  ('Bebidas', 'Horchata', 'De morro, con canela. Vaso grande.', 1.50, 1),
  ('Bebidas', 'Fresco de ensalada', 'Piña, manzana, marañón y berro.', 1.75, 2),
  ('Bebidas', 'Café de palo', 'Café salvadoreño de altura.', 1.25, 3),
  ('Bebidas', 'Agua embotellada', null, 0.75, 4),
  ('Postres', 'Quesadilla salvadoreña', 'Pan dulce de queso con ajonjolí.', 1.75, 1),
  ('Postres', 'Empanadas de plátano (2)', 'Rellenas de leche poleada.', 2.25, 2)
) as p(categoria, nombre, descripcion, precio, orden)
join categorias c on c.nombre = p.categoria;

-- La "Mesa 1" tiene un código fijo para el botón "Probar como cliente" de la portada.
insert into mesas (nombre, codigo, orden) values ('Mesa 1', 'demo', 1);
insert into mesas (nombre, orden) values
  ('Mesa 2', 2), ('Mesa 3', 3), ('Mesa 4', 4), ('Mesa 5', 5), ('Mesa 6', 6), ('Barra', 7);
