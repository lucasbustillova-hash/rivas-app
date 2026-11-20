import type { SupabaseClient } from "@supabase/supabase-js";
import { pagosPorSub, type AsignacionDia } from "@/lib/pagos-semana";

type Fila = {
  id: string;
  subcontratistas: { id: string; nombre: string };
  proyectos: { id: string; nombre: string };
  dias_trabajados: { fecha: string; fraccion: number; tarifa: number }[];
  pagos_sub: { monto: number }[];
};

// Subs por día de todas las obras, con sus días y pagos (solo administradores ven los montos).
export async function leerAsignacionesDia(supabase: SupabaseClient, filtro?: { subId: string }): Promise<AsignacionDia[]> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    let pedido = supabase
      .from("asignaciones")
      .select("id, subcontratistas(id, nombre), proyectos(id, nombre), dias_trabajados(fecha, fraccion, tarifa), pagos_sub(monto)")
      .eq("modalidad", "dia");
    if (filtro) pedido = pedido.eq("subcontratista_id", filtro.subId);
    const { data, error } = await pedido.order("id").range(desde, desde + 999);
    if (error) throw new Error("No se pudieron leer los pagos.");
    filas.push(...((data ?? []) as unknown as Fila[]));
    if (!data || data.length < 1000) break;
  }
  return filas.map((a) => ({
    id: a.id,
    sub: a.subcontratistas,
    proyecto: a.proyectos,
    dias: a.dias_trabajados.map((d) => ({ fecha: d.fecha, fraccion: Number(d.fraccion), tarifa: Number(d.tarifa) })),
    pagos: a.pagos_sub.map((p) => ({ monto: Number(p.monto) })),
  }));
}

export async function cargarPagosSemana(supabase: SupabaseClient) {
  return pagosPorSub(await leerAsignacionesDia(supabase));
}
