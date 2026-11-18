import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { FormularioAsignacion } from "./formulario-asignacion";

// Sumar un sub al proyecto: por día (con su tarifa) o por contrato (tarea y monto).
export default async function NuevaAsignacionPage({ params, searchParams }: PageProps<"/proyectos/[id]/mano-de-obra/nueva">) {
  const { id } = await params;
  const { modalidad } = await searchParams;
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();
  const [{ data: proyecto }, { data: subs }, { data: privados }] = await Promise.all([
    supabase.from("proyectos").select("id, nombre").eq("id", id).maybeSingle(),
    supabase.from("subcontratistas").select("id, nombre, oficio").eq("activo", true).order("nombre"),
    supabase.from("subcontratistas_privado").select("subcontratista_id, tarifa_diaria"),
  ]);
  if (!proyecto) notFound();

  const tarifas = Object.fromEntries((privados ?? []).map((p) => [p.subcontratista_id, p.tarifa_diaria]));
  const opciones = (subs ?? []).map((s) => ({
    id: s.id as string,
    nombre: s.nombre as string,
    oficio: s.oficio as string | null,
    tarifa: tarifas[s.id] != null ? Number(tarifas[s.id]) : null,
  }));

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}/mano-de-obra`} volverTexto="Mano de obra" titulo="Agregar sub" subtitulo={proyecto.nombre} />
      {opciones.length === 0 ? (
        <div className="m-4 rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Todavía no hay subcontratistas cargados.</p>
          <Link href="/subs/nuevo" className="mt-2 inline-block font-semibold text-obra">
            + Agregar un subcontratista
          </Link>
        </div>
      ) : (
        <FormularioAsignacion proyectoId={id} subs={opciones} modalidadInicial={modalidad === "contrato" ? "contrato" : "dia"} />
      )}
    </main>
  );
}
