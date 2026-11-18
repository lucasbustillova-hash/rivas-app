"use client";

import { useState } from "react";

// Borra algo cargado por error (un pago, un día…). Pide confirmación.
export function BorrarPago({
  borrar: borrarAccion,
  texto,
  etiqueta = "Borrar",
}: {
  borrar: () => Promise<{ error?: string } | undefined>;
  texto: string;
  etiqueta?: string;
}) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verbo = etiqueta === "Borrar" ? "Borrar" : "Quitar";

  const borrar = async () => {
    if (!confirm(`¿${verbo} ${texto}? No se puede deshacer.`)) return;
    setBorrando(true);
    const r = await borrarAccion();
    if (r?.error) setError(r.error);
    setBorrando(false);
  };

  return (
    <span className="flex flex-col items-end">
      <button type="button" onClick={borrar} disabled={borrando} className="text-xs font-semibold text-red-700 disabled:opacity-60">
        {borrando ? "Borrando…" : etiqueta}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
