-- Base de datos de la versión 1 (issue #14).
--
-- Reglas de seguridad (ver CLAUDE.md):
-- * Nadie entra sin verificación en dos pasos: todas las políticas piden aal2.
-- * Impuestos, tarifas, contratos y pagos: solo administradores.
-- * Clientes, proyectos y fotos: cualquier usuario verificado.
-- * El SSN/EIN se guarda encriptado por la app (columna tin_cifrado); acá solo
--   se guardan los últimos 4 dígitos en claro para mostrar •••-••-1234.

-- ─────────────────────────── Funciones de permiso ───────────────────────────

-- ¿El pedido viene de alguien que completó la verificación en dos pasos?
create function public.es_verificado() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- Perfil de cada usuario. es_admin lo marca un administrador a mano en Supabase.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  es_admin boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ¿Es un administrador verificado? security definer para poder leer perfiles
-- sin chocar con sus propias políticas.
create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_verificado() and exists (
    select 1 from public.perfiles p where p.id = auth.uid() and p.es_admin
  )
$$;

-- Cada usuario nuevo recibe un perfil (sin permisos de administrador).
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Los usuarios que ya existen hoy (los desarrolladores) quedan como administradores.
insert into public.perfiles (id, es_admin)
select id, true from auth.users
on conflict (id) do nothing;

-- Mantiene actualizado_en al día.
create function public.marcar_actualizado() returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ─────────────────────────────── Tipos ───────────────────────────────

create type public.estado_proyecto as enum ('estimado', 'activo', 'en_pausa', 'terminado');
create type public.etapa_archivo as enum ('antes', 'durante', 'despues');
create type public.tipo_archivo as enum ('foto', 'video');
create type public.tipo_sub as enum ('persona', 'llc');
create type public.tipo_tin as enum ('ssn', 'ein');
create type public.modalidad_pago as enum ('dia', 'contrato');
create type public.metodo_pago as enum ('efectivo', 'zelle', 'cheque', 'tarjeta', 'otro');
create type public.plan_pagos as enum ('50_50', '40_30_30', 'propio');

-- ─────────────────────────── Clientes y proyectos ───────────────────────────

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text,
  correo text,
  direccion text,
  notas text,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo_trabajo text not null,
  alcance text,
  direccion_obra text,
  fecha_inicio date,
  fecha_fin_estimada date,
  estado public.estado_proyecto not null default 'estimado',
  notas text,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fecha_fin_estimada is null or fecha_inicio is null or fecha_fin_estimada >= fecha_inicio)
);
create index on public.proyectos (cliente_id);
create index on public.proyectos (estado);

-- Fotos y videos. El archivo vive en Storage (bucket "obras"); acá va la ruta.
create table public.archivos_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  ruta text not null unique,
  tipo public.tipo_archivo not null,
  etapa public.etapa_archivo not null default 'durante',
  nota text,
  tomada_en timestamptz not null default now(),
  subido_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on public.archivos_proyecto (proyecto_id, tomada_en);

-- ─────────────────────────── Dinero del cliente (solo admin) ───────────────────────────

