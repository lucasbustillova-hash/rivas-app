import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { MINIMO_1099, anioActual, dinero, iniciales, type SubPrivado } from "@/lib/subs";

// Lista de subcontratistas con búsqueda (pantalla 5 de los bocetos).
export default async function SubsPage({ searchParams }: PageProps<"/subs">) {
  const { q } = await searchParams;
  // Se quitan los caracteres que tienen significado en el filtro de Supabase.
  const busqueda = typeof q === "string" ? q.replace(/[,()%*\\]/g, " ").trim() : "";

  const supabase = await createClient();
  const anio = anioActual();
  const admin = await esAdmin();

  let consulta = supabase.from("subcontratistas").select("id, nombre, oficio, activo").order("activo", { ascending: false }).order("nombre");
  if (busqueda) consulta = consulta.or(`nombre.ilike.%${busqueda}%,oficio.ilike.%${busqueda}%`);

  // Lo que solo ve un administrador: tarifa, W-9 y lo pagado en el año.
  const [{ data: subs, error }, privados, pagos] = await Promise.all([
    consulta,
    admin
      ? supabase.from("subcontratistas_privado").select("subcontratista_id, tarifa_diaria, w9_firmado")
      : Promise.resolve({ data: [] }),
    admin
      ? supabase
          .from("pagos_sub")
          .select("monto, asignaciones(subcontratista_id)")
          .gte("fecha", `${anio}-01-01`)
          .lte("fecha", `${anio}-12-31`)
      : Promise.resolve({ data: [] }),
  ]);

  const privadoDe = new Map(
    (privados.data ?? []).map((p) => [p.subcontratista_id as string, p as Pick<SubPrivado, "tarifa_diaria" | "w9_firmado">]),
  );
  const pagadoDe = new Map<string, number>();
  for (const p of pagos.data ?? []) {
    const subId = (p.asignaciones as unknown as { subcontratista_id: string } | null)?.subcontratista_id;
    if (subId) pagadoDe.set(subId, (pagadoDe.get(subId) ?? 0) + Number(p.monto));
  }
  const sinW9 = (subs ?? []).filter((s) => (pagadoDe.get(s.id) ?? 0) >= MINIMO_1099 && !privadoDe.get(s.id)?.w9_firmado);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 bg-tinta px-5 pb-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-titulo text-3xl font-bold">Subcontratistas</h1>
          <Link
            href="/subs/nuevo"
            aria-label="Nuevo subcontratista"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-obra text-white active:bg-obra-oscuro"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
        <form action="/subs" role="search" className="flex h-11 items-center gap-2.5 rounded-xl bg-tinta-suave px-3.5">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            aria-label="Buscar por nombre u oficio"
            placeholder="Buscar por nombre u oficio"
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-stone-400"
          />
        </form>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        {sinW9.length > 0 && (
          <div role="alert" className="mb-1 rounded-xl bg-orange-100 p-3.5 text-sm text-orange-900">
            <strong>
              {sinW9.length === 1 ? "1 sub pasó" : `${sinW9.length} subs pasaron`} {dinero(MINIMO_1099)} en {anio} y{" "}
              {sinW9.length === 1 ? "le falta" : "les falta"} el W-9:
            </strong>{" "}
            {sinW9.map((s) => s.nombre).join(", ")}. Pedíselo antes de enero para la 1099.
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            No se pudieron cargar los subcontratistas. Revisá la conexión y probá de nuevo.
          </p>
        )}

        {subs?.length === 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-medium">{busqueda ? `No hay nadie que coincida con "${busqueda}".` : "Todavía no hay subcontratistas."}</p>
            <Link href="/subs/nuevo" className="mt-2 inline-block font-semibold text-obra">
              + Agregar un subcontratista
            </Link>
          </div>
        )}

        {subs?.map((s) => {
          const privado = privadoDe.get(s.id);
          const pagado = pagadoDe.get(s.id) ?? 0;
          const detalle = [s.oficio, privado?.tarifa_diaria != null ? `${dinero(Number(privado.tarifa_diaria))}/día` : null]
            .filter(Boolean)
            .join(" · ");
          return (
            <Link
              key={s.id}
              href={`/subs/${s.id}`}
              className={`flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm active:bg-stone-50 ${s.activo ? "" : "opacity-60"}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold">
                {iniciales(s.nombre)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{s.nombre}</span>
                <span className="truncate text-xs text-texto-suave">
                  {detalle || "Sin oficio"}
                  {s.activo ? "" : " · Inactivo"}
                </span>
              </span>
              {admin && (
                <span className="flex shrink-0 flex-col items-end gap-1 tabular-nums">
                  <span className="text-sm font-semibold">{dinero(pagado)}</span>
                  <EtiquetaW9 firmado={Boolean(privado?.w9_firmado)} pasaMinimo={pagado >= MINIMO_1099} />
                </span>
              )}
            </Link>
          );
        })}

        {admin && (subs?.length ?? 0) > 0 && (
          <p className="px-1 text-xs text-texto-suave">Montos: total pagado en {anio}, de todos los proyectos.</p>
        )}
      </div>
    </main>
  );
}

function EtiquetaW9({ firmado, pasaMinimo }: { firmado: boolean; pasaMinimo: boolean }) {
  if (firmado) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">W-9 ✓</span>;
  if (pasaMinimo) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">Falta W-9</span>;
  return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-texto-suave">Sin W-9</span>;
}
