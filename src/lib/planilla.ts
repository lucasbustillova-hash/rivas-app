// Planillas .csv para Excel (las usan las exportaciones para el contador).

export type Celda = string | number | null;

// Una celda de CSV: entre comillas, y sin que Excel la tome como fórmula.
export function celda(valor: Celda) {
  let t = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

// El BOM al principio hace que Excel lea bien los acentos.
export const csv = (filas: Celda[][]) => "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";

// fecha "2026-03-15" → "03/15/2026", como la usan el banco y los contadores en EE. UU.
export const fechaUS = (f: string) => `${f.slice(5, 7)}/${f.slice(8, 10)}/${f.slice(0, 4)}`;

// Baja un archivo armado en el navegador.
export function descargar(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
