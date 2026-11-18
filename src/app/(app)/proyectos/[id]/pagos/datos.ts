import type { SupabaseClient } from "@supabase/supabase-js";
import { resumenCobro, type Contrato, type Cuota, type PagoCliente } from "@/lib/cobros";

// Contrato, cuotas y pagos del proyecto (solo los administradores los pueden leer).
export async function cargarCobro(supabase: SupabaseClient, proyectoId: string) {
  const [c, q, p] = await Promise.all([
    supabase.from("contratos_cliente").select("proyecto_id, monto_total, plan").eq("proyecto_id", proyectoId).maybeSingle(),
    supabase.from("cuotas_cliente").select("id, orden, descripcion, monto").eq("proyecto_id", proyectoId).order("orden"),
    supabase
      .from("pagos_cliente")
      .select("id, fecha, monto, metodo, nota")
      .eq("proyecto_id", proyectoId)
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false }),
  ]);
  const contrato = c.data as Contrato | null;
  const cuotas = (q.data ?? []) as Cuota[];
  const pagos = (p.data ?? []) as PagoCliente[];
  return { contrato, cuotas, pagos, resumen: contrato ? resumenCobro(contrato, cuotas, pagos) : null };
}
