"use client";

import { startTransition, useActionState, useState } from "react";
import { METODOS } from "@/lib/cobros";
import { campo, etiqueta } from "@/lib/estilos";
import { registrarPago, type EstadoFormulario } from "./acciones";

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Anotar un pago recibido: fecha, monto y forma de pago.
export function FormularioPago({ proyectoId, sugerido }: { proyectoId: string; sugerido: number | null }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, guardando] = useActionState<EstadoFormulario & { listo?: number }, FormData>(
    registrarPago.bind(null, proyectoId),
    { error: null },
  );
  const [ultimoListo, setUltimoListo] = useState<number | undefined>(undefined);

  // Al guardar bien, se cierra el formulario.
  if (estado.listo && estado.listo !== ultimoListo) {
    setUltimoListo(estado.listo);
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        {estado.listo && !guardando && <p className="text-sm font-semibold text-green-800">Pago anotado.</p>}
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro"
        >
          + Anotar pago recibido
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold">Pago recibido</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className={etiqueta}>
          Monto (USD)
          <input
            name="monto"
            inputMode="decimal"
            required
            defaultValue={sugerido ?? ""}
            placeholder="Ej.: 7400"
            className={campo}
          />
        </label>
        <label className={etiqueta}>
          Fecha
          <input type="date" name="fecha" required defaultValue={hoyLocal()} max={hoyLocal()} className={campo} />
        </label>
      </div>
      <fieldset className="flex flex-col">
        <legend className="pb-1.5 text-sm font-medium">Forma de pago</legend>
        <div className="flex flex-wrap gap-2">
          {METODOS.map((m, i) => (
            <label
              key={m.valor}
              className="flex h-11 cursor-pointer items-center rounded-xl border border-borde px-3.5 text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
            >
              <input type="radio" name="metodo" value={m.valor} defaultChecked={i === 0} className="sr-only" />
              {m.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={etiqueta}>
        Nota (opcional)
        <input name="nota" maxLength={500} placeholder="Ej.: cheque #1043" className={campo} />
      </label>
      {estado.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-12 rounded-xl border border-borde bg-white font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar pago"}
        </button>
      </div>
    </form>
  );
}
