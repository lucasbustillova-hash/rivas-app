-- Gastos de cada proyecto (materiales, herramientas, permisos, dumpster…),
-- para saber la ganancia real. Solo los ven los administradores.
-- La foto del recibo va en la carpeta privada "documentos", en recibos/<proyecto>/.

create type public.categoria_gasto as enum ('materiales', 'herramientas', 'permisos', 'basura', 'otro');

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  fecha date not null default current_date,
  categoria public.categoria_gasto not null default 'materiales',
  descripcion text not null check (length(descripcion) between 1 and 200),
  lugar text check (lugar is null or length(lugar) <= 100),
  monto numeric(12, 2) not null check (monto > 0),
  metodo public.metodo_pago not null,
  nota text check (nota is null or length(nota) <= 500),
  recibo_ruta text,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on public.gastos (proyecto_id, fecha);

alter table public.gastos enable row level security;
revoke all on public.gastos from anon;

create policy "admin" on public.gastos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
