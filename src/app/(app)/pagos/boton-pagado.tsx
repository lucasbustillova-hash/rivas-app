"use client";

import { useState, useTransition } from "react";
import { METODOS, dinero } from "@/lib/cobros";
import { marcarPagado } from "./acciones";

// "Pagado": primero se elige cómo se le pagó y después se confirma. Anota el pago en todas sus obras de una vez.
export function BotonPagado({ subId, nombre, total }: { subId: string; nombre: string; total: number }) {
  const [abierto, setAbierto] = useState(false);
  const [metodo, setMetodo] = useState("zelle");
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="h-11 rounded-xl bg-obra px-4 font-semibold text-white active:bg-obra-oscuro"
      >
        Pagado
      </button>
    );
  }

  const confirmar = () =>
    startTransition(async () => {
      const r = await marcarPagado(subId, total, metodo);
      setError(r.error ?? null);
    });

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-stone-50 p-3">
      <span className="text-sm font-semibold">¿Cómo se le pagó a {nombre}?</span>
      <div role="radiogroup" aria-label="Cómo se le pagó" className="flex flex-wrap gap-1.5">
        {METODOS.filter((m) => m.valor !== "tarjeta").map((m) => (
          <button
            key={m.valor}
            type="button"
            role="radio"
            aria-checked={metodo === m.valor}
            onClick={() => setMetodo(m.valor)}
            className={`h-10 rounded-xl border px-3 text-sm font-semibold ${
              metodo === m.valor ? "border-tinta bg-tinta text-white" : "border-borde bg-white"
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={confirmar}
          className="h-11 flex-1 rounded-xl bg-obra px-4 font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
        >
          {guardando ? "Anotando…" : `Anotar ${dinero(total)}`}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="h-11 rounded-xl border border-borde bg-white px-4 font-semibold"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
