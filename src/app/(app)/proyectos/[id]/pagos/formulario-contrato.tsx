"use client";

import { startTransition, useActionState, useState } from "react";
import { PLANES, cuotasDelPlan, dinero, leerMonto, type Cuota, type Plan } from "@/lib/cobros";
import { campo, etiqueta } from "@/lib/estilos";
import { guardarContrato, type EstadoFormulario } from "./acciones";

type Fila = { descripcion: string; monto: string };

const campoFila = campo.replace("w-full ", "");

// Monto del contrato y plan de pagos.
export function FormularioContrato({
  proyectoId,
  total,
  plan: planInicial,
  cuotas,
}: {
  proyectoId: string;
  total: number | null;
  plan: Plan;
  cuotas: Cuota[];
}) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(
    guardarContrato.bind(null, proyectoId),
    { error: null },
  );
  const [monto, setMonto] = useState(total != null ? String(total) : "");
  const [plan, setPlan] = useState<Plan>(planInicial);
  const [filas, setFilas] = useState<Fila[]>(
    planInicial === "propio" && cuotas.length
      ? cuotas.map((c) => ({ descripcion: c.descripcion, monto: String(c.monto) }))
      : [
          { descripcion: "Al empezar", monto: "" },
          { descripcion: "Al terminar", monto: "" },
        ],
  );

  const totalNumero = leerMonto(monto);
  const vistaPrevia = plan !== "propio" && totalNumero ? cuotasDelPlan(plan, totalNumero) : [];
  const sumaPropio = filas.reduce((t, f) => t + (leerMonto(f.monto) ?? 0), 0);
  const cambiarFila = (i: number, cambio: Partial<Fila>) =>
    setFilas((actual) => actual.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className={etiqueta}>
          Monto total del contrato (USD)
          <input
            name="monto_total"
            inputMode="decimal"
            required
            placeholder="Ej.: 18500"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={campo}
          />
        </label>

        <fieldset className="flex flex-col">
          <legend className="pb-1.5 text-sm font-medium">Plan de pagos</legend>
          <div className="grid grid-cols-3 gap-2">
            {PLANES.map((p) => (
              <label
                key={p.valor}
                className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-borde text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.valor}
                  checked={plan === p.valor}
                  onChange={() => setPlan(p.valor)}
                  className="sr-only"
                />
                {p.nombre}
              </label>
            ))}
          </div>
        </fieldset>

        {plan !== "propio" && vistaPrevia.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl bg-piedra p-3 text-sm tabular-nums">
            {vistaPrevia.map((c) => (
              <li key={c.descripcion} className="flex justify-between">
                <span>{c.descripcion}</span>
                <strong>{dinero(c.monto)}</strong>
              </li>
            ))}
          </ul>
        )}

        {plan === "propio" && (
          <div className="flex flex-col gap-2">
            {filas.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  name="cuota_descripcion"
                  aria-label={`Descripción del pago ${i + 1}`}
                  placeholder="Ej.: al poner gabinetes"
                  value={f.descripcion}
                  onChange={(e) => cambiarFila(i, { descripcion: e.target.value })}
                  className={`${campoFila} min-w-0 flex-1`}
                />
                <input
                  name="cuota_monto"
                  aria-label={`Monto del pago ${i + 1}`}
                  inputMode="decimal"
                  placeholder="Monto"
                  value={f.monto}
                  onChange={(e) => cambiarFila(i, { monto: e.target.value })}
                  className={`${campoFila} w-28 shrink-0`}
                />
                {filas.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Quitar el pago ${i + 1}`}
                    onClick={() => setFilas((actual) => actual.filter((_, j) => j !== i))}
                    className="w-10 shrink-0 rounded-xl text-xl text-texto-suave"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFilas((actual) => [...actual, { descripcion: "", monto: "" }])}
              className="w-fit text-sm font-semibold text-obra"
            >
              + Agregar otro pago
            </button>
            {totalNumero != null && (
              <p
                className={`text-sm tabular-nums ${
                  Math.abs(sumaPropio - totalNumero) < 0.005 ? "text-green-800" : "text-amber-800"
                }`}
              >
                Suman {dinero(Math.round(sumaPropio * 100) / 100)} de {dinero(totalNumero)}
              </p>
            )}
          </div>
        )}
      </section>

      {estado.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar contrato"}
      </button>
    </form>
  );
}
