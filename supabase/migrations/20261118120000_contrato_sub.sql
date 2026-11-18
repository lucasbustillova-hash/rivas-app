-- Subs por contrato (#8): acuerdo firmado opcional, guardado en la carpeta
-- privada "documentos" (solo administradores) bajo contratos/{asignacion}/.
alter table public.asignaciones add column contrato_ruta text
  check (contrato_ruta is null or contrato_ruta like 'contratos/' || id::text || '/%');
