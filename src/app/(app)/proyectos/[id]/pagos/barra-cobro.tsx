import { dinero, type resumenCobro } from "@/lib/cobros";

// Barra de progreso: cuánto pagó el cliente y cuánto falta.
export function BarraCobro({ resumen }: { resumen: ReturnType<typeof resumenCobro> }) {
  const { total, pagado, falta, deMas, porcentaje, proxima } = resumen;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 tabular-nums">
        <span className="text-2xl font-bold">{dinero(pagado)}</span>
        <span className="text-sm text-texto-suave">de {dinero(total)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Pagado del contrato"
        className="h-3 overflow-hidden rounded-full bg-stone-200"
      >
        <div className="h-full rounded-full bg-green-600" style={{ width: `${porcentaje}%` }} />
      </div>
      <div className="flex justify-between gap-2 text-sm tabular-nums">
        <span className="font-semibold text-green-800">{porcentaje}% pagado</span>
        {deMas > 0 ? (
          <span className="font-semibold text-amber-800">Pagó {dinero(deMas)} de más</span>
        ) : falta > 0 ? (
          <span className="font-semibold">Falta {dinero(falta)}</span>
        ) : (
          <span className="font-semibold text-green-800">Pagado completo</span>
        )}
      </div>
      {proxima && (
        <p className="text-sm text-texto-suave">
          Próximo cobro: <strong className="text-tinta">{proxima.descripcion}</strong> ·{" "}
          {dinero(Math.round((proxima.monto - proxima.cubierto) * 100) / 100)}
          {proxima.estado === "parcial" && " (resto)"}
        </p>
      )}
    </div>
  );
}