create table public.contratos_cliente (
  proyecto_id uuid primary key references public.proyectos (id) on delete cascade,
  monto_total numeric(12, 2) not null check (monto_total >= 0),
  plan public.plan_pagos not null default '50_50',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Cuotas del plan: 50/50 son 2, 40/30/30 son 3, "propio" las que hagan falta.
create table public.cuotas_cliente (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.contratos_cliente (proyecto_id) on delete cascade,
  orden smallint not null,
  descripcion text not null,
  monto numeric(12, 2) not null check (monto >= 0),
  unique (proyecto_id, orden)
);

create table public.pagos_cliente (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  cuota_id uuid references public.cuotas_cliente (id) on delete set null,
  fecha date not null default current_date,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  nota text,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on public.pagos_cliente (proyecto_id, fecha);

-- ─────────────────────────── Subcontratistas ───────────────────────────

-- Datos de contacto: los ve cualquier usuario verificado.
create table public.subcontratistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text,
  correo text,
  direccion text,
  oficio text,
  activo boolean not null default true,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Impuestos y tarifa: solo administradores.
create table public.subcontratistas_privado (
  subcontratista_id uuid primary key references public.subcontratistas (id) on delete cascade,
  nombre_legal text,
  tipo public.tipo_sub not null default 'persona',
  tin_tipo public.tipo_tin,
  tin_cifrado text,
  tin_ultimos4 text check (tin_ultimos4 is null or tin_ultimos4 ~ '^[0-9]{4}$'),
  w9_firmado boolean not null default false,
  w9_ruta text,
  tarifa_diaria numeric(10, 2) check (tarifa_diaria is null or tarifa_diaria >= 0),
  actualizado_en timestamptz not null default now()
);

-- ─────────────────────────── Pagos a subs (solo admin) ───────────────────────────

-- Un sub en un proyecto: por día (con su tarifa, que arranca con la de su ficha)
-- o por contrato (monto fijo).
create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  subcontratista_id uuid not null references public.subcontratistas (id) on delete restrict,
  modalidad public.modalidad_pago not null,
  tarifa_diaria numeric(10, 2) check (tarifa_diaria is null or tarifa_diaria >= 0),
  monto_contrato numeric(12, 2) check (monto_contrato is null or monto_contrato >= 0),
  descripcion text,
  creado_en timestamptz not null default now(),
  check (
    (modalidad = 'dia' and tarifa_diaria is not null)
    or (modalidad = 'contrato' and monto_contrato is not null)
  )
);
create index on public.asignaciones (proyecto_id);
create index on public.asignaciones (subcontratista_id);

-- Días trabajados (1 = día completo, 0.5 = medio día). Guarda la tarifa del
-- momento para que cambiarla después no altere lo ya cargado.
create table public.dias_trabajados (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.asignaciones (id) on delete cascade,
  fecha date not null,
  fraccion numeric(3, 2) not null default 1 check (fraccion in (0.5, 1)),
  tarifa numeric(10, 2) not null check (tarifa >= 0),
  nota text,
  creado_en timestamptz not null default now(),
  unique (asignacion_id, fecha)
);

create table public.pagos_sub (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.asignaciones (id) on delete cascade,
  fecha date not null default current_date,
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  es_adelanto boolean not null default false,
  nota text,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on public.pagos_sub (asignacion_id, fecha);

-- ─────────────────────────── actualizado_en ───────────────────────────

create trigger actualizar before update on public.clientes
  for each row execute function public.marcar_actualizado();
create trigger actualizar before update on public.proyectos
  for each row execute function public.marcar_actualizado();
create trigger actualizar before update on public.contratos_cliente
  for each row execute function public.marcar_actualizado();
create trigger actualizar before update on public.subcontratistas
  for each row execute function public.marcar_actualizado();
create trigger actualizar before update on public.subcontratistas_privado
  for each row execute function public.marcar_actualizado();

-- ─────────────────────────── Permisos por fila ───────────────────────────

alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.archivos_proyecto enable row level security;
alter table public.contratos_cliente enable row level security;
alter table public.cuotas_cliente enable row level security;
alter table public.pagos_cliente enable row level security;
alter table public.subcontratistas enable row level security;
alter table public.subcontratistas_privado enable row level security;
alter table public.asignaciones enable row level security;
alter table public.dias_trabajados enable row level security;
alter table public.pagos_sub enable row level security;

-- Perfiles: cada uno ve el suyo; los administradores ven todos. Nadie cambia
-- es_admin desde la app (se hace en Supabase).
create policy "ver perfiles" on public.perfiles for select to authenticated
  using (public.es_verificado() and (id = auth.uid() or public.es_admin()));

-- Usuarios verificados: clientes, proyectos, fotos y contacto de subs.
create policy "verificados" on public.clientes for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
create policy "verificados" on public.proyectos for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
create policy "verificados" on public.archivos_proyecto for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
create policy "verificados" on public.subcontratistas for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());

-- Solo administradores: impuestos, tarifas, contratos y pagos.
create policy "admin" on public.contratos_cliente for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.cuotas_cliente for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.pagos_cliente for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.subcontratistas_privado for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.asignaciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.dias_trabajados for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin" on public.pagos_sub for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Los visitantes sin sesión no tocan nada.
revoke all on all tables in schema public from anon;
revoke execute on function public.es_admin() from anon, public;
grant execute on function public.es_admin() to authenticated;

-- ─────────────────────────── Archivos (Storage) ───────────────────────────

-- "obras": fotos y videos de los proyectos. "documentos": W-9 (solo admin).
-- Los dos son privados: se abren con enlaces temporales.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('obras', 'obras', false, null), -- usa el límite general del plan
  ('documentos', 'documentos', false, 20971520)
on conflict (id) do nothing;

create policy "obras: verificados" on storage.objects for all to authenticated
  using (bucket_id = 'obras' and public.es_verificado())
  with check (bucket_id = 'obras' and public.es_verificado());

create policy "documentos: admin" on storage.objects for all to authenticated
  using (bucket_id = 'documentos' and public.es_admin())
  with check (bucket_id = 'documentos' and public.es_admin());
