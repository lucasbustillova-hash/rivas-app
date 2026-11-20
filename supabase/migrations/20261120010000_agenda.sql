-- Calendario: qué sub va a qué obra cada día (lo planeado).
-- Es aparte de dias_trabajados, que es lo que se paga: un día programado
-- no suma plata hasta que un administrador lo marca como trabajado.
-- No tiene montos, así que lo ven todos los usuarios verificados.

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  subcontratista_id uuid not null references public.subcontratistas (id) on delete cascade,
  nota text check (nota is null or length(nota) <= 200),
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (fecha, proyecto_id, subcontratista_id)
);
create index on public.agenda (fecha);

alter table public.agenda enable row level security;
revoke all on public.agenda from anon;

create policy "verificados" on public.agenda for all to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
