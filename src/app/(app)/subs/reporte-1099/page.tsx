import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { anioActual, dinero, tinOculto } from "@/lib/subs";
import { cargarReporte1099, type Fila1099 } from "./datos";
import { ExportarContador } from "./exportar-contador";
import { DatosEmpresa } from "./datos-empresa";

// Reporte para las 1099-NEC: a quién hay que hacérsela en el año y qué datos faltan.
export default async function Reporte1099Page({ searchParams }: PageProps<"/subs/reporte-1099">) {
  if (!(await esAdmin())) notFound();
  const actual = anioActual();
  const { anio: anioTexto } = await searchParams;
  const pedido = Number(anioTexto);
  const anio = Number.isInteger(pedido) && pedido >= 2020 && pedido <= actual ? pedido : actual;
  const anios = [actual, actual - 1, actual - 2];

  const supabase = await createClient();
  const { minimo, empresa, detalle, todos, necesitan, debajo } = await cargarReporte1099(supabase, anio);
  const conFaltantes = necesitan.filter((f) => f.faltan.length > 0).length;
  const total = necesitan.reduce((t, f) => t + f.total, 0);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/subs" volverTexto="Subcontratistas" titulo="Reporte 1099" subtitulo={`Pagos a subcontratistas en ${anio}`} />
      <nav aria-label="Elegir el año" className="flex gap-2 bg-tinta px-5 pb-4">
        {anios.map((a) => (
          <Link
            key={a}
            href={a === actual ? "/subs/reporte-1099" : `/subs/reporte-1099?anio=${a}`}
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
        <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-center shadow-sm tabular-nums">
          <Cifra valor={String(necesitan.length)} nombre="Necesitan 1099" />
          <Cifra
            valor={String(conFaltantes)}
            nombre="Con datos faltantes"
            clase={conFaltantes ? "text-orange-700" : "text-green-800"}
          />
          <Cifra valor={dinero(Math.round(total * 100) / 100)} nombre="Total a reportar" />
        </section>

        <p className="rounded-xl bg-indigo-50 p-3.5 text-sm text-indigo-900">
          Les corresponde <strong>1099-NEC</strong> a los subs a los que se les pagó {dinero(minimo)} o más en {anio}.
          {anio === actual && (
            <>
              {" "}
              Hay que entregarlas <strong>antes del 31 de enero de {anio + 1}</strong>, al sub y al IRS.
            </>
          )}
        </p>

        <DatosEmpresa empresa={empresa} />

        <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="pb-2 font-semibold">Necesitan 1099-NEC</h2>
          {necesitan.length === 0 && (
            <p className="text-sm text-texto-suave">Nadie llegó a {dinero(minimo)} en {anio}.</p>
          )}
          {necesitan.map((f) => (
            <FilaSub key={f.id} fila={f} />
          ))}
        </section>

        {todos.length > 0 && (
          <ExportarContador anio={anio} minimo={minimo} empresa={empresa} necesitan={necesitan} todos={todos} detalle={detalle} />
        )}

        {debajo.length > 0 && (
          <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold">No llegan a {dinero(minimo)}</h2>
            <p className="pb-2 text-xs text-texto-suave">No necesitan 1099 este año (salvo que les paguen más antes de que termine).</p>
            {debajo.map((f) => (
              <Link
                key={f.id}
                href={`/subs/${f.id}`}
                className="flex justify-between gap-3 border-t border-stone-100 py-2 text-sm tabular-nums"
              >
                <span className="truncate">{f.nombreLegal || f.nombre}</span>
                <span className="shrink-0">{dinero(f.total)}</span>
              </Link>
            ))}
          </section>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-texto-suave">
          <p>
            Los pagos con <strong>tarjeta</strong> no se suman: esos los reporta el procesador de pagos (1099-K).
          </p>
          <p>
            Si una <strong>LLC</strong> marcó en su W-9 que tributa como corporación (C o S), no lleva 1099. Confirmalo con el
            contador.
          </p>
        </div>
      </div>
    </main>
  );
}

function FilaSub({ fila: f }: { fila: Fila1099 }) {
  const tin = tinOculto(f.tinTipo, f.tinUltimos4);
  return (
    <Link href={`/subs/${f.id}`} className="flex flex-col gap-1 border-t border-stone-100 py-2.5 text-sm active:bg-stone-50">
      <span className="flex justify-between gap-3 tabular-nums">
        <span className="min-w-0 truncate font-medium">{f.nombreLegal || f.nombre}</span>
        <strong className="shrink-0">{dinero(f.total)}</strong>
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
        <span>{f.tipo === "llc" ? "LLC / empresa" : "Persona"}</span>
        {tin && <span className="tabular-nums">{tin}</span>}
        {f.conTarjeta > 0 && <span>+ {dinero(f.conTarjeta)} con tarjeta (no va)</span>}
        {f.faltan.length > 0 ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-900">Falta: {f.faltan.join(", ")}</span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">Datos completos</span>
        )}
      </span>
    </Link>
  );
}

function Cifra({ valor, nombre, clase = "" }: { valor: string; nombre: string; clase?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-lg font-bold ${clase}`}>{valor}</span>
      <span className="text-xs text-texto-suave">{nombre}</span>
    </div>
  );
}
