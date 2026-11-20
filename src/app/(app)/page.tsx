import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, coincideBusqueda, datosEstado, rangoFechas } from "@/lib/proyectos";
import { esAdmin } from "@/lib/permisos";
import { CuentasEnInicio } from "./pendientes/cuentas-en-inicio";

// Lista de proyectos con filtro por estado (pantalla 1 de los bocetos).
export default async function ProyectosPage({ searchParams }: PageProps<"/">) {
  const { estado, q } = await searchParams;
  const filtro = typeof estado === "string" && datosEstado(estado) ? estado : null;
  const busqueda = typeof q === "string" ? q.trim().slice(0, 100) : "";

  const supabase = await createClient();
  let consulta = supabase
    .from("proyectos")
    .select("id, nombre, tipo_trabajo, estado, fecha_inicio, fecha_fin_estimada, direccion_obra, clientes(nombre, telefono)")
    .order("creado_en", { ascending: false });
  if (filtro) consulta = consulta.eq("estado", filtro);
  const [{ data: todos, error }, admin] = await Promise.all([consulta, esAdmin()]);
  // La búsqueda se hace acá y no en la base, para que no importen los acentos.
  const proyectos = todos?.filter((p) => {
    const cliente = p.clientes as unknown as { nombre: string; telefono: string | null } | null;
    return coincideBusqueda(busqueda, [p.nombre, p.tipo_trabajo, p.direccion_obra, cliente?.nombre, cliente?.telefono]);
  });
  const conBusqueda = (params: Record<string, string>) => {
    const u = new URLSearchParams(params);
    if (busqueda) u.set("q", busqueda);
    const t = u.toString();
    return t ? `/?${t}` : "/";
  };

  const filtros = [{ valor: null, nombre: "Todos" }, ...ESTADOS.map((e) => ({ valor: e.valor, nombre: e.plural }))];

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 bg-tinta px-5 pb-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-titulo text-3xl font-bold">Proyectos</h1>
          <Link
            href="/proyectos/nuevo"
            aria-label="Nuevo proyecto"
            className="flex size-11 items-center justify-center rounded-full bg-obra text-white active:bg-obra-oscuro"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
        <form role="search" action="/" className="relative">
          {filtro && <input type="hidden" name="estado" value={filtro} />}
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            key={busqueda}
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Buscar proyecto"
            placeholder="Buscar cliente, dirección, teléfono…"
            className="h-11 w-full rounded-xl bg-white pr-11 pl-10 text-base text-tinta outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-obra/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <Link
              href={filtro ? `/?estado=${filtro}` : "/"}
              aria-label="Borrar la búsqueda"
              className="absolute top-0 right-0 flex size-11 items-center justify-center text-xl text-stone-500"
            >
              ×
            </Link>
          )}
        </form>
        <nav aria-label="Filtrar por estado" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {filtros.map((f) => {
            const activo = f.valor === filtro;
            return (
              <Link
                key={f.nombre}
                href={conBusqueda(f.valor ? { estado: f.valor } : {})}
                aria-current={activo ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                  activo ? "bg-white font-semibold text-tinta" : "bg-tinta-suave text-stone-300"
                }`}
              >
                {f.nombre}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Los totales se cargan aparte, para no demorar la lista. */}
        {admin && !busqueda && (
          <Suspense fallback={<div className="h-[66px] rounded-2xl bg-white/60 shadow-sm" />}>
            <CuentasEnInicio />
          </Suspense>
        )}
        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar los proyectos. Revisá la conexión y probá de nuevo.
          </p>
        )}

        {proyectos?.length === 0 && busqueda && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-medium">
              No hay proyectos{filtro ? ` ${datosEstado(filtro)?.plural.toLowerCase()}` : ""} que coincidan con «{busqueda}».
            </p>
            <Link href={filtro ? `/?estado=${filtro}` : "/"} className="mt-2 inline-block font-semibold text-obra">
              Borrar la búsqueda
            </Link>
          </div>
        )}

        {proyectos?.length === 0 && !busqueda && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-medium">
              {filtro ? `No hay proyectos ${datosEstado(filtro)?.plural.toLowerCase()}.` : "Todavía no hay proyectos."}
            </p>
            <Link href="/proyectos/nuevo" className="mt-2 inline-block font-semibold text-obra">
              + Crear un proyecto
            </Link>
          </div>
        )}

        {/* clientes llega como objeto: cada proyecto tiene un solo cliente. */}
        {proyectos?.map((p) => {
          const e = datosEstado(p.estado);
          return (
            <Link
              key={p.id}
              href={`/proyectos/${p.id}`}
              className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3.5 shadow-sm active:bg-stone-50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-semibold">{p.nombre}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${e?.chip}`}>{e?.nombre}</span>
              </div>
              <span className="text-sm text-texto-suave">
                {(p.clientes as unknown as { nombre: string } | null)?.nombre} · {p.tipo_trabajo}
              </span>
              <span className="text-xs text-texto-suave">{rangoFechas(p.fecha_inicio, p.fecha_fin_estimada)}</span>
            </Link>
          );
        })}

        {admin && (
          <Link
            href="/resumen-anual"
            className="mt-2 flex items-center justify-between rounded-xl border border-borde bg-white px-4 py-3 text-sm font-semibold active:bg-stone-50"
          >
            <span>Resumen del año para el contador</span>
            <span aria-hidden="true" className="text-obra">
              ›
            </span>
          </Link>
        )}
      </div>
    </main>
  );
}
