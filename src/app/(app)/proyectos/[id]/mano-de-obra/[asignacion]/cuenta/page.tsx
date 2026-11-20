import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { AvisoMembrete, DatoPapel, LineaPapel, Membrete, TituloPapel, cargarMembrete } from "@/components/membrete";
import { BotonImprimir } from "@/components/boton-imprimir";
import { dinero, metodoBilingue } from "@/lib/cobros";
import { fechaUS } from "@/lib/planilla";
import { enOrden, fraccionBilingue, resumenAsignacion, textoDias, type Asignacion } from "@/lib/mano-de-obra";

// Estado de cuenta de un sub en una obra (en español e inglés): días o contrato, pagos y saldo.
// Para imprimir o mandar como PDF. No trae SSN/EIN ni nada de impuestos.
export default async function EstadoDeCuentaPage({ params }: PageProps<"/proyectos/[id]/mano-de-obra/[asignacion]/cuenta">) {
  const { id, asignacion: asignacionId } = await params;
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();

  const [{ data: a }, { data: diasData }, { data: pagosData }, empresa] = await Promise.all([
    supabase
      .from("asignaciones")
      .select("id, modalidad, tarifa_diaria, monto_contrato, descripcion, subcontratistas(nombre, oficio), proyectos(nombre, direccion_obra)")
      .eq("id", asignacionId)
      .eq("proyecto_id", id)
      .maybeSingle(),
    supabase.from("dias_trabajados").select("id, fecha, fraccion, tarifa").eq("asignacion_id", asignacionId),
    supabase.from("pagos_sub").select("id, fecha, creado_en, monto, metodo, es_adelanto, nota").eq("asignacion_id", asignacionId),
    cargarMembrete(supabase),
  ]);
  if (!a) notFound();

  const asignacion = a as unknown as Pick<Asignacion, "id" | "modalidad" | "tarifa_diaria" | "monto_contrato" | "descripcion"> & {
    subcontratistas: { nombre: string; oficio: string | null };
    proyectos: { nombre: string; direccion_obra: string | null };
  };
  const dias = enOrden((diasData ?? []).map((d) => ({ ...d, fraccion: Number(d.fraccion), tarifa: Number(d.tarifa) })));
  const pagos = enOrden((pagosData ?? []).map((p) => ({ ...p, monto: Number(p.monto) })));
  const resumen = resumenAsignacion(asignacion, dias, pagos);
  const porDia = asignacion.modalidad === "dia";
  const hoy = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" }).format(new Date());

  return (
    <main className="flex flex-1 flex-col print:block">
      <div className="print:hidden">
        <Encabezado volver={`/proyectos/${id}/mano-de-obra/${asignacionId}`} volverTexto={asignacion.subcontratistas.nombre} titulo="Estado de cuenta" />
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 print:p-0">
        <article className="overflow-hidden rounded-2xl bg-white text-sm shadow-sm print:rounded-none print:shadow-none">
          <Membrete empresa={empresa} />

          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-titulo text-xl font-bold">Estado de cuenta</h1>
                <p className="text-texto-suave">Account statement</p>
              </div>
              <p className="text-right text-texto-suave tabular-nums">{hoy}</p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-stone-200 pt-4">
              <DatoPapel es="Subcontratista" en="Subcontractor">
                {asignacion.subcontratistas.nombre}
              </DatoPapel>
              <DatoPapel es="Obra" en="Project">
                {asignacion.proyectos.nombre}
                {asignacion.proyectos.direccion_obra && (
                  <span className="block text-texto-suave">{asignacion.proyectos.direccion_obra}</span>
                )}
              </DatoPapel>
              <DatoPapel es="Trabajo" en="Work">
                {[asignacion.descripcion || asignacion.subcontratistas.oficio, porDia ? "Por día / Daily rate" : "Por contrato / Fixed price"]
                  .filter(Boolean)
                  .join(" · ")}
              </DatoPapel>
            </dl>

            {porDia ? (
              <section>
                <TituloPapel es={`Días trabajados (${textoDias(resumen.dias)})`} en="Days worked" />
                {dias.length === 0 && <p className="py-2 text-texto-suave">Todavía no hay días cargados.</p>}
                <table className="w-full tabular-nums">
                  <tbody>
                    {dias.map((d) => (
                      <tr key={d.id} className="border-b border-stone-100">
                        <td className="py-1.5 pr-2">{fechaUS(d.fecha)}</td>
                        <td className="py-1.5 pr-2 text-texto-suave">
                          {fraccionBilingue(d.fraccion)}
                          <span className="block text-xs">× {dinero(d.tarifa)}</span>
                        </td>
                        <td className="py-1.5 text-right">{dinero(Math.round(d.fraccion * d.tarifa * 100) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-stone-100 px-4 py-3 [print-color-adjust:exact]">
                <span>
                  <span className="block font-semibold">Monto del contrato</span>
                  <span className="block text-xs text-texto-suave">Contract amount</span>
                </span>
                <strong className="text-lg tabular-nums">{dinero(resumen.ganado)}</strong>
              </div>
            )}

            <section>
              <TituloPapel es="Pagos" en="Payments" />
              {pagos.length === 0 && <p className="py-2 text-texto-suave">Todavía no se le pagó nada en esta obra.</p>}
              <table className="w-full tabular-nums">
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="py-1.5 pr-2">{fechaUS(p.fecha)}</td>
                      <td className="py-1.5 pr-2 text-texto-suave">
                        {metodoBilingue(p.metodo)}
                        {!porDia && <span className="block text-xs">{p.es_adelanto ? "Adelanto / Advance" : "Pago / Payment"}</span>}
                      </td>
                      <td className="py-1.5 text-right">{dinero(p.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-stone-200 pt-3 tabular-nums">
              <LineaPapel es={porDia ? "Total trabajado" : "Contrato"} en={porDia ? "Total earned" : "Contract"} valor={dinero(resumen.ganado)} />
              <LineaPapel es="Total pagado" en="Total paid" valor={dinero(resumen.pagado)} />
              {resumen.debe < 0 ? (
                <LineaPapel es="Pagado de más" en="Overpaid" valor={dinero(-resumen.debe)} fuerte />
              ) : (
                <LineaPapel es={porDia ? "Saldo a pagar" : "Falta pagar"} en="Balance due" valor={dinero(resumen.debe)} fuerte />
              )}
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-texto-suave">
              <p className="border-t border-stone-400 pt-1.5">
                Por NAHOMY
                <br />
                For NAHOMY
              </p>
              <p className="border-t border-stone-400 pt-1.5">
                Firma del subcontratista
                <br />
                Subcontractor signature
              </p>
            </div>
            <p className="text-center text-xs text-texto-suave">
              Si algo no coincide, avísenos · If anything doesn&apos;t match, please let us know
            </p>
          </div>
        </article>

        <AvisoMembrete empresa={empresa} />
        <BotonImprimir />
        <p className="text-center text-xs text-texto-suave print:hidden">
          En el iPhone: tocá el botón y después el ícono de compartir para mandarlo por WhatsApp, mensaje o correo como PDF. No
          trae SSN ni EIN.
        </p>
      </div>
    </main>
  );
}
