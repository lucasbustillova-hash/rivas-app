import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { BorrarPago } from "@/components/borrar-pago";
import { FormularioPago } from "@/components/formulario-pago";
import { dinero, nombreMetodo } from "@/lib/cobros";
import { formatoFecha } from "@/lib/proyectos";
import { resumenAsignacion, textoDias, type Asignacion, type DiaTrabajado, type PagoSub } from "@/lib/mano-de-obra";
import { borrarDia, borrarPagoSub, registrarPagoSub } from "../acciones";
import { CalendarioDias } from "../calendario-dias";
import { CambiarTarifa } from "./cambiar-tarifa";

// Un sub por día en el proyecto: marcar días, ver cuánto se le debe y anotar pagos (pantalla 7 de los bocetos).
export default async function AsignacionPage({ params }: PageProps<"/proyectos/[id]/mano-de-obra/[asignacion]">) {
  const { id, asignacion: asignacionId } = await params;
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();

  const [{ data: a }, { data: diasData }, { data: pagosData }] = await Promise.all([
    supabase
      .from("asignaciones")
      .select("id, proyecto_id, subcontratista_id, modalidad, tarifa_diaria, monto_contrato, descripcion, subcontratistas(nombre, oficio), proyectos(nombre)")
      .eq("id", asignacionId)
      .eq("proyecto_id", id)
      .maybeSingle(),
    supabase.from("dias_trabajados").select("id, fecha, fraccion, tarifa").eq("asignacion_id", asignacionId).order("fecha", { ascending: false }),
    supabase
      .from("pagos_sub")
      .select("id, fecha, monto, metodo, es_adelanto, nota")
      .eq("asignacion_id", asignacionId)
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false }),
  ]);
  if (!a) notFound();

  const asignacion = a as unknown as Asignacion & {
    subcontratistas: { nombre: string; oficio: string | null };
    proyectos: { nombre: string };
  };
  const dias = (diasData ?? []) as DiaTrabajado[];
  const pagos = (pagosData ?? []) as PagoSub[];
  const resumen = resumenAsignacion(asignacion, dias, pagos);
  const tarifa = Number(asignacion.tarifa_diaria ?? 0);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado
        volver={`/proyectos/${id}/mano-de-obra`}
        volverTexto="Mano de obra"
        titulo={asignacion.subcontratistas.nombre}
        subtitulo={[asignacion.descripcion || asignacion.subcontratistas.oficio, asignacion.proyectos.nombre].filter(Boolean).join(" · ")}
      />

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-center shadow-sm tabular-nums">
          <Cifra nombre={textoDias(resumen.dias)} valor={dinero(resumen.ganado)} />
          <Cifra nombre="Pagado" valor={dinero(resumen.pagado)} />
          <Cifra
            nombre={resumen.debe < 0 ? "Adelantado" : "Se le debe"}
            valor={dinero(Math.abs(resumen.debe))}
            clase={resumen.debe > 0 ? "text-orange-700" : "text-green-800"}
          />
        </section>

        <CambiarTarifa asignacionId={asignacion.id} tarifa={tarifa} />

        <CalendarioDias
          asignacionId={asignacion.id}
          tarifa={tarifa}
          registrados={dias.map((d) => ({ fecha: d.fecha, fraccion: Number(d.fraccion) }))}
        />

        <FormularioPago
          guardar={registrarPagoSub.bind(null, asignacion.id)}
          sugerido={resumen.debe > 0 ? resumen.debe : null}
          boton={resumen.debe > 0 ? `Pagarle ${dinero(resumen.debe)}` : "+ Anotar pago"}
          titulo="Pago al sub"
        />

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="pb-2 font-semibold">Pagos</h2>
          {pagos.length === 0 && <p className="text-sm text-texto-suave">Todavía no se le pagó nada en este proyecto.</p>}
          {pagos.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 border-t border-stone-100 py-2.5 text-sm tabular-nums">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {formatoFecha(p.fecha)} · {nombreMetodo(p.metodo)}
                </span>
                {p.nota && <span className="text-xs text-texto-suave">{p.nota}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <strong>{dinero(Number(p.monto))}</strong>
                <BorrarPago borrar={borrarPagoSub.bind(null, p.id)} texto={`el pago de ${dinero(Number(p.monto))}`} />
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="pb-2 font-semibold">Días cargados</h2>
          {dias.length === 0 && <p className="text-sm text-texto-suave">Marcá los días en el calendario de arriba.</p>}
          {dias.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 border-t border-stone-100 py-2 text-sm tabular-nums">
              <span className="flex flex-col">
                <span className="font-medium">{formatoFecha(d.fecha)}</span>
                <span className="text-xs text-texto-suave">
                  {Number(d.fraccion) === 1 ? "Día completo" : "Medio día"} · {dinero(Number(d.tarifa))}/día
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <strong>{dinero(Math.round(Number(d.fraccion) * Number(d.tarifa) * 100) / 100)}</strong>
                <BorrarPago borrar={borrarDia.bind(null, d.id)} texto={`el día ${formatoFecha(d.fecha)}`} />
              </span>
            </div>
          ))}
        </section>

        <Link href={`/subs/${asignacion.subcontratista_id}`} className="text-center text-sm font-semibold text-obra">
          Ver ficha de {asignacion.subcontratistas.nombre} ›
        </Link>
      </div>
    </main>
  );
}

function Cifra({ nombre, valor, clase = "" }: { nombre: string; valor: string; clase?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-lg font-bold ${clase}`}>{valor}</span>
      <span className="text-xs text-texto-suave">{nombre}</span>
    </div>
  );
}
