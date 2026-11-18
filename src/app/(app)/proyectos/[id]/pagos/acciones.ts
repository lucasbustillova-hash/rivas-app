"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { METODOS, PLANES, cuotasDelPlan, dinero, leerMonto, type Plan } from "@/lib/cobros";

export type EstadoFormulario = { error: string | null };

const UUID = /^[0-9a-f-]{36}$/i;

// Guarda el monto del contrato y el plan, y rehace las cuotas.
export async function guardarContrato(
  proyectoId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!UUID.test(proyectoId) || !(await esAdmin())) return { error: "Solo los administradores pueden cambiar el contrato." };

  const total = leerMonto(String(formData.get("monto_total") ?? ""));
  if (total == null || total <= 0) return { error: "Escribí el monto total del contrato (por ejemplo 18500)." };
  const plan = String(formData.get("plan") ?? "") as Plan;
  if (!PLANES.some((p) => p.valor === plan)) return { error: "Elegí el plan de pagos." };

  let cuotas: { descripcion: string; monto: number }[];
  if (plan === "propio") {
    const descripciones = formData.getAll("cuota_descripcion").map((d) => String(d).trim());
    const montos = formData.getAll("cuota_monto").map((m) => String(m).trim());
    cuotas = [];
    for (const [i, texto] of montos.entries()) {
      if (!texto && !descripciones[i]) continue;
      const monto = leerMonto(texto);
      if (monto == null || monto <= 0) return { error: `Revisá el monto del pago ${i + 1}.` };
      cuotas.push({ descripcion: (descripciones[i] || `Pago ${i + 1}`).slice(0, 100), monto });
    }
    if (cuotas.length === 0) return { error: "Agregá al menos un pago al plan." };
    const suma = Math.round(cuotas.reduce((t, c) => t + c.monto, 0) * 100) / 100;
    if (Math.abs(suma - total) > 0.004) {
      return { error: `Los pagos del plan suman ${dinero(suma)} y el contrato es ${dinero(total)}: tienen que coincidir.` };
    }
  } else {
    cuotas = cuotasDelPlan(plan, total);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos_cliente")
    .upsert({ proyecto_id: proyectoId, monto_total: total, plan }, { onConflict: "proyecto_id" });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };

  const { error: errorBorrar } = await supabase.from("cuotas_cliente").delete().eq("proyecto_id", proyectoId);
  if (errorBorrar) return { error: "No se pudo guardar el plan. Probá de nuevo." };
  const { error: errorCuotas } = await supabase
    .from("cuotas_cliente")
    .insert(cuotas.map((c, i) => ({ proyecto_id: proyectoId, orden: i + 1, descripcion: c.descripcion, monto: c.monto })));
  if (errorCuotas) return { error: "No se pudo guardar el plan. Probá de nuevo." };

  revalidatePath(`/proyectos/${proyectoId}`, "layout");
  redirect(`/proyectos/${proyectoId}/pagos`);
}

// Anota un pago recibido del cliente.
export async function registrarPago(
  proyectoId: string,
  _prev: EstadoFormulario & { listo?: number },
  formData: FormData,
): Promise<EstadoFormulario & { listo?: number }> {
  if (!UUID.test(proyectoId) || !(await esAdmin())) return { error: "Solo los administradores pueden anotar pagos." };

  const monto = leerMonto(String(formData.get("monto") ?? ""));
  if (monto == null || monto <= 0) return { error: "Escribí el monto que pagó (por ejemplo 7400)." };
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elegí la fecha del pago." };
  const metodo = String(formData.get("metodo") ?? "");
  if (!METODOS.some((m) => m.valor === metodo)) return { error: "Elegí cómo pagó." };
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("pagos_cliente").insert({ proyecto_id: proyectoId, monto, fecha, metodo, nota });
  if (error) return { error: "No se pudo guardar el pago. Probá de nuevo." };

  revalidatePath(`/proyectos/${proyectoId}`, "layout");
  return { error: null, listo: Date.now() };
}

// Borra un pago anotado por error.
export async function borrarPago(id: string): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: "Solo los administradores pueden borrar pagos." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("pagos_cliente").delete().eq("id", id).select("proyecto_id").maybeSingle();
  if (error || !data) return { error: "No se pudo borrar. Probá de nuevo." };
  revalidatePath(`/proyectos/${data.proyecto_id}`, "layout");
  return {};
}
