-- Cuánto espacio se usa: la base de datos y los archivos (fotos, videos, W-9, recibos).
-- El plan gratis de Supabase tiene 500 MB de base y 1 GB de archivos; la app avisa cuando se está llenando.
-- Solo administradores. security definer para poder leer storage.objects, que no se ve desde la app.

create function public.espacio_usado()
returns table (base_bytes bigint, archivos_bytes bigint, archivos bigint)
language sql stable security definer set search_path = ''
as $$
  select
    pg_catalog.pg_database_size(pg_catalog.current_database()),
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint,
    count(o.id)
  from (select 1) as uno
  left join storage.objects o on true
  where public.es_admin()
$$;

revoke all on function public.espacio_usado() from public, anon;
grant execute on function public.espacio_usado() to authenticated;
