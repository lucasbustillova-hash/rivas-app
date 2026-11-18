"use client";

import { startTransition, useActionState, useState } from "react";
import { dinero } from "@/lib/cobros";
import { campo } from "@/lib/estilos";
import { cambiarTarifa, type EstadoFormulario } from "../acciones";

// Tarifa por día en este proyecto. Cambiarla no toca los días ya cargados.
export function CambiarTarifa({ asignacionId, tarifa }: { asignacionId: string; tarifa: number }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(cambiarTarifa.bind(null, asignacionId), {
    error: null,
  });

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="text-sm">
          Tarifa: <strong>{dinero(tarifa)}/día</strong>
        </span>
        {estado.error && <span className="order-last w-full text-sm text-red-700">{estado.error}</span>}
        <button type="button" onClick={() => setAbierto(true)} className="text-sm font-semibold text-obra">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(async () => {
          accion(datos);
          setAbierto(false);
        });
      }}
      className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nueva tarifa por día (USD)
        <input name="tarifa_diaria" inputMode="decimal" required defaultValue={tarifa} className={campo} />
      </label>
      <p className="text-xs text-texto-suave">Se usa para los días que cargues de ahora en adelante; los ya cargados no cambian.</p>
      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-xl border border-borde font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="h-11 rounded-xl bg-obra font-semibold text-white disabled:opacity-60">
          Guardar
        </button>
      </div>
    </form>
  );
}
