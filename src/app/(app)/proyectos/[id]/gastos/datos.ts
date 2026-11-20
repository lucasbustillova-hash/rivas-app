import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gasto } from "@/lib/gastos";

// Gastos del proyecto, del más nuevo al más viejo (solo los administradores los pueden leer).
export async function cargarGastos(supabase: SupabaseClient, proyectoId: string) {
  const { data } = await supabase
    .from("gastos")
    .select("id, fecha, categoria, descripcion, lugar, monto, metodo, nota, recibo_ruta")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  return ((data ?? []) as Gasto[]).map((g) => ({ ...g, monto: Number(g.monto) }));
}
