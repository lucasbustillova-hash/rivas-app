import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { datosEstado, formatoFecha, rangoFechas, type Cliente, type Proyecto } from "@/lib/proyectos";
import { etapaSugerida, type ArchivoProyecto } from "@/lib/fotos";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { Miniaturas, enlacesMini } from "./fotos/miniaturas";
import { SubirArchivos } from "./fotos/subir-archivos";
import { BarraCobro } from "./pagos/barra-cobro";
import { cargarCobro } from "./pagos/datos";
import { cargarManoDeObra } from "./mano-de-obra/datos";
import { TablaManoDeObra } from "./mano-de-obra/tabla";

// Ficha del proyecto con los datos del cliente (pantalla 2 de los bocetos).
export default async function ProyectoPage({ params }: PageProps<"/proyectos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("proyectos").select("*, clientes(*)").eq("id", id).maybeSingle();
  if (!data) notFound();

  const proyecto = data as Proyecto & { clientes: Cliente };
  const cliente = proyecto.clientes;
  const estado = datosEstado(proyecto.estado);

  // Las últimas 6 fotos o videos.
  const { data: ultimos, count: cantidad } = await supabase
    .from("archivos_proyecto")
    .select("id, proyecto_id, ruta, tipo, etapa, nota, tomada_en", { count: "exact" })
    .eq("proyecto_id", id)
    .order("tomada_en", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(6);
  const recientes = (ultimos ?? []) as ArchivoProyecto[];
  const enlaces = await enlacesMini(supabase, recientes);

  // Pagos del cliente: solo los administradores.
  const admin = await esAdmin();
  const cobro = admin ? await cargarCobro(supabase, id) : null;
  const manoDeObra = admin ? await cargarManoDeObra(supabase, id) : null;

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado
        volver="/"
        volverTexto="Proyectos"
        titulo={proyecto.nombre}
        subtitulo={`${cliente.nombre} · ${rangoFechas(proyecto.fecha_inicio, proyecto.fecha_fin_estimada)}`}
      >
        <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estado?.chip}`}>{estado?.nombre}</span>
      </Encabezado>

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Trabajo</h2>
          <Dato nombre="Tipo">{proyecto.tipo_trabajo}</Dato>
          <Dato nombre="Inicio">{formatoFecha(proyecto.fecha_inicio)}</Dato>
          <Dato nombre="Fin estimado">{formatoFecha(proyecto.fecha_fin_estimada)}</Dato>
          <Dato nombre="Dirección de la obra">
            {proyecto.direccion_obra && (
              <a href={`https://maps.apple.com/?q=${encodeURIComponent(proyecto.direccion_obra)}`} className="text-obra">
                {proyecto.direccion_obra}
              </a>
            )}
          </Dato>
          <Dato nombre="Alcance">{proyecto.alcance}</Dato>
          <Dato nombre="Notas">{proyecto.notas}</Dato>
        </section>

        {cobro && (
          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Pagos del cliente</h2>
              {cobro.resumen && (
                <Link href={`/proyectos/${proyecto.id}/pagos`} className="text-sm font-semibold text-obra">
                  Ver pagos ›
                </Link>
              )}
            </div>
            {cobro.resumen ? (
              <BarraCobro resumen={cobro.resumen} />
            ) : (
              <Link
                href={`/proyectos/${proyecto.id}/pagos/contrato`}
                className="flex h-12 items-center justify-center rounded-xl border border-borde font-semibold"
              >
                Cargar contrato y plan de pagos
              </Link>
            )}
          </section>
        )}

        {manoDeObra && (
          <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2 pb-2">
              <h2 className="font-semibold">Mano de obra</h2>
              <Link href={`/proyectos/${proyecto.id}/mano-de-obra`} className="text-sm font-semibold text-obra">
                + Agregar sub
              </Link>
            </div>
            <TablaManoDeObra filas={manoDeObra.filas} totales={manoDeObra.totales} />
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Fotos y videos</h2>
            {(cantidad ?? 0) > 0 && (
              <Link href={`/proyectos/${proyecto.id}/fotos`} className="text-sm font-semibold text-obra">
                Ver todas ({cantidad}) ›
              </Link>
            )}
          </div>
          {recientes.length > 0 && <Miniaturas archivos={recientes} enlaces={enlaces} />}
          <SubirArchivos proyectoId={proyecto.id} etapaInicial={etapaSugerida(proyecto.estado)} />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Cliente</h2>
          <Dato nombre="Nombre">{cliente.nombre}</Dato>
          <Dato nombre="Teléfono">
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`} className="text-obra">
                {cliente.telefono}
              </a>
            )}
          </Dato>
          <Dato nombre="Correo">
            {cliente.correo && (
              <a href={`mailto:${cliente.correo}`} className="break-all text-obra">
                {cliente.correo}
              </a>
            )}
          </Dato>
          <Dato nombre="Dirección">{cliente.direccion}</Dato>
          <Dato nombre="Notas">{cliente.notas}</Dato>
        </section>

        <Link
          href={`/proyectos/${proyecto.id}/editar`}
          className="flex h-12 items-center justify-center rounded-xl border border-borde bg-white font-semibold"
        >
          Editar proyecto
        </Link>
      </div>
    </main>
  );
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-texto-suave">{nombre}</span>
      <span className="whitespace-pre-line">{children || <span className="text-stone-400">—</span>}</span>
    </div>
  );
}
