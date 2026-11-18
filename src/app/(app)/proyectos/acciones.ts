"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getVerifiedUser } from "@/lib/supabase/server";
import { datosEstado } from "@/lib/proyectos";

export type EstadoFormulario = { error: string | null };

function texto(formData: FormData, campo: string) {
  const v = formData.get(campo);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Crea o actualiza un proyecto con los datos de su cliente.
// Si viene "id" es una edición; si no, un proyecto nuevo.
export async function guardarProyecto(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { user } = await getVerifiedUser();
  if (!user) return { error: "Tu sesión se cerró. Volvé a entrar." };

  const id = texto(formData, "id");
  const clienteElegido = texto(formData, "cliente_id") ?? "nuevo";

  const cliente = {
    nombre: texto(formData, "cliente_nombre"),
    telefono: texto(formData, "cliente_telefono"),
    correo: texto(formData, "cliente_correo"),
    direccion: texto(formData, "cliente_direccion"),
    notas: texto(formData, "cliente_notas"),
  };

  const proyecto = {
    nombre: texto(formData, "nombre"),
    tipo_trabajo: texto(formData, "tipo_trabajo"),
    alcance: texto(formData, "alcance"),
    direccion_obra: texto(formData, "direccion_obra"),
    fecha_inicio: texto(formData, "fecha_inicio"),
    fecha_fin_estimada: texto(formData, "fecha_fin_estimada"),
    estado: texto(formData, "estado") ?? "estimado",
    notas: texto(formData, "notas"),
  };

  if (!proyecto.nombre) return { error: "Falta el nombre del proyecto." };
  if (!proyecto.tipo_trabajo) return { error: "Falta el tipo de trabajo." };
  if (!datosEstado(proyecto.estado)) return { error: "El estado no es válido." };
  if (proyecto.fecha_inicio && proyecto.fecha_fin_estimada && proyecto.fecha_fin_estimada < proyecto.fecha_inicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  }
  const editaCliente = id || clienteElegido === "nuevo";
  if (editaCliente && !cliente.nombre) return { error: "Falta el nombre del cliente." };

  const supabase = await createClient();
  const fallo = { error: "No se pudo guardar. Revisá la conexión y probá de nuevo." };

  // Edición: actualiza el proyecto y los datos de su cliente.
  if (id) {
    const { data: actual } = await supabase.from("proyectos").select("cliente_id").eq("id", id).single();
    if (!actual) return { error: "No se encontró el proyecto." };

    const { error: e1 } = await supabase.from("clientes").update(cliente).eq("id", actual.cliente_id);
    if (e1) return fallo;
    const { error: e2 } = await supabase.from("proyectos").update(proyecto).eq("id", id);
    if (e2) return fallo;

    revalidatePath("/");
    redirect(`/proyectos/${id}`);
  }

  // Proyecto nuevo: con un cliente existente o uno nuevo.
  let clienteId = clienteElegido;
  let clienteNuevo = false;
  if (clienteElegido === "nuevo") {
    const { data, error } = await supabase.from("clientes").insert(cliente).select("id").single();
    if (error || !data) return fallo;
    clienteId = data.id;
    clienteNuevo = true;
  }

  const { data: creado, error } = await supabase
    .from("proyectos")
    .insert({ ...proyecto, cliente_id: clienteId })
    .select("id")
    .single();
  if (error || !creado) {
    // No dejar un cliente suelto si el proyecto no se pudo crear.
    if (clienteNuevo) await supabase.from("clientes").delete().eq("id", clienteId);
    return fallo;
  }

  revalidatePath("/");
  redirect(`/proyectos/${creado.id}`);
}
