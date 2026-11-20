-- Revisión de permisos (20/11): un usuario verificado que no es administrador podía borrar una obra
-- desde la base (la app no tiene botón), y con ella se borraban en cascada sus pagos, contratos, días y gastos.
-- También podía borrar un sub sin obras, y con él sus datos de impuestos (SSN/EIN, W-9).
-- Ahora todos pueden ver, crear y editar obras y subs, pero solo los administradores los pueden borrar.

drop policy "verificados" on public.proyectos;
create policy "verificados ven" on public.proyectos for select to authenticated using (public.es_verificado());
create policy "verificados crean" on public.proyectos for insert to authenticated with check (public.es_verificado());
create policy "verificados editan" on public.proyectos for update to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
create policy "admin borra" on public.proyectos for delete to authenticated using (public.es_admin());

drop policy "verificados" on public.subcontratistas;
create policy "verificados ven" on public.subcontratistas for select to authenticated using (public.es_verificado());
create policy "verificados crean" on public.subcontratistas for insert to authenticated with check (public.es_verificado());
create policy "verificados editan" on public.subcontratistas for update to authenticated
  using (public.es_verificado()) with check (public.es_verificado());
create policy "admin borra" on public.subcontratistas for delete to authenticated using (public.es_admin());

-- El espacio usado le mostraba el tamaño de la base a cualquiera; ahora solo a administradores.
create or replace function public.espacio_usado()
returns table (base_bytes bigint, archivos_bytes bigint, archivos bigint)
language sql stable security definer set search_path = ''
as $$
  select
    pg_catalog.pg_database_size(pg_catalog.current_database()),
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint,
    count(o.id)
  from storage.objects o
  where public.es_admin()
  having public.es_admin()
$$;
