"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { METODOS, leerMonto } from "@/lib/cobros";
import { CATEGORIAS } from "@/lib/gastos";

export type EstadoGasto = { error: string | null; listo?: number };

const UUID = /^[0-9a-f-]{36}$/i;
const SIN_PERMISO = "Solo los administradores pueden cargar gastos.";

// Anota un gasto del proyecto. Si tiene recibo, el navegador ya lo subió y manda la ruta.
export async function registrarGasto(proyectoId: string, _prev: EstadoGasto, formData: FormData): Promise<EstadoGasto> {
  if (!UUID.test(proyectoId) || !(await esAdmin())) return { error: SIN_PERMISO };

  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 200);
  if (!descripcion) return { error: "Escribí en qué se gastó (por ejemplo: cerámica y pegamento)." };
  const monto = leerMonto(String(formData.get("monto") ?? ""));
  if (monto == null || monto <= 0) return { error: "Escribí el monto (por ejemplo 245.80)." };
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elegí la fecha del gasto." };
  const categoria = String(formData.get("categoria") ?? "");
  if (!CATEGORIAS.some((c) => c.valor === categoria)) return { error: "Elegí el tipo de gasto." };
  const metodo = String(formData.get("metodo") ?? "");
  if (!METODOS.some((m) => m.valor === metodo)) return { error: "Elegí cómo se pagó." };
  const lugar = String(formData.get("lugar") ?? "").trim().slice(0, 100) || null;
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;
  const recibo = String(formData.get("recibo_ruta") ?? "") || null;
  if (recibo && (!recibo.startsWith(`recibos/${proyectoId}/`) || recibo.includes(".."))) return { error: "Recibo no válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("gastos").insert({
    proyecto_id: proyectoId,
    descripcion,
    monto,
    fecha,
    categoria,
    metodo,
    lugar,
    nota,
    recibo_ruta: recibo,
  });
  if (error) return { error: "No se pudo guardar el gasto. Probá de nuevo." };

  revalidatePath(`/proyectos/${proyectoId}`, "layout");
  return { error: null, listo: Date.now() };
}

// Borra un gasto anotado por error, con su recibo.
export async function borrarGasto(id: string): Promise<{ error?: string }> {
  if (!UUID.test(id) || !(await esAdmin())) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gastos")
    .delete()
    .eq("id", id)
    .select("proyecto_id, recibo_ruta")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo borrar. Probá de nuevo." };
  if (data.recibo_ruta) await supabase.storage.from("documentos").remove([data.recibo_ruta]);
  revalidatePath(`/proyectos/${data.proyecto_id}`, "layout");
  return {};
}
