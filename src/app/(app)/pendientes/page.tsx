import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { dinero } from "@/lib/cobros";
import { datosEstado } from "@/lib/proyectos";
import { cargarPendientes } from "./datos";

// Cuentas pendientes de todas las obras: a quién le debemos y quién nos debe.
export default async function PendientesPage() {
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();
  const { subs, clientes, debemos, nosDeben } = await cargarPendientes(supabase);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/" volverTexto="Proyectos" titulo="Cuentas pendientes" subtitulo="Todas las obras juntas" />

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="grid grid-cols-2 gap-2 tabular-nums">
          <a href="#subs" className="flex flex-col gap-0.5 rounded-2xl bg-white p-3.5 shadow-sm active:bg-stone-50">
            <span className="text-xs text-texto-suave">Debemos a subs</span>
            <span className={`text-lg font-bold ${debemos > 0 ? "text-orange-700" : "text-green-800"}`}>{dinero(debemos)}</span>
          </a>
          <a href="#clientes" className="flex flex-col gap-0.5 rounded-2xl bg-white p-3.5 shadow-sm active:bg-stone-50">
            <span className="text-xs text-texto-suave">Nos deben clientes</span>
            <span className="text-lg font-bold">{dinero(nosDeben)}</span>
          </a>
        </section>

        <section id="subs" className="flex scroll-mt-4 flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">A quién le debemos</h2>
          <p className="pb-1 text-xs text-texto-suave">
            Por día: días trabajados × tarifa, menos lo pagado. Por contrato: lo que falta pagar del contrato.
          </p>
          {subs.length === 0 && <p className="border-t border-stone-100 pt-2 text-sm text-green-800">Estamos al día con todos los subs.</p>}
          {subs.map((s) => (
            <div key={s.id} className="flex flex-col gap-1 border-t border-stone-100 py-2.5 text-sm tabular-nums">
              <Link href={`/subs/${s.id}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{s.nombre}</span>
                <strong className={`shrink-0 ${s.total < 0 ? "text-texto-suave" : ""}`}>
                  {s.total < 0 ? `Se le pagó de más ${dinero(-s.total)}` : dinero(s.total)}
                </strong>
              </Link>
              {s.obras.map((o) => (
                <Link
                  key={o.asignacionId}
                  href={`/proyectos/${o.proyectoId}/mano-de-obra/${o.asignacionId}`}
                  className="flex justify-between gap-3 rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs active:bg-stone-100"
                >
                  <span className="min-w-0 truncate">
                    {o.proyecto} · {o.modalidad === "dia" ? "por día" : "contrato"}
                  </span>
                  <span className="shrink-0">
                    {o.debe < 0 ? `pagado de más ${dinero(-o.debe)}` : dinero(o.debe)}
                    <span aria-hidden="true" className="pl-1.5 text-obra">
                      ›
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </section>

        <section id="clientes" className="flex scroll-mt-4 flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Quién nos debe</h2>
          <p className="pb-1 text-xs text-texto-suave">Lo que le falta pagar a cada cliente del contrato. No cuenta las obras estimadas.</p>
          {clientes.length === 0 && <p className="border-t border-stone-100 pt-2 text-sm text-green-800">Ningún cliente debe nada.</p>}
          {clientes.map((c) => {
            const e = datosEstado(c.estado);
            return (
              <Link
                key={c.proyectoId}
                href={`/proyectos/${c.proyectoId}/pagos`}
                className="flex flex-col gap-1 border-t border-stone-100 py-2.5 text-sm tabular-nums active:bg-stone-50"
              >
                <span className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.cliente || c.proyecto}</span>
                    <span className="block truncate text-xs text-texto-suave">{c.proyecto}</span>
                  </span>
                  <strong className="shrink-0">{dinero(c.falta)}</strong>
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${e?.chip}`}>{e?.nombre}</span>
                  <span>
                    Pagó {dinero(c.pagado)} de {dinero(c.total)}
                  </span>
                  {c.proxima && (
                    <span>
                      · Próximo: {c.proxima.descripcion} ({dinero(c.proxima.falta)})
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
