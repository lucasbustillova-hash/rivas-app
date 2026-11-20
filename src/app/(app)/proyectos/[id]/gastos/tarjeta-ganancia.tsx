import { dinero } from "@/lib/cobros";
import type { resumenGanancia } from "@/lib/gastos";

// Cuánto deja el proyecto: contrato − mano de obra − gastos, y la plata que entró hasta hoy.
export function TarjetaGanancia({
  contrato,
  cobrado,
  pagadoSubs,
  resumen,
  detalle = false,
}: {
  contrato: number | null;
  cobrado: number;
  pagadoSubs: number;
  resumen: ReturnType<typeof resumenGanancia>;
  detalle?: boolean;
}) {
  const { ganancia, margen, manoDeObra, totalGastos, porCategoria, enMano } = resumen;
  const negativa = ganancia != null && ganancia < 0;

  return (
    <div className="flex flex-col gap-3 tabular-nums">
      {ganancia != null ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-2xl font-bold ${negativa ? "text-red-700" : "text-green-800"}`}>{dinero(ganancia)}</span>
          {margen != null && (
            <span className={`text-sm font-semibold ${negativa ? "text-red-700" : "text-green-800"}`}>
              {negativa ? "Pérdida" : `${margen}% del contrato`}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-texto-suave">Cargá el contrato del cliente para ver la ganancia.</p>
      )}

      <div className="flex flex-col text-sm">
        {contrato != null && <Fila nombre="Contrato" monto={contrato} />}
        <Fila nombre="Mano de obra (subs)" monto={manoDeObra} resta />
        {detalle && porCategoria.length > 0 ? (
          porCategoria.map((c) => <Fila key={c.valor} nombre={c.nombre} monto={c.total} resta />)
        ) : (
          <Fila nombre="Gastos" monto={totalGastos} resta />
        )}
        {ganancia != null && <Fila nombre="Ganancia" monto={ganancia} fuerte />}
      </div>

      <div className="flex flex-col gap-1 rounded-xl bg-stone-100 p-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="font-medium">Plata en mano hoy</span>
          <strong className={enMano < 0 ? "text-red-700" : ""}>{dinero(enMano)}</strong>
        </div>
        <span className="text-xs text-texto-suave">
          Cobrado {dinero(cobrado)} − pagado a subs {dinero(pagadoSubs)} − gastos {dinero(totalGastos)}
        </span>
      </div>
    </div>
  );
}

function Fila({
  nombre,
  monto,
  resta = false,
  fuerte = false,
}: {
  nombre: string;
  monto: number;
  resta?: boolean;
  fuerte?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 py-1 ${fuerte ? "border-t border-stone-200 pt-2 font-semibold" : ""}`}>
      <span className={fuerte ? "" : "text-texto-suave"}>{nombre}</span>
      <span className={fuerte && monto < 0 ? "text-red-700" : ""}>{resta ? `− ${dinero(monto)}` : dinero(monto)}</span>
    </div>
  );
}
