import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { AvisoMembrete, DatoPapel, LineaPapel, Membrete, TituloPapel, cargarMembrete } from "@/components/membrete";
import { BotonImprimir } from "@/components/boton-imprimir";
import { dinero, metodoBilingue } from "@/lib/cobros";
import { enOrden } from "@/lib/mano-de-obra";
import { fechaUS } from "@/lib/planilla";
import { cargarCobro } from "../datos";

const ESTADO = {
  pagada: { texto: "Pagada / Paid", clase: "bg-green-100 text-green-800" },
  parcial: { texto: "Parcial / Partial", clase: "bg-amber-100 text-amber-800" },
  pendiente: { texto: "Pendiente / Pending", clase: "bg-stone-200 text-stone-700" },
};

// Estado de cuenta del cliente (en español e inglés): contrato, cuotas, pagos y saldo. Para imprimir o mandar como PDF.
export default async function CuentaClientePage({ params }: PageProps<"/proyectos/[id]/pagos/cuenta">) {
  const { id } = await params;
  if (!(await esAdmin())) notFound();

  const supabase = await createClient();
  const [{ data: proyecto }, cobro, empresa] = await Promise.all([
    supabase.from("proyectos").select("id, nombre, direccion_obra, clientes(nombre)").eq("id", id).maybeSingle(),
    cargarCobro(supabase, id),
    cargarMembrete(supabase),
  ]);
  if (!proyecto) notFound();
  if (!cobro.contrato || !cobro.resumen) redirect(`/proyectos/${id}/pagos/contrato`);

  const cliente = proyecto.clientes as unknown as { nombre: string } | null;
  const r = cobro.resumen;
  const pagos = enOrden(cobro.pagos);
  const hoy = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" }).format(new Date());

  return (
    <main className="flex flex-1 flex-col print:block">
      <div className="print:hidden">
        <Encabezado volver={`/proyectos/${id}/pagos`} volverTexto="Pagos del cliente" titulo="Estado de cuenta" />
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
              <DatoPapel es="Cliente" en="Client">
                {cliente?.nombre ?? ""}
              </DatoPapel>
              <DatoPapel es="Obra" en="Project">
                {proyecto.nombre}
                {proyecto.direccion_obra && <span className="block text-texto-suave">{proyecto.direccion_obra}</span>}
              </DatoPapel>
            </dl>

            <section>
              <TituloPapel es="Plan de pagos" en="Payment schedule" />
              <table className="w-full tabular-nums">
                <tbody>
                  {r.estados.map((c) => (
                    <tr key={c.id} className="border-b border-stone-100">
                      <td className="py-1.5 pr-2">{c.descripcion}</td>
                      <td className="py-1.5 pr-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap [print-color-adjust:exact] ${ESTADO[c.estado].clase}`}>
                          {ESTADO[c.estado].texto}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">{dinero(c.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <TituloPapel es="Pagos recibidos" en="Payments received" />
              {pagos.length === 0 && <p className="py-2 text-texto-suave">Todavía no hay pagos. · No payments yet.</p>}
              <table className="w-full tabular-nums">
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="py-1.5 pr-2">{fechaUS(p.fecha)}</td>
                      <td className="py-1.5 pr-2 text-texto-suave">{metodoBilingue(p.metodo)}</td>
                      <td className="py-1.5 text-right">{dinero(Number(p.monto))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-stone-200 pt-3 tabular-nums">
              <LineaPapel es="Total del contrato" en="Contract total" valor={dinero(r.total)} />
              <LineaPapel es="Total pagado" en="Total paid" valor={dinero(r.pagado)} />
              {r.deMas > 0 ? (
                <LineaPapel es="Pagado de más" en="Overpaid" valor={dinero(r.deMas)} fuerte />
              ) : (
                <LineaPapel es="Saldo pendiente" en="Balance due" valor={dinero(r.falta)} fuerte />
              )}
            </dl>

            {r.proxima && (
              <div className="flex items-center justify-between rounded-xl bg-stone-100 px-4 py-3 [print-color-adjust:exact]">
                <span>
                  <span className="block font-semibold">Próximo pago: {r.proxima.descripcion}</span>
                  <span className="block text-xs text-texto-suave">Next payment</span>
                </span>
                <strong className="text-lg tabular-nums">
                  {dinero(Math.round((r.proxima.monto - r.proxima.cubierto) * 100) / 100)}
                </strong>
              </div>
            )}

            <p className="text-center text-xs text-texto-suave">
              Formas de pago: efectivo, Zelle o cheque · Payment methods: cash, Zelle or check
              <br />
              Gracias · Thank you
            </p>
          </div>
        </article>

        <AvisoMembrete empresa={empresa} />
        <BotonImprimir />
        <p className="text-center text-xs text-texto-suave print:hidden">
          En el iPhone: tocá el botón y después el ícono de compartir para mandarlo por WhatsApp, mensaje o correo como PDF.
        </p>
      </div>
    </main>
  );
}
