"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getVerifiedUser } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { tinCompleto } from "@/lib/subs";

export type EstadoFormulario = { error: string | null };

function texto(formData: FormData, campo: string) {
  const v = formData.get(campo);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const fallo = { error: "No se pudo guardar. Revisá la conexión y probá de nuevo." };

// Crea o actualiza un subcontratista. Los datos de impuestos y la tarifa solo
// se guardan si quien guarda es administrador.
export async function guardarSub(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { user } = await getVerifiedUser();
  if (!user) return { error: "Tu sesión se cerró. Volvé a entrar." };

  const id = texto(formData, "id");
  const sub = {
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    correo: texto(formData, "correo"),
    direccion: texto(formData, "direccion"),
    oficio: texto(formData, "oficio"),
    notas: texto(formData, "notas"),
    activo: formData.get("activo") !== "no",
  };
  if (!sub.nombre) return { error: "Falta el nombre." };

  const admin = await esAdmin();
  const tarifaTxt = texto(formData, "tarifa_diaria");
  const tarifa = tarifaTxt === null ? null : Number(tarifaTxt.replace(/[$,]/g, ""));
  const tinTipo = formData.get("tin_tipo") === "ein" ? "ein" : "ssn";
  const tin = texto(formData, "tin")?.replace(/\D/g, "") ?? null;

  if (admin) {
    if (tarifa !== null && (!Number.isFinite(tarifa) || tarifa < 0)) return { error: "La tarifa diaria no es válida." };
    if (tin !== null && tin.length !== 9) return { error: "El SSN o EIN tiene que tener 9 dígitos." };
  }

  const supabase = await createClient();

  let subId = id;
  if (id) {
    const { error } = await supabase.from("subcontratistas").update(sub).eq("id", id);
    if (error) return fallo;
  } else {
    const { data, error } = await supabase.from("subcontratistas").insert(sub).select("id").single();
    if (error || !data) return fallo;
    subId = data.id;
  }

  if (admin && subId) {
    const privado = {
      nombre_legal: texto(formData, "nombre_legal"),
      tipo: formData.get("tipo") === "llc" ? "llc" : "persona",
      tarifa_diaria: tarifa,
    };
    const { data: existe } = await supabase
      .from("subcontratistas_privado")
      .select("subcontratista_id")
      .eq("subcontratista_id", subId)
      .maybeSingle();
    const { error } = existe
      ? await supabase.from("subcontratistas_privado").update(privado).eq("subcontratista_id", subId)
      : await supabase.from("subcontratistas_privado").insert({ ...privado, subcontratista_id: subId });
    if (error) return fallo;

    if (tin) {
      const { error: e } = await supabase.rpc("guardar_tin", { p_sub: subId, p_tipo: tinTipo, p_tin: tin });
      if (e) return { error: "Se guardó el sub, pero no el SSN/EIN. Probá de nuevo." };
    }
  }

  revalidatePath("/subs");
  redirect(`/subs/${subId}`);
}

// Devuelve el SSN/EIN completo para el botón "Mostrar" (solo administradores).
export async function verTin(subId: string): Promise<{ tin: string | null; error: string | null }> {
  const supabase = await createClient();
  const [{ data, error }, { data: privado }] = await Promise.all([
    supabase.rpc("ver_tin", { p_sub: subId }),
    supabase.from("subcontratistas_privado").select("tin_tipo").eq("subcontratista_id", subId).maybeSingle(),
  ]);
  if (error || typeof data !== "string") return { tin: null, error: "No se pudo mostrar." };
  return { tin: tinCompleto(privado?.tin_tipo ?? "ssn", data), error: null };
}

// Anota el W-9 recién subido a la carpeta privada "documentos".
export async function marcarW9(subId: string, ruta: string): Promise<{ error: string | null }> {
  if (!ruta.startsWith(`w9/${subId}/`)) return { error: "Archivo no válido." };
  const supabase = await createClient();
  const { data: existe } = await supabase
    .from("subcontratistas_privado")
    .select("subcontratista_id")
    .eq("subcontratista_id", subId)
    .maybeSingle();
  const datos = { w9_firmado: true, w9_ruta: ruta };
  const { error } = existe
    ? await supabase.from("subcontratistas_privado").update(datos).eq("subcontratista_id", subId)
    : await supabase.from("subcontratistas_privado").insert({ ...datos, subcontratista_id: subId });
  if (error) return { error: "No se pudo guardar el W-9." };
  revalidatePath(`/subs/${subId}`);
  return { error: null };
}
