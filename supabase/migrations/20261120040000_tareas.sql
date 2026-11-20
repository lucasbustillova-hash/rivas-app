-- Tareas de cada obra: lo que falta hacer o comprar. No tienen montos, así que las ven y
-- las tachan todos los usuarios verificados (también desde la obra).

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 200),
  hecha boolean not null default false,
  hecha_en timestamptz,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on public.tareas (proyecto_id);

alter table public.tareas enable row level security;
revoke all on public.tareas from anon;

create policy "verificados" on public.tareas for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
