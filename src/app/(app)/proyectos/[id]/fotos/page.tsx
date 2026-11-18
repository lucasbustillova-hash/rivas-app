import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETAPAS, datosEtapa, diaDe, etapaSugerida, tituloDia, type ArchivoProyecto } from "@/lib/fotos";
import { Encabezado } from "../../encabezado";
import { Miniaturas, enlacesMini } from "./miniaturas";
import { SubirArchivos } from "./subir-archivos";

// Fotos y videos del proyecto en línea de tiempo (pantalla 3 de los bocetos).
export default async function FotosPage({ params, searchParams }: PageProps<"/proyectos/[id]/fotos">) {
  const { id } = await params;
  const { etapa } = await searchParams;
  const filtro = typeof etapa === "string" && datosEtapa(etapa) ? etapa : null;

  const supabase = await createClient();
  const { data: proyecto } = await supabase.from("proyectos").select("id, nombre, estado").eq("id", id).maybeSingle();
  if (!proyecto) notFound();

  let consulta = supabase
    .from("archivos_proyecto")
    .select("id, proyecto_id, ruta, tipo, etapa, nota, tomada_en")
    .eq("proyecto_id", id)
    .order("tomada_en", { ascending: false })
    .order("creado_en", { ascending: false });
  if (filtro) consulta = consulta.eq("etapa", filtro);
  const { data, error } = await consulta;
  const archivos = (data ?? []) as ArchivoProyecto[];
  const enlaces = await enlacesMini(supabase, archivos);

  // Agrupados por día, del más nuevo al más viejo.
  const porDia = new Map<string, ArchivoProyecto[]>();
  for (const a of archivos) {
    const dia = diaDe(a.tomada_en);
    porDia.set(dia, [...(porDia.get(dia) ?? []), a]);
  }

  const filtros = [{ valor: null, nombre: "Todas" }, ...ETAPAS.map((e) => ({ valor: e.valor, nombre: e.nombre }))];

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}`} volverTexto={proyecto.nombre} titulo="Fotos y videos" />
      <nav aria-label="Filtrar por etapa" className="flex gap-2 overflow-x-auto bg-tinta px-5 pb-4">
        {filtros.map((f) => {
          const activo = f.valor === filtro;
          return (
            <Link
              key={f.nombre}
              href={f.valor ? `/proyectos/${id}/fotos?etapa=${f.valor}` : `/proyectos/${id}/fotos`}
              aria-current={activo ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                activo ? "bg-white font-semibold text-tinta" : "bg-tinta-suave text-stone-300"
              }`}
            >
              {f.nombre}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 px-4 py-4">
        <SubirArchivos proyectoId={id} etapaInicial={(filtro as ArchivoProyecto["etapa"]) ?? etapaSugerida(proyecto.estado)} />

        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar las fotos. Revisá la conexión y probá de nuevo.
          </p>
        )}

        {!error && archivos.length === 0 && (
          <p className="rounded-2xl bg-white p-5 text-texto-suave shadow-sm">
            {filtro
              ? `No hay fotos de "${datosEtapa(filtro)?.nombre.toLowerCase()}".`
              : "Todavía no hay fotos. Tocá \"Agregar fotos o videos\" para tomar o elegir."}
          </p>
        )}

        {[...porDia.entries()].map(([dia, lista]) => (
          <section key={dia} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-texto-suave">
              {tituloDia(dia)} · {lista.length}
            </h2>
            <Miniaturas archivos={lista} enlaces={enlaces} />
          </section>
        ))}
      </div>
    </main>
  );
}
