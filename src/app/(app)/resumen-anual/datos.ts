import type { SupabaseClient } from "@supabase/supabase-js";
import { resumenAnual, type CobroAnual, type GastoAnual, type PagoSubAnual } from "@/lib/resumen-anual";

// Cada movimiento del año, para la pantalla y para la planilla.
export type CobroDetalle = CobroAnual & { nota: string | null };
export type PagoSubDetalle = PagoSubAnual & { tipo: string; nota: string | null };
export type GastoDetalle = GastoAnual & { nota: string | null };

// Lee todas las filas de a 1000 (el máximo que devuelve Supabase de una vez).
async function leerTodo<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await pedir(desde, desde + 999);
    if (error) throw new Error("No se pudieron leer los movimientos del año.");
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

type CobroLeido = { fecha: string; monto: number; metodo: string; nota: string | null; proyecto_id: string };
type PagoLeido = {
  fecha: string;
  monto: number;
  metodo: string;
  es_adelanto: boolean;
  nota: string | null;
  asignaciones: { proyecto_id: string; modalidad: "dia" | "contrato"; subcontratistas: { nombre: string } | null } | null;
};
type GastoLeido = {
  fecha: string;
  monto: number;
  metodo: string;
  categoria: string;
  descripcion: string;
  lugar: string | null;
  nota: string | null;
  proyecto_id: string;
};

// Lo cobrado, lo pagado a subs y los gastos del año (por la fecha de cada pago).
export async function cargarResumenAnual(supabase: SupabaseClient, anio: number) {
  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;
  const [cobrosLeidos, pagosLeidos, gastosLeidos] = await Promise.all([
    leerTodo<CobroLeido>((a, b) =>
      supabase
        .from("pagos_cliente")
        .select("fecha, monto, metodo, nota, proyecto_id")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha")
        .order("id")
        .range(a, b),
    ),
    leerTodo<PagoLeido>((a, b) =>
      supabase
        .from("pagos_sub")
        .select("fecha, monto, metodo, es_adelanto, nota, asignaciones(proyecto_id, modalidad, subcontratistas(nombre))")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha")
        .order("id")
        .range(a, b),
    ),
    leerTodo<GastoLeido>((a, b) =>
      supabase
        .from("gastos")
        .select("fecha, monto, metodo, categoria, descripcion, lugar, nota, proyecto_id")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha")
        .order("id")
        .range(a, b),
    ),
  ]);

  const cobros: CobroDetalle[] = cobrosLeidos.map((c) => ({
    fecha: c.fecha,
    proyectoId: c.proyecto_id,
    monto: Number(c.monto),
    metodo: c.metodo,
    nota: c.nota,
  }));
  const pagosSubs: PagoSubDetalle[] = pagosLeidos
    .filter((p) => p.asignaciones)
    .map((p) => ({
      fecha: p.fecha,
      proyectoId: p.asignaciones!.proyecto_id,
      monto: Number(p.monto),
      metodo: p.metodo,
      sub: p.asignaciones!.subcontratistas?.nombre ?? "",
      tipo: p.asignaciones!.modalidad === "dia" ? "Por día" : p.es_adelanto ? "Contrato: adelanto" : "Contrato: pago",
      nota: p.nota,
    }));
  const gastos: GastoDetalle[] = gastosLeidos.map((g) => ({
    fecha: g.fecha,
    proyectoId: g.proyecto_id,
    monto: Number(g.monto),
    metodo: g.metodo,
    categoria: g.categoria,
    descripcion: g.descripcion,
    lugar: g.lugar,
    nota: g.nota,
  }));

  const ids = [...new Set([...cobros, ...pagosSubs, ...gastos].map((m) => m.proyectoId))];
  const { data: proyectosLeidos } = ids.length
    ? await supabase.from("proyectos").select("id, nombre, clientes(nombre)").in("id", ids)
    : { data: [] };
  const proyectos = ((proyectosLeidos ?? []) as unknown as { id: string; nombre: string; clientes: { nombre: string } | null }[]).map(
    (p) => ({ id: p.id, nombre: p.nombre, cliente: p.clientes?.nombre ?? "" }),
  );

  return { ...resumenAnual({ proyectos, cobros, pagosSubs, gastos }), cobros, pagosSubs, gastos };
}
