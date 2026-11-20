import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { dinero } from "@/lib/cobros";
import { textoDias } from "@/lib/mano-de-obra";
import { tituloDia } from "@/lib/agenda";
import { cargarPagosSemana } from "./datos";
import { BotonPagado } from "./boton-pagado";

// Pagos de la semana: lo que se le debe a cada sub por días trabajados, de todas las obras, hasta hoy.
export default async function PagosPage() {
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();
  const { subs, total } = await cargarPagosSemana(supabase);

  return (
    <main className="flex flex-1 flex-col">
      <div className="franja flex flex-col gap-0.5 px-5 pt-1 pb-4 text-white">
        <h1 className="font-titulo text-2xl font-bold">Pagos de la semana</h1>
        <span className="text-sm text-stone-300">Subs por día · todo lo trabajado y no pagado hasta hoy</span>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="flex items-baseline justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm tabular-nums">
          <span className="text-sm text-texto-suave">Total a pagar</span>
          <span className={`text-2xl font-bold ${total > 0 ? "text-orange-700" : "text-green-800"}`}>{dinero(total)}</span>
        </section>

        {subs.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-sm text-green-800 shadow-sm">Estamos al día: no hay días trabajados sin pagar.</p>
        )}

        {subs.map((s) => (
          <section key={s.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm tabular-nums">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/subs/${s.id}`} className="min-w-0">
                <span className="block truncate font-semibold">{s.nombre}</span>
                <span className="block text-xs text-texto-suave">
                  {textoDias(s.dias)} · {s.desde === s.hasta ? tituloDia(s.desde) : `${tituloDia(s.desde)} al ${tituloDia(s.hasta)}`}
                </span>
              </Link>
              <strong className="shrink-0 text-lg">{dinero(s.total)}</strong>
            </div>

            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-texto-suave">
                <span className="pr-1.5 transition group-open:rotate-90">›</span>
                Ver días{s.obras.length > 1 ? ` (${s.obras.length} obras)` : ""}
              </summary>
              <div className="flex flex-col gap-2">
                {s.obras.map((o) => (
                  <div key={o.asignacionId} className="flex flex-col rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <Link
                      href={`/proyectos/${o.proyectoId}/mano-de-obra/${o.asignacionId}`}
                      className="flex justify-between gap-3 font-medium"
                    >
                      <span className="min-w-0 truncate">{o.proyecto}</span>
                      <span className="shrink-0">
                        {dinero(o.debe)}
                        <span aria-hidden="true" className="pl-1.5 text-obra">
                          ›
                        </span>
                      </span>
                    </Link>
                    {o.dias.map((d) => (
                      <div key={d.fecha} className="flex justify-between gap-3 text-xs text-texto-suave">
                        <span>
                          {tituloDia(d.fecha)} · {d.fraccion === 0.5 ? "medio día" : "día completo"}
                        </span>
                        <span>{dinero(d.falta)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>

            <BotonPagado subId={s.id} nombre={s.nombre} total={s.total} />
          </section>
        ))}

        <p className="px-1 text-xs text-texto-suave">
          No tiene día fijo: si se paga el viernes y el sábado se trabaja, ese sábado aparece en el pago siguiente. Los subs por
          contrato se pagan desde cada obra.
        </p>
      </div>
    </main>
  );
}
