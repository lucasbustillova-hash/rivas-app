"use client";

import { useState, useTransition } from "react";
import { verTin } from "./acciones";

// SSN/EIN oculto (•••-••-1234) hasta tocar "Mostrar".
export function MostrarTin({ subId, oculto }: { subId: string; oculto: string }) {
  const [completo, setCompleto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, startTransition] = useTransition();

  const alternar = () => {
    if (completo) {
      setCompleto(null);
      return;
    }
    startTransition(async () => {
      const r = await verTin(subId);
      setError(r.error);
      setCompleto(r.tin);
    });
  };

  return (
    <span className="flex items-center justify-between gap-2">
      <span className="font-semibold tracking-wide tabular-nums">{error ?? completo ?? oculto}</span>
      <button
        type="button"
        onClick={alternar}
        disabled={cargando}
        className="min-h-9 rounded-lg border border-borde px-3 text-sm font-semibold disabled:opacity-60"
      >
        {cargando ? "…" : completo ? "Ocultar" : "Mostrar"}
      </button>
    </span>
  );
}
