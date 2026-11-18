import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { cargarManoDeObra } from "./datos";
import { TablaManoDeObra } from "./tabla";

// Mano de obra del proyecto: subs por día (y por contrato), con lo que se les debe.
export default async function ManoDeObraPage({ params }: PageProps<"/proyectos/[id]/mano-de-obra">) {
  const { id } = await params;
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();
  const { data: proyecto } = await supabase.from("proyectos").select("id, nombre").eq("id", id).maybeSingle();
  if (!proyecto) notFound();
  const { filas, totales } = await cargarManoDeObra(supabase, id);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}`} volverTexto={proyecto.nombre} titulo="Mano de obra" />
      <div className="flex flex-col gap-3 px-4 py-4">
        <Link
          href={`/proyectos/${id}/mano-de-obra/nueva`}
          className="flex h-12 items-center justify-center rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro"
        >
          + Agregar días de un sub
        </Link>
        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="pb-2 font-semibold">Subs en este proyecto</h2>
          <TablaManoDeObra filas={filas} totales={totales} />
        </section>
      </div>
    </main>
  );
}
