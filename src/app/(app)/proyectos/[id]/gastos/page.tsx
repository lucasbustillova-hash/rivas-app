import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { dinero, nombreMetodo } from "@/lib/cobros";
import { nombreCategoria, resumenGanancia } from "@/lib/gastos";
import { formatoFecha } from "@/lib/proyectos";
import { Encabezado } from "@/components/encabezado";
import { BorrarPago } from "@/components/borrar-pago";
import { cargarCobro } from "../pagos/datos";
import { cargarManoDeObra } from "../mano-de-obra/datos";
import { borrarGasto } from "./acciones";
import { cargarGastos } from "./datos";
import { FormularioGasto } from "./formulario-gasto";
import { TarjetaGanancia } from "./tarjeta-ganancia";

// Gastos del proyecto (materiales, herramientas, permisos…) y la ganancia real.
export default async function GastosPage({ params }: PageProps<"/proyectos/[id]/gastos">) {
  const { id } = await params;
  if (!(await esAdmin())) notFound();

  const supabase = await createClient();
  const { data: proyecto } = await supabase.from("proyectos").select("id, nombre").eq("id", id).maybeSingle();
  if (!proyecto) notFound();

  const [gastos, cobro, manoDeObra] = await Promise.all([
    cargarGastos(supabase, id),
    cargarCobro(supabase, id),
    cargarManoDeObra(supabase, id),
  ]);
  const contrato = cobro.contrato ? Number(cobro.contrato.monto_total) : null;
  const cobrado = cobro.resumen?.pagado ?? 0;
  const resumen = resumenGanancia({ contrato, cobrado, manoDeObra: manoDeObra.totales, gastos });

  // Enlaces temporales (10 minutos) para ver los recibos.
  const conRecibo = gastos.filter((g) => g.recibo_ruta);
  const { data: enlacesData } = conRecibo.length
    ? await supabase.storage.from("documentos").createSignedUrls(
        conRecibo.map((g) => g.recibo_ruta!),
        600,
      )
    : { data: [] };
  const enlaces = new Map((enlacesData ?? []).map((e) => [e.path, e.signedUrl]));

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}`} volverTexto={proyecto.nombre} titulo="Gastos y ganancia" />

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Ganancia</h2>
          <TarjetaGanancia
            contrato={contrato}
            cobrado={cobrado}
            pagadoSubs={manoDeObra.totales.pagado}
            resumen={resumen}
            detalle
          />
        </section>

        <FormularioGasto proyectoId={id} />

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between pb-2">
            <h2 className="font-semibold">Gastos</h2>
            {gastos.length > 0 && <span className="text-sm font-semibold tabular-nums">{dinero(resumen.totalGastos)}</span>}
          </div>
          {gastos.length === 0 && <p className="text-sm text-texto-suave">Todavía no anotaron ningún gasto.</p>}
          {gastos.map((g) => {
            const enlace = g.recibo_ruta ? enlaces.get(g.recibo_ruta) : null;
            return (
              <div key={g.id} className="flex items-start justify-between gap-3 border-t border-stone-100 py-2.5 text-sm tabular-nums">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{g.descripcion}</span>
                  <span className="text-xs text-texto-suave">
                    {formatoFecha(g.fecha)} · {nombreCategoria(g.categoria)}
                    {g.lugar && ` · ${g.lugar}`} · {g.metodo === "tarjeta" ? "Tarjeta" : nombreMetodo(g.metodo)}
                  </span>
                  {g.nota && <span className="text-xs text-texto-suave">{g.nota}</span>}
                  {enlace && (
                    <a href={enlace} target="_blank" rel="noreferrer" className="w-fit text-xs font-semibold text-obra">
                      Ver recibo
                    </a>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <strong>{dinero(g.monto)}</strong>
                  <BorrarPago borrar={borrarGasto.bind(null, g.id)} texto={`el gasto de ${dinero(g.monto)}`} />
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
