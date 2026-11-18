import { createClient } from "@/lib/supabase/server";
import { FormularioProyecto } from "../formulario-proyecto";
import { Encabezado } from "../encabezado";

export default async function NuevoProyectoPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase.from("clientes").select("id, nombre").order("nombre");

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/" volverTexto="Proyectos" titulo="Nuevo proyecto" />
      <FormularioProyecto clientes={clientes ?? []} />
    </main>
  );
}
