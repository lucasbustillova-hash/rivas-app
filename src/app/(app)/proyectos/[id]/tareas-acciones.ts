"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

// Las tareas no tienen montos: las maneja cualquier usuario verificado (lo controla la base).

export async function agregarTarea(proyectoId: string, texto: string): Promise<{ error?: string }> {
  const limpio = texto.trim().slice(0, 200);
  if (!UUID.test(proyectoId)) return { error: "No se encontró la obra." };
  if (!limpio) return { error: "Escribí la tarea." };
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").insert({ proyecto_id: proyectoId, texto: limpio });
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  revalidatePath(`/proyectos/${proyectoId}`);
  return {};
}

export async function marcarTarea(id: string, hecha: boolean): Promise<{ error?: string }> {
  if (!UUID.test(id)) return { error: "No se encontró." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tareas")
    .update({ hecha, hecha_en: hecha ? new Date().toISOString() : null })
    .eq("id", id)
    .select("proyecto_id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo cambiar." };
  revalidatePath(`/proyectos/${data.proyecto_id}`);
  return {};
}

export async function borrarTarea(id: string): Promise<{ error?: string }> {
  if (!UUID.test(id)) return { error: "No se encontró." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tareas").delete().eq("id", id).select("proyecto_id").maybeSingle();
  if (error || !data) return { error: "No se pudo borrar." };
  revalidatePath(`/proyectos/${data.proyecto_id}`);
  return {};
}
