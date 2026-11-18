import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "../../../encabezado";
import { cargarCobro } from "../datos";
import { FormularioContrato } from "../formulario-contrato";

// Cargar o cambiar el monto del contrato y el plan de pagos.
export default async function ContratoPage({ params }: PageProps<"/proyectos/[id]/pagos/contrato">) {
  const { id } = await params;
  if (!(await esAdmin())) notFound();

  const supabase = await createClient();
  const { data: proyecto } = await supabase.from("proyectos").select("id, nombre").eq("id", id).maybeSingle();
  if (!proyecto) notFound();
  const { contrato, cuotas } = await cargarCobro(supabase, id);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado
        volver={contrato ? `/proyectos/${id}/pagos` : `/proyectos/${id}`}
        volverTexto={contrato ? "Pagos del cliente" : proyecto.nombre}
        titulo="Contrato"
        subtitulo="Monto total y plan de pagos. Sin sales tax."
      />
      <FormularioContrato
        proyectoId={id}
        total={contrato ? Number(contrato.monto_total) : null}
        plan={contrato?.plan ?? "50_50"}
        cuotas={cuotas}
      />
    </main>
  );
}
