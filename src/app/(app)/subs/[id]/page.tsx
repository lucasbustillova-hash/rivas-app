import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { MINIMO_1099, anioActual, dinero, lineasDireccion, tinOculto, type Sub, type SubPrivado } from "@/lib/subs";
import { textoDias } from "@/lib/mano-de-obra";
import { MostrarTin } from "../mostrar-tin";
import { SubirW9 } from "../subir-w9";

type Asignacion = {
  id: string;
  proyectos: { id: string; nombre: string; clientes: { nombre: string } | null } | null;
  dias_trabajados: { fecha: string; fraccion: number }[];
  pagos_sub: { fecha: string; monto: number }[];
};

// Ficha del subcontratista (pantalla 6 de los bocetos).
export default async function SubPage({ params }: PageProps<"/subs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const anio = anioActual();
  const admin = await esAdmin();

  const { data: sub } = await supabase.from("subcontratistas").select("*").eq("id", id).maybeSingle<Sub>();
  if (!sub) notFound();

  let privado: SubPrivado | null = null;
  let asignaciones: Asignacion[] = [];
  let urlW9: string | null = null;
  if (admin) {
    const [p, a] = await Promise.all([
      supabase.from("subcontratistas_privado").select("*").eq("subcontratista_id", id).maybeSingle<SubPrivado>(),
      supabase
        .from("asignaciones")
        .select("id, proyectos(id, nombre, clientes(nombre)), dias_trabajados(fecha, fraccion), pagos_sub(fecha, monto)")
        .eq("subcontratista_id", id),
    ]);
    privado = p.data;
    asignaciones = (a.data ?? []) as unknown as Asignacion[];
    if (privado?.w9_ruta) {
      // Enlace temporal (10 minutos) para abrir el W-9.
      const { data } = await supabase.storage.from("documentos").createSignedUrl(privado.w9_ruta, 600);
      urlW9 = data?.signedUrl ?? null;
    }
  }

  // Historial del año: días y pagado por proyecto.
  const delAnio = (fecha: string) => fecha.startsWith(`${anio}-`);
  const porProyecto = new Map<string, { id: string; nombre: string; cliente: string; dias: number; pagado: number }>();
  for (const a of asignaciones) {
    if (!a.proyectos) continue;
    const fila = porProyecto.get(a.proyectos.id) ?? {
      id: a.proyectos.id,
      nombre: a.proyectos.nombre,
      cliente: a.proyectos.clientes?.nombre ?? "",
      dias: 0,
      pagado: 0,
    };
    fila.dias += a.dias_trabajados.filter((d) => delAnio(d.fecha)).reduce((t, d) => t + Number(d.fraccion), 0);
    fila.pagado += a.pagos_sub.filter((p) => delAnio(p.fecha)).reduce((t, p) => t + Number(p.monto), 0);
    porProyecto.set(a.proyectos.id, fila);
  }
  const historial = [...porProyecto.values()].filter((h) => h.dias > 0 || h.pagado > 0);
  const totalDias = historial.reduce((t, h) => t + h.dias, 0);
  const totalPagado = historial.reduce((t, h) => t + h.pagado, 0);

  const subtitulo = [
    sub.oficio,
    privado?.tarifa_diaria != null ? `${dinero(Number(privado.tarifa_diaria))}/día` : null,
    sub.activo ? null : "Inactivo",
  ]
    .filter(Boolean)
    .join(" · ");
  const tin = tinOculto(privado?.tin_tipo ?? null, privado?.tin_ultimos4 ?? null);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/subs" volverTexto="Subcontratistas" titulo={sub.nombre} subtitulo={subtitulo || undefined} />

      <div className="flex flex-col gap-3 px-4 py-4">
        {admin && (
          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Datos para la 1099</h2>
              <span className="text-xs text-texto-suave">Solo administradores</span>
            </div>
            <Dato nombre="Nombre legal">{privado?.nombre_legal}</Dato>
            <Dato nombre="Tipo">{privado ? (privado.tipo === "llc" ? "LLC / empresa" : "Persona") : null}</Dato>
            <Dato nombre={privado?.tin_tipo === "ein" ? "EIN" : "SSN"}>
              {tin && <MostrarTin subId={sub.id} oculto={tin} />}
            </Dato>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-texto-suave">W-9</span>
              {privado?.w9_firmado ? (
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Firmado</span>
                  {urlW9 && (
                    <a href={urlW9} target="_blank" rel="noreferrer" className="text-sm font-semibold text-obra">
                      Ver W-9
                    </a>
                  )}
                </span>
              ) : (
                <span className="text-sm text-texto-suave">Todavía no lo tenemos.</span>
              )}
              <SubirW9 subId={sub.id} tiene={Boolean(privado?.w9_firmado)} />
            </div>
          </section>
        )}

        {admin && (
          <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between pb-2">
              <h2 className="font-semibold">Historial {anio}</h2>
              <span className="text-xs text-texto-suave">Días · Pagado</span>
            </div>
            {historial.length === 0 && <p className="text-sm text-texto-suave">Todavía no trabajó en ningún proyecto este año.</p>}
            {historial.map((h) => (
              <div key={h.id} className="flex justify-between gap-3 border-t border-stone-100 py-2 text-sm tabular-nums">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{h.nombre}</span>
                  <span className="text-xs text-texto-suave">{h.cliente}</span>
                </span>
                <span className="shrink-0 text-right">
                  {textoDias(h.dias)} · <strong>{dinero(h.pagado)}</strong>
                </span>
              </div>
            ))}
            {historial.length > 0 && (
              <div className="flex justify-between border-t-2 border-tinta pt-2 font-semibold tabular-nums">
                <span>Total del año</span>
                <span>
                  {textoDias(totalDias)} · {dinero(totalPagado)}
                </span>
              </div>
            )}
          </section>
        )}

        {admin && totalPagado >= MINIMO_1099 && (
          <div
            className={`rounded-xl p-3.5 text-sm ${privado?.w9_firmado ? "bg-indigo-100 text-indigo-900" : "bg-orange-100 text-orange-900"}`}
          >
            <strong>Le corresponde 1099-NEC</strong> (le pagaron {dinero(MINIMO_1099)} o más en {anio}).{" "}
            {privado?.w9_firmado ? "Ya está el W-9." : "Falta el W-9: pedíselo antes de enero."}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Contacto</h2>
          <Dato nombre="Teléfono">
            {sub.telefono && (
              <a href={`tel:${sub.telefono}`} className="text-obra">
                {sub.telefono}
              </a>
            )}
          </Dato>
          <Dato nombre="Correo">
            {sub.correo && (
              <a href={`mailto:${sub.correo}`} className="break-all text-obra">
                {sub.correo}
              </a>
            )}
          </Dato>
          <Dato nombre="Dirección">{lineasDireccion(sub).join("\n")}</Dato>
          <Dato nombre="Notas">{sub.notas}</Dato>
        </section>

        <Link
          href={`/subs/${sub.id}/editar`}
          className="flex h-12 items-center justify-center rounded-xl border border-borde bg-white font-semibold"
        >
          Editar
        </Link>
      </div>
    </main>
  );
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-texto-suave">{nombre}</span>
      <span className="whitespace-pre-line">{children || <span className="text-stone-400">—</span>}</span>
    </div>
  );
}
