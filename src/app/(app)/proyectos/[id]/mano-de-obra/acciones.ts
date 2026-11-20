"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { hoyEnFlorida } from "@/lib/agenda";
import { METODOS, leerMonto } from "@/lib/cobros";
import type { EstadoPago } from "@/components/formulario-pago";

export type EstadoFormulario = { error: string | null };

const UUID = /^[0-9a-f-]{36}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const SIN_PERMISO = "Solo los administradores pueden cargar mano de obra y pagos.";

function refrescar(proyectoId: string) {
  revalidatePath(`/proyectos/${proyectoId}`, "layout");
  revalidatePath("/subs", "layout");
}

// Suma un sub por día al proyecto. Si ya estaba por día, lleva a su pantalla.
export async function crearAsignacionDia(
  proyectoId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!UUID.test(proyectoId) || !(await esAdmin())) return { error: SIN_PERMISO };
  const subId = String(formData.get("subcontratista_id") ?? "");
  if (!UUID.test(subId)) return { error: "Elegí al subcontratista." };
  const tarifa = leerMonto(String(formData.get("tarifa_diaria") ?? ""));
  if (tarifa == null || tarifa <= 0) return { error: "Escribí la tarifa por día (por ejemplo 220)." };
  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 200) || null;

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("asignaciones")
    .select("id")
    .eq("proyecto_id", proyectoId)
    .eq("subcontratista_id", subId)
    .eq("modalidad", "dia")
    .maybeSingle();
  if (existente) redirect(`/proyectos/${proyectoId}/mano-de-obra/${existente.id}`);

  const { data, error } = await supabase
    .from("asignaciones")
    .insert({ proyecto_id: proyectoId, subcontratista_id: subId, modalidad: "dia", tarifa_diaria: tarifa, descripcion })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo guardar. Probá de nuevo." };

  refrescar(proyectoId);
  redirect(`/proyectos/${proyectoId}/mano-de-obra/${data.id}`);
}

function leerContrato(formData: FormData): { error: string } | { descripcion: string; monto: number } {
  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 200);
  const monto = leerMonto(String(formData.get("monto_contrato") ?? ""));
  if (!descripcion) return { error: "Escribí la tarea (por ejemplo: colgar sheetrock)." };
  if (monto == null || monto <= 0) return { error: "Escribí el monto acordado (por ejemplo 3200)." };
  return { descripcion, monto };
}

