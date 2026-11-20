"use client";

import { useState } from "react";
import { marcarTrabajado, quitarDeAgenda } from "./acciones";

// "×" para sacar a un sub de la obra ese día.
export function Quitar({ id, nombre }: { id: string; nombre: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      disabled={ocupado}
      aria-label={`Quitar a ${nombre} de este día`}
      onClick={async () => {
        if (!confirm(`¿Quitar a ${nombre} de este día?`)) return;
        setOcupado(true);
        const r = await quitarDeAgenda(id);
        setError(Boolean(r.error));
        setOcupado(false);
      }}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none disabled:opacity-40 ${
        error ? "text-red-700" : "text-texto-suave"
      }`}
    >
      ×
    </button>
  );
}

// Para un día que ya pasó: marcarlo como trabajado (completo o medio), y queda en la cuenta del sub.
export function MarcarTrabajado({ asignacionId, fecha }: { asignacionId: string; fecha: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marcar = async (fraccion: 1 | 0.5) => {
    setOcupado(true);
    const r = await marcarTrabajado(asignacionId, fecha, fraccion);
    setError(r.error ?? null);
    setOcupado(false);
  };
  const boton =
    "h-8 rounded-lg border border-borde px-2.5 text-xs font-semibold active:bg-stone-100 disabled:opacity-50";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-texto-suave">¿Trabajó?</span>
      <button type="button" disabled={ocupado} onClick={() => marcar(1)} className={boton}>
        Día
      </button>
      <button type="button" disabled={ocupado} onClick={() => marcar(0.5)} className={boton}>
        ½ día
      </button>
      {error && <span className="w-full text-xs text-red-700">{error}</span>}
    </span>
  );
}
