import type { SupabaseClient } from "@supabase/supabase-js";
import { resumenAsignacion, type Asignacion, type DiaTrabajado, type PagoSub } from "@/lib/mano-de-obra";

export type FilaManoDeObra = Asignacion & {
  sub: { id: string; nombre: string; oficio: string | null };
  resumen: ReturnType<typeof resumenAsignacion>;
};

// Todos los subs del proyecto con lo ganado, pagado y lo que se les debe (solo administradores).
export async function cargarManoDeObra(supabase: SupabaseClient, proyectoId: string) {
  const { data } = await supabase
    .from("asignaciones")
    .select(
      "id, proyecto_id, subcontratista_id, modalidad, tarifa_diaria, monto_contrato, descripcion, subcontratistas(id, nombre, oficio), dias_trabajados(fraccion, tarifa), pagos_sub(monto)",
    )
    .eq("proyecto_id", proyectoId)
    .order("creado_en");

  const filas: FilaManoDeObra[] = (data ?? []).map((a) => {
    const fila = a as unknown as Asignacion & {
      subcontratistas: FilaManoDeObra["sub"];
      dias_trabajados: Pick<DiaTrabajado, "fraccion" | "tarifa">[];
      pagos_sub: Pick<PagoSub, "monto">[];
    };
    return {
      ...fila,
      sub: fila.subcontratistas,
      resumen: resumenAsignacion(fila, fila.dias_trabajados, fila.pagos_sub),
    };
  });
  const totales = filas.reduce(
    (t, f) => ({
      ganado: Math.round((t.ganado + f.resumen.ganado) * 100) / 100,
      pagado: Math.round((t.pagado + f.resumen.pagado) * 100) / 100,
      debe: Math.round((t.debe + f.resumen.debe) * 100) / 100,
    }),
    { ganado: 0, pagado: 0, debe: 0 },
  );
  return { filas, totales };
}