// Suma un sub por contrato (tarea con precio cerrado) al proyecto.
export async function crearAsignacionContrato(
  proyectoId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!UUID.test(proyectoId) || !(await esAdmin())) return { error: SIN_PERMISO };
  const subId = String(formData.get("subcontratista_id") ?? "");
  if (!UUID.test(subId)) return { error: "Elegí al subcontratista." };
  const datos = leerContrato(formData);
  if ("error" in datos) return { error: datos.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asignaciones")
    .insert({
      proyecto_id: proyectoId,
      subcontratista_id: subId,
      modalidad: "contrato",
      monto_contrato: datos.monto,
      descripcion: datos.descripcion,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo guardar. Probá de nuevo." };

  refrescar(proyectoId);
  redirect(`/proyectos/${proyectoId}/mano-de-obra/${data.id}`);
}

// Cambia la tarea o el monto acordado.
export async function editarContrato(
  asignacionId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const datos = leerContrato(formData);
  if ("error" in datos) return { error: datos.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asignaciones")
    .update({ monto_contrato: datos.monto, descripcion: datos.descripcion })
    .eq("id", asignacionId)
    .eq("modalidad", "contrato")
    .select("proyecto_id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo guardar. Probá de nuevo." };
  refrescar(data.proyecto_id);
  return { error: null };
}

// Guarda dónde quedó el acuerdo firmado que el navegador ya subió.
export async function marcarContratoArchivo(asignacionId: string, ruta: string): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  if (!ruta.startsWith(`contratos/${asignacionId}/`) || ruta.includes("..")) return { error: "Archivo no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asignaciones")
    .update({ contrato_ruta: ruta })
    .eq("id", asignacionId)
    .select("proyecto_id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo guardar." };
  refrescar(data.proyecto_id);
  return {};
}

// Borra al sub del proyecto (con sus días y pagos). Solo si no tiene pagos, para no perder historial.
export async function borrarAsignacion(asignacionId: string): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { count } = await supabase
    .from("pagos_sub")
    .select("id", { count: "exact", head: true })
    .eq("asignacion_id", asignacionId);
  if ((count ?? 0) > 0) return { error: "Tiene pagos anotados: borralos primero si de verdad fue un error." };
  const { data, error } = await supabase
    .from("asignaciones")
    .delete()
    .eq("id", asignacionId)
    .select("proyecto_id, contrato_ruta")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo borrar." };
  if (data.contrato_ruta) await supabase.storage.from("documentos").remove([data.contrato_ruta]);
  refrescar(data.proyecto_id);
  redirect(`/proyectos/${data.proyecto_id}/mano-de-obra`);
}

// Cambia la tarifa para los días que se carguen de ahora en adelante.
export async function cambiarTarifa(
  asignacionId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const tarifa = leerMonto(String(formData.get("tarifa_diaria") ?? ""));
  if (tarifa == null || tarifa <= 0) return { error: "Escribí la tarifa por día." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asignaciones")
    .update({ tarifa_diaria: tarifa })
    .eq("id", asignacionId)
    .eq("modalidad", "dia")
    .select("proyecto_id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo guardar. Probá de nuevo." };
  refrescar(data.proyecto_id);
  return { error: null };
}

// Guarda los días marcados en el calendario (con la tarifa actual).
export async function agregarDias(
  asignacionId: string,
  dias: { fecha: string; fraccion: number }[],
): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  if (dias.length === 0 || dias.length > 200) return { error: "Marcá al menos un día." };
  if (dias.some((d) => !FECHA.test(d.fecha) || (d.fraccion !== 1 && d.fraccion !== 0.5))) {
    return { error: "Hay un día no válido." };
  }
  // Un día cuenta para el pago recién cuando pasó.
  if (dias.some((d) => d.fecha > hoyEnFlorida())) return { error: "Hay un día que todavía no llegó." };
  const supabase = await createClient();
  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select("proyecto_id, tarifa_diaria, modalidad")
    .eq("id", asignacionId)
    .maybeSingle();
  if (!asignacion || asignacion.modalidad !== "dia") return { error: "No se encontró." };

  const { error } = await supabase.from("dias_trabajados").upsert(
    dias.map((d) => ({ asignacion_id: asignacionId, fecha: d.fecha, fraccion: d.fraccion, tarifa: asignacion.tarifa_diaria })),
    { onConflict: "asignacion_id,fecha" },
  );
  if (error) return { error: "No se pudieron guardar los días. Probá de nuevo." };
  refrescar(asignacion.proyecto_id);
  return {};
}

export async function borrarDia(id: string): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dias_trabajados")
    .delete()
    .eq("id", id)
    .select("asignaciones(proyecto_id)")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo borrar." };
  const proyectoId = (data.asignaciones as unknown as { proyecto_id: string } | null)?.proyecto_id;
  if (proyectoId) refrescar(proyectoId);
  return {};
}

// Anota un pago al sub.
export async function registrarPagoSub(asignacionId: string, _prev: EstadoPago, formData: FormData): Promise<EstadoPago> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const monto = leerMonto(String(formData.get("monto") ?? ""));
  if (monto == null || monto <= 0) return { error: "Escribí el monto que se le pagó." };
  const fecha = String(formData.get("fecha") ?? "");
  if (!FECHA.test(fecha)) return { error: "Elegí la fecha del pago." };
  const metodo = String(formData.get("metodo") ?? "");
  if (!METODOS.some((m) => m.valor === metodo)) return { error: "Elegí cómo se le pagó." };
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;
  const esAdelanto = formData.get("es_adelanto") === "si";

  const supabase = await createClient();
  const { data: asignacion } = await supabase.from("asignaciones").select("proyecto_id").eq("id", asignacionId).maybeSingle();
  if (!asignacion) return { error: "No se encontró." };
  const { error } = await supabase
    .from("pagos_sub")
    .insert({ asignacion_id: asignacionId, monto, fecha, metodo, nota, es_adelanto: esAdelanto });
  if (error) return { error: "No se pudo guardar el pago. Probá de nuevo." };
  refrescar(asignacion.proyecto_id);
  return {
    error: null,
    listo: Date.now(),
    enlace: { href: `/proyectos/${asignacion.proyecto_id}/mano-de-obra/${asignacionId}/cuenta`, texto: "Ver estado de cuenta" },
  };
}

export async function borrarPagoSub(id: string): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos_sub")
    .delete()
    .eq("id", id)
    .select("asignaciones(proyecto_id)")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo borrar." };
  const proyectoId = (data.asignaciones as unknown as { proyecto_id: string } | null)?.proyecto_id;
  if (proyectoId) refrescar(proyectoId);
  return {};
}
