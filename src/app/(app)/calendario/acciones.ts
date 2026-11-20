"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { hoyEnFlorida, rangoDeDias, MAXIMO_DIAS } from "@/lib/agenda";
import { agregarDias } from "../proyectos/[id]/mano-de-obra/acciones";

export type EstadoProgramar = { error: string | null; listo?: number };

const UUID = /^[0-9a-f-]{36}$/i;

// Programa uno o varios subs en una obra para un rango de días.
export async function programar(_prev: EstadoProgramar, formData: FormData): Promise<EstadoProgramar> {
  const proyectoId = String(formData.get("proyecto_id") ?? "");
  if (!UUID.test(proyectoId)) return { error: "Elegí la obra." };
  const subs = [...new Set(formData.getAll("sub").map(String))].filter((s) => UUID.test(s));
  if (subs.length === 0) return { error: "Elegí al menos un sub." };
  if (subs.length > 30) return { error: "Son demasiados subs de una vez." };
  const sinDomingos = formData.get("sin_domingos") === "si";
  const dias = rangoDeDias(String(formData.get("desde") ?? ""), String(formData.get("hasta") ?? ""), sinDomingos);
  if (!dias) return { error: `Revisá las fechas: "hasta" no puede ser antes de "desde", y como mucho ${MAXIMO_DIAS} días.` };
  if (dias.length === 0) return { error: "En esas fechas solo hay domingos." };
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("agenda").upsert(
    dias.flatMap((fecha) => subs.map((sub) => ({ fecha, proyecto_id: proyectoId, subcontratista_id: sub, nota }))),
    { onConflict: "fecha,proyecto_id,subcontratista_id", ignoreDuplicates: true },
  );
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  revalidatePath("/calendario");
  return { error: null, listo: Date.now() };
}

// Saca a un sub de una obra ese día.
export async function quitarDeAgenda(id: string): Promise<{ error?: string }> {
  if (!UUID.test(id)) return { error: "No se encontró." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("agenda").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "No se pudo quitar." };
  revalidatePath("/calendario");
  return {};
}

// Marca como trabajado un día programado (solo administradores, solo hoy o antes).
// Usa lo mismo que el calendario de mano de obra, así queda en la cuenta del sub.
export async function marcarTrabajado(asignacionId: string, fecha: string, fraccion: 1 | 0.5): Promise<{ error?: string }> {
  if (!(await esAdmin())) return { error: "Solo los administradores marcan días trabajados." };
  if (fecha > hoyEnFlorida()) return { error: "Todavía no llegó ese día." };
  const r = await agregarDias(asignacionId, [{ fecha, fraccion }]);
  if (r.error) return r;
  revalidatePath("/calendario");
  return {};
}
