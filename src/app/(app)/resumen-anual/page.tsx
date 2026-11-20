import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { dinero } from "@/lib/cobros";
import { anioActual } from "@/lib/subs";
import { cargarResumenAnual } from "./datos";
import { ExportarResumen } from "./exportar-resumen";

// Resumen del año para el contador: lo cobrado, lo pagado a subs y los gastos, por proyecto.
export default async function ResumenAnualPage({ searchParams }: PageProps<"/resumen-anual">) {
  if (!(await esAdmin())) notFound();
  const actual = anioActual();
  const { anio: anioTexto } = await searchParams;
  const pedido = Number(anioTexto);
  const anio = Number.isInteger(pedido) && pedido >= 2020 && pedido <= actual ? pedido : actual;
  const anios = [actual, actual - 1, actual - 2];

  const supabase = await createClient();
  const r = await cargarResumenAnual(supabase, anio);
  const { totales } = r;
  const hayMovimientos = r.porProyecto.length > 0;

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/" volverTexto="Proyectos" titulo="Resumen del año" subtitulo={`Lo que entró y salió en ${anio}`} />
      <nav aria-label="Elegir el año" className="franja flex gap-2 px-5 pb-4">
        {anios.map((a) => (
          <Link
            key={a}
            href={a === actual ? "/resumen-anual" : `/resumen-anual?anio=${a}`}
            aria-current={a === anio ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm tabular-nums ${
              a === anio ? "bg-white font-semibold text-tinta" : "bg-tinta-suave text-stone-300"
            }`}
          >
            {a}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-4 py-4">
        <section className="grid grid-cols-2 gap-2 tabular-nums">
          <Cifra nombre="Cobrado a clientes" valor={dinero(totales.cobrado)} />
          <Cifra nombre="Pagado a subs" valor={dinero(totales.subs)} resta />
          <Cifra nombre="Gastos" valor={dinero(totales.gastos)} resta />
          <Cifra
            nombre="Quedó"
            valor={dinero(totales.neto)}
            clase={totales.neto < 0 ? "text-red-700" : "text-green-800"}
            destacada
          />
        </section>

        <p className="rounded-xl bg-indigo-50 p-3.5 text-sm text-indigo-900">
          Se cuenta por la <strong>fecha de cada pago</strong>, como lo ve el banco. Por eso no es lo mismo que la ganancia
          de cada obra: si una obra se cobró en diciembre y se pagó en enero, cae en dos años.
        </p>

        {!hayMovimientos && (
          <p className="rounded-2xl bg-white p-4 text-sm text-texto-suave shadow-sm">No hay pagos ni gastos cargados en {anio}.</p>
        )}

        {hayMovimientos && (
          <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="pb-1 font-semibold">Por proyecto</h2>
            {r.porProyecto.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="flex flex-col gap-1 border-t border-stone-100 py-2.5 text-sm tabular-nums active:bg-stone-50"
              >
                <span className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.nombre}</span>
                    {p.cliente && <span className="block truncate text-xs text-texto-suave">{p.cliente}</span>}
                  </span>
                  <strong className={`shrink-0 ${p.neto < 0 ? "text-red-700" : ""}`}>{dinero(p.neto)}</strong>
                </span>
                <span className="flex flex-wrap gap-x-3 text-xs text-texto-suave">
                  <span>Cobrado {dinero(p.cobrado)}</span>
                  {p.subs > 0 && <span>Subs −{dinero(p.subs)}</span>}
                  {p.gastos > 0 && <span>Gastos −{dinero(p.gastos)}</span>}
                </span>
              </Link>
            ))}
          </section>
        )}

        {(r.cobradoPorMetodo.length > 0 || r.gastosPorCategoria.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {r.cobradoPorMetodo.length > 0 && (
              <Lista titulo="Cobrado, por forma de pago" filas={r.cobradoPorMetodo} />
            )}
            {r.gastosPorCategoria.length > 0 && <Lista titulo="Gastos, por tipo" filas={r.gastosPorCategoria} />}
          </div>
        )}

        {hayMovimientos && (
          <ExportarResumen
            anio={anio}
            porProyecto={r.porProyecto}
            totales={totales}
            cobros={r.cobros}
            pagosSubs={r.pagosSubs}
            gastos={r.gastos}
          />
        )}

        <p className="text-xs text-texto-suave">
          Para las 1099 de los subs está el{" "}
          <Link href={`/subs/reporte-1099${anio === actual ? "" : `?anio=${anio}`}`} className="font-semibold text-obra">
            Reporte 1099
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function Cifra({
  nombre,
  valor,
  resta = false,
  destacada = false,
  clase = "",
}: {
  nombre: string;
  valor: string;
  resta?: boolean;
  destacada?: boolean;
  clase?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl p-3.5 shadow-sm ${destacada ? "bg-white ring-2 ring-stone-200" : "bg-white"}`}>
      <span className="text-xs text-texto-suave">{nombre}</span>
      <span className={`text-lg font-bold ${clase}`}>
        {resta && valor !== "$0" ? "−" : ""}
        {valor}
      </span>
    </div>
  );
}

function Lista({ titulo, filas }: { titulo: string; filas: { valor: string; nombre: string; total: number }[] }) {
  return (
    <section className="flex flex-col rounded-2xl bg-white p-4 text-sm shadow-sm tabular-nums">
      <h2 className="pb-1 font-semibold">{titulo}</h2>
      {filas.map((f) => (
        <div key={f.valor} className="flex justify-between gap-3 border-t border-stone-100 py-2">
          <span>{f.nombre}</span>
          <span>{dinero(f.total)}</span>
        </div>
      ))}
    </section>
  );
}
