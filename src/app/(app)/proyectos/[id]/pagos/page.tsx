import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { PLANES, dinero, nombreMetodo } from "@/lib/cobros";
import { formatoFecha } from "@/lib/proyectos";
import { Encabezado } from "@/components/encabezado";
import { BarraCobro } from "./barra-cobro";
import { BorrarPago } from "./borrar-pago";
import { cargarCobro } from "./datos";
import { FormularioPago } from "./formulario-pago";

const CHIP = {
  pagada: "bg-green-100 text-green-800",
  parcial: "bg-amber-100 text-amber-800",
  pendiente: "bg-stone-200 text-stone-700",
};

// Pagos del cliente: contrato, plan y cada pago recibido (pantalla 4 de los bocetos).
export default async function PagosPage({ params }: PageProps<"/proyectos/[id]/pagos">) {
  const { id } = await params;
  if (!(await esAdmin())) notFound();

  const supabase = await createClient();
  const { data: proyecto } = await supabase.from("proyectos").select("id, nombre").eq("id", id).maybeSingle();
  if (!proyecto) notFound();

  const { contrato, pagos, resumen } = await cargarCobro(supabase, id);
  if (!contrato || !resumen) redirect(`/proyectos/${id}/pagos/contrato`);
  const plan = PLANES.find((p) => p.valor === contrato.plan);
  const sugerido = resumen.proxima ? Math.round((resumen.proxima.monto - resumen.proxima.cubierto) * 100) / 100 : null;

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/proyectos/${id}`} volverTexto={proyecto.nombre} titulo="Pagos del cliente" />

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <BarraCobro resumen={resumen} />
        </section>

        <FormularioPago proyectoId={id} sugerido={sugerido} />

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between pb-2">
            <h2 className="font-semibold">Plan {plan?.nombre.toLowerCase()}</h2>
            <Link href={`/proyectos/${id}/pagos/contrato`} className="text-sm font-semibold text-obra">
              Editar contrato
            </Link>
          </div>
          {resumen.estados.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border-t border-stone-100 py-2.5 text-sm tabular-nums">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{c.descripcion}</span>
                {c.estado === "parcial" && (
                  <span className="text-xs text-texto-suave">
                    Pagó {dinero(c.cubierto)} · falta {dinero(Math.round((c.monto - c.cubierto) * 100) / 100)}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <strong>{dinero(c.monto)}</strong>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[c.estado]}`}>
                  {c.estado === "pagada" ? "Pagado" : c.estado === "parcial" ? "Parcial" : "Pendiente"}
                </span>
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="pb-2 font-semibold">Pagos recibidos</h2>
          {pagos.length === 0 && <p className="text-sm text-texto-suave">Todavía no anotaron ningún pago.</p>}
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
                <BorrarPago id={p.id} texto={dinero(Number(p.monto))} />
              </span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
