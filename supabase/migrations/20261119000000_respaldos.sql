-- Registro de respaldos descargados desde la app (#27): sirve para mostrar
-- cuándo fue el último y avisar si pasó mucho tiempo. Solo administradores.
create table public.respaldos (
  id uuid primary key default gen_random_uuid(),
  hecho_en timestamptz not null default now(),
  hecho_por uuid references auth.users (id) on delete set null default auth.uid(),
  archivos integer not null default 0 check (archivos >= 0),
  bytes bigint not null default 0 check (bytes >= 0)
);

alter table public.respaldos enable row level security;
revoke all on public.respaldos from anon;

create policy "admin" on public.respaldos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
