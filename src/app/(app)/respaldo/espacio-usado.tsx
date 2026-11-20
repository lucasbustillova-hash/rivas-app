import { createClient } from "@/lib/supabase/server";
import { LIMITE_ARCHIVOS, LIMITE_BASE, tamano, uso } from "@/lib/espacio";

// Cuánto espacio queda en Supabase (plan gratis): la base de datos y los archivos.
export async function EspacioUsado() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("espacio_usado").maybeSingle<{ base_bytes: number; archivos_bytes: number; archivos: number }>();
  if (!data || data.base_bytes == null) return null;

  const filas = [
    { nombre: "Fotos, videos y documentos", bytes: Number(data.archivos_bytes), limite: LIMITE_ARCHIVOS, detalle: `${data.archivos} archivos` },
    { nombre: "Datos (proyectos, pagos, subs…)", bytes: Number(data.base_bytes), limite: LIMITE_BASE, detalle: null },
  ].map((f) => ({ ...f, ...uso(f.bytes, f.limite) }));
  const avisar = filas.some((f) => f.avisar);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Espacio usado</h2>
      {filas.map((f) => (
        <div key={f.nombre} className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <span>{f.nombre}</span>
            <span className="shrink-0 tabular-nums text-texto-suave">
              {tamano(f.bytes)} de {tamano(f.limite)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={f.nombre}
            aria-valuenow={f.porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-stone-200"
          >
            <div
              className={`h-full rounded-full ${f.lleno ? "bg-red-600" : f.avisar ? "bg-orange-500" : "bg-green-700"}`}
              style={{ width: `${Math.max(f.porcentaje, f.bytes > 0 ? 1 : 0)}%` }}
            />
          </div>
          {f.detalle && <span className="text-xs text-texto-suave">{f.detalle}</span>}
        </div>
      ))}
      {avisar ? (
        <p className="rounded-xl bg-orange-100 p-3 text-sm text-orange-900">
          Se está llenando. Cuando se llene no se van a poder subir más fotos ni videos. Opciones: borrar videos viejos (después
          de un respaldo) o pasar Supabase al plan Pro (100 GB de archivos).
        </p>
      ) : (
        <p className="text-xs text-texto-suave">
          Es el plan gratis de Supabase. Los videos son lo que más ocupa. La app avisa acá cuando pase del 80 %.
        </p>
      )}
    </section>
  );
}
