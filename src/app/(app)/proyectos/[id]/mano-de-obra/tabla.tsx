import Link from "next/link";
import { dinero } from "@/lib/cobros";
import { textoDias } from "@/lib/mano-de-obra";
import type { FilaManoDeObra } from "./datos";

// Tabla de mano de obra: un renglón por sub, con lo que se le debe, y el total abajo.
export function TablaManoDeObra({
  filas,
  totales,
}: {
  filas: FilaManoDeObra[];
  totales: { ganado: number; pagado: number; debe: number };
}) {
  if (filas.length === 0) return <p className="text-sm text-texto-suave">Todavía no hay subs cargados en este proyecto.</p>;
  return (
    <div className="flex flex-col">
      {filas.map((f) => (
        <Link
          key={f.id}
          href={`/proyectos/${f.proyecto_id}/mano-de-obra/${f.id}`}
          className="flex items-center justify-between gap-3 border-t border-stone-100 py-2.5 text-sm tabular-nums active:bg-stone-50"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{f.sub.nombre}</span>
            <span className="truncate text-xs text-texto-suave">
              {f.modalidad === "dia"
                ? `${textoDias(f.resumen.dias)} × ${dinero(Number(f.tarifa_diaria))}`
                : `Contrato${f.descripcion ? `: ${f.descripcion}` : ""}`}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <strong>{dinero(f.resumen.ganado)}</strong>
            <span className={`text-xs font-semibold ${f.resumen.debe > 0 ? "text-orange-700" : "text-green-800"}`}>
              {f.resumen.debe > 0 ? `Se le debe ${dinero(f.resumen.debe)}` : f.resumen.debe < 0 ? `Adelantado ${dinero(-f.resumen.debe)}` : "Al día"}
            </span>
          </span>
        </Link>
      ))}
      <div className="flex justify-between gap-3 border-t-2 border-tinta pt-2 text-sm font-semibold tabular-nums">
        <span>Total mano de obra</span>
        <span className="flex flex-col items-end">
          <span>{dinero(totales.ganado)}</span>
          <span className="text-xs text-texto-suave">
            Pagado {dinero(totales.pagado)} · debe {dinero(Math.max(0, totales.debe))}
          </span>
        </span>
      </div>
    </div>
  );
}
