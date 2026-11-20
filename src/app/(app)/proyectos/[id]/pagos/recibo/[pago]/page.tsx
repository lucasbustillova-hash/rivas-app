import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { AvisoMembrete, DatoPapel, LineaPapel, Membrete, cargarMembrete } from "@/components/membrete";
import { dinero, metodoBilingue, numeroRecibo, saldoAlPago } from "@/lib/cobros";
import { fechaUS } from "@/lib/planilla";
import { BotonImprimir } from "@/components/boton-imprimir";

// Recibo de un pago del cliente, en español e inglés, para imprimir o mandar como PDF.
export default async function ReciboPage({ params }: PageProps<"/proyectos/[id]/pagos/recibo/[pago]">) {
  const { id, pago: pagoId } = await params;
  if (!(await esAdmin())) notFound();

  const supabase = await createClient();
  const [{ data: proyecto }, { data: contrato }, { data: pagos }, empresa] = await Promise.all([
    supabase.from("proyectos").select("id, nombre, direccion_obra, clientes(nombre, direccion)").eq("id", id).maybeSingle(),
    supabase.from("contratos_cliente").select("monto_total").eq("proyecto_id", id).maybeSingle(),
    supabase.from("pagos_cliente").select("id, fecha, creado_en, monto, metodo, nota").eq("proyecto_id", id),
    cargarMembrete(supabase),
  ]);
  const pago = pagos?.find((p) => p.id === pagoId);
  if (!proyecto || !pago) notFound();

  const cliente = proyecto.clientes as unknown as { nombre: string; direccion: string | null } | null;
  const total = contrato ? Number(contrato.monto_total) : null;
  const saldo = total != null ? saldoAlPago(total, pagos ?? [], pagoId) : null;

  return (
    <main className="flex flex-1 flex-col print:block">
      <div className="print:hidden">
        <Encabezado volver={`/proyectos/${id}/pagos`} volverTexto="Pagos del cliente" titulo="Recibo" />
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 print:p-0">
        <article className="overflow-hidden rounded-2xl bg-white text-sm shadow-sm print:rounded-none print:shadow-none">
          <Membrete empresa={empresa} />

          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-titulo text-xl font-bold">Recibo de pago</h1>
                <p className="text-texto-suave">Payment receipt</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-semibold">{numeroRecibo(pago.id)}</p>
                <p className="text-texto-suave">{fechaUS(pago.fecha)}</p>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-stone-200 pt-4">
              <DatoPapel es="Recibido de" en="Received from">
                {cliente?.nombre ?? ""}
              </DatoPapel>
              <DatoPapel es="Obra" en="Project">
                {proyecto.nombre}
                {proyecto.direccion_obra && <span className="block text-texto-suave">{proyecto.direccion_obra}</span>}
              </DatoPapel>
              <DatoPapel es="Forma de pago" en="Payment method">
                {metodoBilingue(pago.metodo)}
                {pago.nota && <span className="block text-texto-suave">{pago.nota}</span>}
              </DatoPapel>
            </dl>

            <div className="flex items-center justify-between rounded-xl bg-stone-100 px-4 py-3 [print-color-adjust:exact]">
              <span>
                <span className="block font-semibold">Monto recibido</span>
                <span className="block text-xs text-texto-suave">Amount received</span>
              </span>
              <strong className="text-2xl tabular-nums">{dinero(Number(pago.monto))}</strong>
            </div>

            {total != null && saldo && (
              <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 tabular-nums">
                <LineaPapel es="Total del contrato" en="Contract total" valor={dinero(total)} />
                <LineaPapel es="Pagado a la fecha" en="Paid to date" valor={dinero(saldo.pagado)} />
                <LineaPapel es="Saldo pendiente" en="Balance due" valor={dinero(saldo.saldo)} fuerte />
              </dl>
            )}

            <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-texto-suave">
              <p className="border-t border-stone-400 pt-1.5">
                Recibido por
                <br />
                Received by
              </p>
              <p className="border-t border-stone-400 pt-1.5">
                Firma del cliente
                <br />
                Client signature
              </p>
            </div>
            <p className="text-center text-xs text-texto-suave">Gracias por su pago · Thank you for your payment</p>
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
