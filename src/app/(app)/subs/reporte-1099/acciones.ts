"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { leerEstadoYZip } from "@/lib/subs";

export type EstadoEmpresa = { error: string | null; listo?: number };

function texto(formData: FormData, campo: string) {
  const v = formData.get(campo);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Guarda los datos de NAHOMY como pagador de las 1099 (una sola fila).
export async function guardarEmpresa(_prev: EstadoEmpresa, formData: FormData): Promise<EstadoEmpresa> {
  if (!(await esAdmin())) return { error: "Solo un administrador puede cambiar estos datos." };

  const ein = texto(formData, "ein")?.replace(/\D/g, "") ?? null;
  if (ein !== null && ein.length !== 9) return { error: "El EIN tiene que tener 9 dígitos." };
  const lugar = leerEstadoYZip(texto(formData, "estado"), texto(formData, "codigo_postal"));
  if (lugar.error) return { error: lugar.error };

  const supabase = await createClient();
  const { error } = await supabase.from("empresa").upsert({
    id: true,
    nombre_legal: texto(formData, "nombre_legal"),
    ein,
    direccion: texto(formData, "direccion"),
    ciudad: texto(formData, "ciudad"),
    estado: lugar.estado,
    codigo_postal: lugar.codigo_postal,
    telefono: texto(formData, "telefono"),
    actualizado_en: new Date().toISOString(),
  });
  if (error) return { error: "No se pudo guardar. Revisá la conexión y probá de nuevo." };

  revalidatePath("/subs/reporte-1099");
  return { error: null, listo: Date.now() };
}
