import type { SupabaseClient } from "@supabase/supabase-js";
import { cuentasPendientes, type AsignacionLeida, type ContratoLeido } from "@/lib/pendientes";
import type { Cuota } from "@/lib/cobros";
import type { EstadoProyecto } from "@/lib/proyectos";

type Proyecto = { id: string; nombre: string; estado: EstadoProyecto };

// Lee todas las filas de a 1000 (el máximo que devuelve Supabase de una vez).
async function leerTodo<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await pedir(desde, desde + 999);
    if (error) throw new Error("No se pudieron leer las cuentas.");
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

// Todas las obras: lo que se le debe a cada sub y lo que le falta pagar a cada cliente (solo administradores).
export async function cargarPendientes(supabase: SupabaseClient) {
  const [asignaciones, contratos] = await Promise.all([
    leerTodo<{
      id: string;
      modalidad: AsignacionLeida["modalidad"];
      monto_contrato: number | null;
      subcontratistas: { id: string; nombre: string };
      proyectos: Proyecto;
      dias_trabajados: { fraccion: number; tarifa: number }[];
      pagos_sub: { monto: number }[];
    }>((a, b) =>
      supabase
        .from("asignaciones")
        .select(
          "id, modalidad, monto_contrato, subcontratistas(id, nombre), proyectos(id, nombre, estado), dias_trabajados(fraccion, tarifa), pagos_sub(monto)",
        )
        .order("id")
        .range(a, b),
    ),
    leerTodo<{
      monto_total: number;
      cuotas_cliente: Cuota[];
      proyectos: Proyecto & { clientes: { nombre: string } | null; pagos_cliente: { monto: number }[] };
    }>((a, b) =>
      supabase
        .from("contratos_cliente")
        .select("monto_total, cuotas_cliente(id, orden, descripcion, monto), proyectos(id, nombre, estado, clientes(nombre), pagos_cliente(monto))")
        .order("proyecto_id")
        .range(a, b),
    ),
  ]);

  return cuentasPendientes({
    asignaciones: asignaciones.map(
      (a): AsignacionLeida => ({
        id: a.id,
        modalidad: a.modalidad,
        monto_contrato: a.monto_contrato == null ? null : Number(a.monto_contrato),
        sub: a.subcontratistas,
        proyecto: a.proyectos,
        dias: a.dias_trabajados,
        pagos: a.pagos_sub,
      }),
    ),
    contratos: contratos.map(
      (c): ContratoLeido => ({
        monto_total: Number(c.monto_total),
        cuotas: c.cuotas_cliente,
        pagos: c.proyectos.pagos_cliente,
        proyecto: { id: c.proyectos.id, nombre: c.proyectos.nombre, estado: c.proyectos.estado, cliente: c.proyectos.clientes?.nombre ?? "" },
      }),
    ),
  });
}
