-- Encriptación del SSN/EIN de los subcontratistas (issue #6).
--
-- La clave se genera al azar adentro de la base y se guarda en Supabase Vault:
-- nunca pasa por el repositorio, la app ni el navegador. El número se encripta y
-- desencripta solo con estas dos funciones, que primero comprueban que quien
-- pregunta sea un administrador verificado.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'clave_tin') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'clave_tin',
      'Clave para encriptar SSN/EIN de subcontratistas'
    );
  end if;
end;
$$;

-- Guarda (o reemplaza) el SSN/EIN de un sub. Acepta el número con o sin guiones.
create function public.guardar_tin(p_sub uuid, p_tipo public.tipo_tin, p_tin text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_digitos text := regexp_replace(coalesce(p_tin, ''), '[^0-9]', '', 'g');
  v_clave text;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  if length(v_digitos) <> 9 then
    raise exception 'El SSN o EIN debe tener 9 dígitos' using errcode = '22023';
  end if;

  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'clave_tin';

  insert into public.subcontratistas_privado (subcontratista_id, tin_tipo, tin_cifrado, tin_ultimos4)
  values (
    p_sub,
    p_tipo,
    encode(extensions.pgp_sym_encrypt(v_digitos, v_clave), 'base64'),
    right(v_digitos, 4)
  )
  on conflict (subcontratista_id) do update set
    tin_tipo = excluded.tin_tipo,
    tin_cifrado = excluded.tin_cifrado,
    tin_ultimos4 = excluded.tin_ultimos4;
end;
$$;

-- Devuelve el SSN/EIN completo (solo los 9 dígitos) para el botón "Mostrar".
create function public.ver_tin(p_sub uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_cifrado text;
  v_clave text;
begin
  if not public.es_admin() then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;

  select tin_cifrado into v_cifrado
  from public.subcontratistas_privado where subcontratista_id = p_sub;
  if v_cifrado is null then
    return null;
  end if;

  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'clave_tin';
  return extensions.pgp_sym_decrypt(decode(v_cifrado, 'base64'), v_clave);
end;
$$;

revoke execute on function public.guardar_tin(uuid, public.tipo_tin, text) from public, anon;
revoke execute on function public.ver_tin(uuid) from public, anon;
grant execute on function public.guardar_tin(uuid, public.tipo_tin, text) to authenticated;
grant execute on function public.ver_tin(uuid) to authenticated;

-- Desde la app no se pueden escribir directamente las columnas del SSN/EIN:
-- solo a través de guardar_tin.
revoke insert, update on public.subcontratistas_privado from authenticated;
grant insert (subcontratista_id, nombre_legal, tipo, w9_firmado, w9_ruta, tarifa_diaria)
  on public.subcontratistas_privado to authenticated;
grant update (nombre_legal, tipo, w9_firmado, w9_ruta, tarifa_diaria)
  on public.subcontratistas_privado to authenticated;
