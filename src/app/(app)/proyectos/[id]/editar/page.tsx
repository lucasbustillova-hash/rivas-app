import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Proyecto } from "@/lib/proyectos";
import { FormularioProyecto } from "../../formulario-proyecto";
import { Encabezado } from "@/components/encabezado";

export default async function EditarProyectoPage({ params }: PageProps<"/proyectos/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("proyectos").select("*, clientes(*)").eq("id", id).maybeSingle();
  if (!data) notFound();

  const { clientes, ...proyecto } = data as Proyecto & { clientes: Cliente };

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}`} volverTexto={proyecto.nombre} titulo="Editar proyecto" />
      <FormularioProyecto proyecto={proyecto} cliente={clientes} />
    </main>
  );
}
