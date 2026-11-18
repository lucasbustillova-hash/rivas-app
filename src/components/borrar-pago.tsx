"use client";

import { useState } from "react";

// Borra un pago anotado por error (pide confirmación).
export function BorrarPago({ borrar: borrarAccion, texto }: { borrar: () => Promise<{ error?: string }>; texto: string }) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const borrar = async () => {
    if (!confirm(`¿Borrar ${texto}? No se puede deshacer.`)) return;
    setBorrando(true);
    const r = await borrarAccion();
    if (r.error) setError(r.error);
    setBorrando(false);
  };

  return (
    <span className="flex flex-col items-end">
      <button type="button" onClick={borrar} disabled={borrando} className="text-xs font-semibold text-red-700 disabled:opacity-60">
        {borrando ? "Borrando…" : "Borrar"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
