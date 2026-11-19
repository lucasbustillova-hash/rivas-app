-- Planilla 1099 general (#31).

-- 1) Dirección del sub separada, como la piden la 1099-NEC y los programas de 1099.
--    La columna "direccion" que ya existía pasa a ser la calle y el número, así que
--    lo que ya estaba cargado queda ahí y solo hay que completar el resto.
alter table public.subcontratistas
  add column ciudad text,
  add column estado text check (estado is null or estado ~ '^[A-Z]{2}$'),
  add column codigo_postal text check (codigo_postal is null or codigo_postal ~ '^[0-9]{5}(-[0-9]{4})?$');

comment on column public.subcontratistas.direccion is 'Calle y número (y apto/unidad).';

-- 2) Datos de la empresa como pagador de la 1099 (una sola fila). Solo administradores.
create table public.empresa (
  id boolean primary key default true check (id),
  nombre_legal text,
  ein text check (ein is null or ein ~ '^[0-9]{9}$'),
  direccion text,
  ciudad text,
  estado text check (estado is null or estado ~ '^[A-Z]{2}$'),
  codigo_postal text check (codigo_postal is null or codigo_postal ~ '^[0-9]{5}(-[0-9]{4})?$'),
  telefono text,
  actualizado_en timestamptz not null default now()
);

alter table public.empresa enable row level security;
revoke all on public.empresa from anon;

create policy "admin" on public.empresa for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
