"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { hoyEnFlorida } from "@/lib/agenda";
import { METODOS } from "@/lib/cobros";
import { pagosPorSub } from "@/lib/pagos-semana";
import { leerAsignacionesDia } from "./datos";

const UUID = /^[0-9a-f-]{36}$/i;

// Anota de una vez lo que se le pagó a un sub: un pago por cada obra, con lo que se le debía en cada una.
// "total" es lo que se veía en pantalla: si mientras tanto cambió (se marcó otro día, otro pago), no se anota nada.
export async function marcarPagado(subId: string, total: number, metodo: string): Promise<{ error?: string }> {
  if (!UUID.test(subId) || !(await esAdmin())) return { error: "Solo los administradores pueden anotar pagos." };
  if (!METODOS.some((m) => m.valor === metodo)) return { error: "Elegí cómo se le pagó." };

  const supabase = await createClient();
  const sub = pagosPorSub(await leerAsignacionesDia(supabase, { subId })).subs[0];
  if (!sub || Math.abs(sub.total - total) > 0.005) {
    return { error: "Cambió lo que se le debe (se marcó un día o un pago). Revisá el monto nuevo antes de anotarlo." };
  }

  const fecha = hoyEnFlorida();
  const { error } = await supabase.from("pagos_sub").insert(
    sub.obras.map((o) => ({ asignacion_id: o.asignacionId, monto: o.debe, fecha, metodo, nota: "Pago de la semana", es_adelanto: false })),
  );
  if (error) return { error: "No se pudo anotar el pago. Probá de nuevo." };

  revalidatePath("/pagos");
  revalidatePath("/", "layout");
  return {};
}
