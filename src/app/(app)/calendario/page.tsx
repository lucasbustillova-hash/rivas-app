import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { datosEstado } from "@/lib/proyectos";
import { choques, diasDeLaSemana, fechaValida, hoyEnFlorida, lunesDe, sumarDias, tituloDia, tituloSemana } from "@/lib/agenda";
import { FormularioProgramar } from "./formulario-programar";
import { MarcarTrabajado, Quitar } from "./botones";

type Entrada = {
  id: string;
  fecha: string;
  proyecto_id: string;
  subcontratista_id: string;
  nota: string | null;
  proyectos: { nombre: string } | null;
  subcontratistas: { nombre: string } | null;
};

// Calendario de la semana: qué sub va a qué obra cada día.
export default async function CalendarioPage({ searchParams }: PageProps<"/calendario">) {
  const { semana } = await searchParams;
  const hoy = hoyEnFlorida();
  const lunes = lunesDe(typeof semana === "string" && fechaValida(semana) ? semana : hoy);
  const dias = diasDeLaSemana(lunes);
  const domingo = dias[6];

  const supabase = await createClient();
  const admin = await esAdmin();
  const [{ data: agendaData }, { data: proyectos }, { data: subs }] = await Promise.all([
    supabase
      .from("agenda")
      .select("id, fecha, proyecto_id, subcontratista_id, nota, proyectos(nombre), subcontratistas(nombre)")
      .gte("fecha", lunes)
      .lte("fecha", domingo)
      .order("creado_en"),
    supabase.from("proyectos").select("id, nombre, estado").neq("estado", "terminado").order("nombre"),
    supabase.from("subcontratistas").select("id, nombre, oficio").eq("activo", true).order("nombre"),
  ]);
  const agenda = (agendaData ?? []) as unknown as Entrada[];
  const chocan = choques(agenda);

  // Solo administradores: qué subs van por día en cada obra y qué días ya se marcaron como trabajados.
  const asignacionDe = new Map<string, string>(); // "proyecto|sub" → asignación por día
  const trabajado = new Map<string, number>(); // "fecha|proyecto|sub" → 1 o 0.5
  if (admin && agenda.length > 0) {
    const { data } = await supabase
      .from("asignaciones")
      .select("id, proyecto_id, subcontratista_id, dias_trabajados(fecha, fraccion)")
      .eq("modalidad", "dia")
      .in("proyecto_id", [...new Set(agenda.map((e) => e.proyecto_id))])
      .gte("dias_trabajados.fecha", lunes)
      .lte("dias_trabajados.fecha", domingo);
    for (const a of data ?? []) {
      asignacionDe.set(`${a.proyecto_id}|${a.subcontratista_id}`, a.id);
      for (const d of (a.dias_trabajados ?? []) as { fecha: string; fraccion: number }[]) {
        trabajado.set(`${d.fecha}|${a.proyecto_id}|${a.subcontratista_id}`, Number(d.fraccion));
      }
    }
  }

  const orden = ["activo", "estimado", "en_pausa"];
  const opcionesProyectos = (proyectos ?? [])
    .sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado))
    .map((p) => ({ id: p.id, nombre: p.nombre, detalle: p.estado === "activo" ? null : (datosEstado(p.estado)?.nombre ?? null) }));
  const opcionesSubs = (subs ?? []).map((s) => ({ id: s.id, nombre: s.nombre, detalle: s.oficio }));
  const esEstaSemana = lunes === lunesDe(hoy);

  return (
    <main className="flex flex-1 flex-col">
      <div className="franja flex flex-col gap-0.5 px-5 pb-4 text-white">
        <h1 className="font-titulo text-3xl font-bold">Calendario</h1>
        <span className="text-sm text-stone-300">{tituloSemana(lunes)}</span>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <nav aria-label="Cambiar de semana" className="grid grid-cols-3 gap-2 text-sm font-semibold">
          <Link href={`/calendario?semana=${sumarDias(lunes, -7)}`} className="flex h-11 items-center justify-center rounded-xl border border-borde bg-white">
            ‹ Anterior
          </Link>
          <Link
            href="/calendario"
            aria-disabled={esEstaSemana}
            className={`flex h-11 items-center justify-center rounded-xl border border-borde bg-white ${esEstaSemana ? "text-texto-suave" : "text-obra"}`}
          >
            Esta semana
          </Link>
          <Link href={`/calendario?semana=${sumarDias(lunes, 7)}`} className="flex h-11 items-center justify-center rounded-xl border border-borde bg-white">
            Siguiente ›
          </Link>
        </nav>

        <FormularioProgramar proyectos={opcionesProyectos} subs={opcionesSubs} diaInicial={esEstaSemana ? hoy : lunes} />

        {dias.map((fecha) => {
          const delDia = agenda.filter((e) => e.fecha === fecha);
          const obras = [...new Set(delDia.map((e) => e.proyecto_id))];
          const esHoy = fecha === hoy;
          return (
            <section
              key={fecha}
              className={`flex flex-col rounded-2xl bg-white px-4 py-3 shadow-sm ${esHoy ? "ring-2 ring-obra" : ""}`}
            >
              <h2 className="flex items-center gap-2 font-semibold">
                {tituloDia(fecha)}
                {esHoy && <span className="rounded-full bg-obra px-2 py-0.5 text-xs font-semibold text-white">Hoy</span>}
              </h2>
              {delDia.length === 0 && <p className="pt-1 text-sm text-texto-suave">Nadie programado.</p>}
              {obras.map((proyectoId) => {
                const entradas = delDia.filter((e) => e.proyecto_id === proyectoId);
                return (
                  <div key={proyectoId} className="flex flex-col border-t border-stone-100 pt-2 mt-2 first-of-type:border-0">
                    <Link href={`/proyectos/${proyectoId}`} className="text-sm font-semibold text-obra">
                      {entradas[0].proyectos?.nombre ?? "Obra"}
                    </Link>
                    {entradas.map((e) => {
                      const nombre = e.subcontratistas?.nombre ?? "Sub";
                      const choca = chocan.has(`${fecha}|${e.subcontratista_id}`);
                      const fraccion = trabajado.get(`${fecha}|${e.proyecto_id}|${e.subcontratista_id}`);
                      const asignacion = asignacionDe.get(`${e.proyecto_id}|${e.subcontratista_id}`);
                      return (
                        <div key={e.id} className="flex items-start justify-between gap-2 py-1.5">
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="text-sm font-medium">{nombre}</span>
                            {e.nota && <span className="text-xs text-texto-suave">{e.nota}</span>}
                            {choca && (
                              <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                También está en otra obra este día
                              </span>
                            )}
                            {admin &&
                              (fraccion ? (
                                <span className="text-xs font-semibold text-green-800">
                                  ✓ Trabajó {fraccion === 1 ? "el día" : "medio día"}
                                </span>
                              ) : asignacion && fecha <= hoy ? (
                                <MarcarTrabajado asignacionId={asignacion} fecha={fecha} />
                              ) : null)}
                          </span>
                          <Quitar id={e.id} nombre={nombre} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          );
        })}

        {admin && (
          <p className="px-1 text-xs text-texto-suave">
            Programar no suma plata: el día cuenta para el pago recién cuando se marca como trabajado. Solo se puede marcar a los
            subs que van por día en esa obra; los de contrato se pagan por su monto acordado.
          </p>
        )}
      </div>
    </main>
  );
}
