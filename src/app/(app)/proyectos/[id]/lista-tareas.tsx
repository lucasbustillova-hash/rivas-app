"use client";

import { useOptimistic, useState, useTransition } from "react";
import { agregarTarea, borrarTarea, marcarTarea } from "./tareas-acciones";

export type Tarea = { id: string; texto: string; hecha: boolean };

type Cambio =
  | { tipo: "agregar"; tarea: Tarea }
  | { tipo: "marcar"; id: string; hecha: boolean }
  | { tipo: "borrar"; id: string };

// Pendientes de la obra: se agregan, se tachan y se borran. Responde al toque, sin esperar al servidor.
export function ListaTareas({ proyectoId, tareas }: { proyectoId: string; tareas: Tarea[] }) {
  const [lista, aplicar] = useOptimistic(tareas, (actual: Tarea[], c: Cambio) => {
    if (c.tipo === "agregar") return [...actual, c.tarea];
    if (c.tipo === "marcar") return actual.map((t) => (t.id === c.id ? { ...t, hecha: c.hecha } : t));
    return actual.filter((t) => t.id !== c.id);
  });
  const [, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cambiar = (cambio: Cambio, accion: () => Promise<{ error?: string }>, siFalla?: () => void) =>
    startTransition(async () => {
      aplicar(cambio);
      const r = await accion();
      setError(r.error ?? null);
      if (r.error) siFalla?.();
    });

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    cambiar(
      { tipo: "agregar", tarea: { id: `nueva-${Date.now()}`, texto: t, hecha: false } },
      () => agregarTarea(proyectoId, t),
      () => setTexto(t),
    );
  };

  const pendientes = lista.filter((t) => !t.hecha);
  const hechas = lista.filter((t) => t.hecha);

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Pendientes de la obra</h2>
        {pendientes.length > 0 && <span className="text-sm text-texto-suave">{pendientes.length} por hacer</span>}
      </div>

      {pendientes.length === 0 && <p className="text-sm text-texto-suave">No hay nada pendiente.</p>}
      <ul className="flex flex-col">
        {pendientes.map((t) => (
          <li key={t.id} className="border-t border-stone-100 first:border-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={false}
              disabled={t.id.startsWith("nueva-")}
              onClick={() => cambiar({ tipo: "marcar", id: t.id, hecha: true }, () => marcarTarea(t.id, true))}
              className="flex min-h-11 w-full items-center gap-3 py-1.5 text-left text-sm"
            >
              <span aria-hidden="true" className="size-5.5 shrink-0 rounded-full border-2 border-stone-400" />
              <span className="min-w-0 break-words">{t.texto}</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={200}
          enterKeyHint="done"
          aria-label="Nueva tarea"
          placeholder="Ej.: comprar lechada gris"
          className="h-11 min-w-0 flex-1 rounded-xl border border-borde px-3.5 text-base outline-none focus:border-obra focus:ring-2 focus:ring-obra/20"
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl bg-obra px-4 font-semibold text-white active:bg-obra-oscuro">
          Agregar
        </button>
      </form>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {hechas.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-texto-suave">
            <span className="pr-1.5 transition group-open:rotate-90">›</span>
            Hechas ({hechas.length})
          </summary>
          <ul className="flex flex-col">
            {hechas.map((t) => (
              <li key={t.id} className="flex items-center gap-2 border-t border-stone-100">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={true}
                  onClick={() => cambiar({ tipo: "marcar", id: t.id, hecha: false }, () => marcarTarea(t.id, false))}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-1.5 text-left text-sm text-texto-suave"
                >
                  <span aria-hidden="true" className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs text-white">
                    ✓
                  </span>
                  <span className="min-w-0 break-words line-through">{t.texto}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Borrar “${t.texto}”`}
                  onClick={() => {
                    if (confirm(`¿Borrar “${t.texto}”?`)) cambiar({ tipo: "borrar", id: t.id }, () => borrarTarea(t.id));
                  }}
                  className="flex size-11 shrink-0 items-center justify-center text-lg text-texto-suave"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
