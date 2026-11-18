"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CARPETA, datosEtapa, rutaMini, type TipoArchivo } from "@/lib/fotos";

const UUID = /^[0-9a-f-]{36}$/i;

// Convierte "2026-11-18" en una hora: ahora si es hoy, mediodía si es otro día.
function horaDe(fecha: string, hoy: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha === hoy) return new Date().toISOString();
  return `${fecha}T12:00:00-05:00`;
}

// Guarda los datos de un archivo que el navegador ya subió a la carpeta "obras".
export async function registrarArchivo(datos: {
  proyectoId: string;
  ruta: string;
  tipo: TipoArchivo;
  etapa: string;
  nota: string;
  fecha: string;
  hoy: string;
}): Promise<{ error?: string }> {
  const { proyectoId, ruta, tipo, etapa, nota, fecha, hoy } = datos;
  if (!UUID.test(proyectoId) || !ruta.startsWith(`${proyectoId}/`) || ruta.includes("..")) {
    return { error: "Archivo no válido." };
  }
  if (tipo !== "foto" && tipo !== "video") return { error: "Archivo no válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("archivos_proyecto").insert({
    proyecto_id: proyectoId,
    ruta,
    tipo,
    etapa: datosEtapa(etapa) ? etapa : "durante",
    nota: nota.trim().slice(0, 500) || null,
    tomada_en: horaDe(fecha, hoy),
  });
  if (error) {
    // Si no se pudo guardar, se borra lo subido para no dejar archivos sueltos.
    await supabase.storage.from(CARPETA).remove([ruta, rutaMini(ruta)]);
    return { error: "No se pudo guardar." };
  }
  revalidatePath(`/proyectos/${proyectoId}`, "layout");
  return {};
}

// Cambia la etapa, la fecha o la nota.
export async function actualizarArchivo(
  id: string,
  _prev: { error?: string; listo?: boolean },
  formData: FormData,
): Promise<{ error?: string; listo?: boolean }> {
  const etapa = String(formData.get("etapa") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500);
  const fecha = String(formData.get("fecha") ?? "");
  const hoy = String(formData.get("hoy") ?? "");
  if (!datosEtapa(etapa)) return { error: "Elegí la etapa." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elegí la fecha." };

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("archivos_proyecto")
    .select("proyecto_id, tomada_en")
    .eq("id", id)
    .maybeSingle();
  if (!actual) return { error: "No se encontró el archivo." };

  // Si la fecha no cambió, se conserva la hora original.
  const original = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(actual.tomada_en));
  const { error } = await supabase
    .from("archivos_proyecto")
    .update({ etapa, nota: nota || null, ...(fecha === original ? {} : { tomada_en: horaDe(fecha, hoy) }) })
    .eq("id", id);
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };

  revalidatePath(`/proyectos/${actual.proyecto_id}`, "layout");
  return { listo: true };
}

// Borra la foto o el video (y su versión chica).
export async function borrarArchivo(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: archivo } = await supabase
    .from("archivos_proyecto")
    .select("proyecto_id, ruta")
    .eq("id", id)
    .maybeSingle();
  if (!archivo) return { error: "No se encontró el archivo." };

  const { error } = await supabase.from("archivos_proyecto").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar. Probá de nuevo." };
  await supabase.storage.from(CARPETA).remove([archivo.ruta, rutaMini(archivo.ruta)]);

  revalidatePath(`/proyectos/${archivo.proyecto_id}`, "layout");
  redirect(`/proyectos/${archivo.proyecto_id}/fotos`);
}
