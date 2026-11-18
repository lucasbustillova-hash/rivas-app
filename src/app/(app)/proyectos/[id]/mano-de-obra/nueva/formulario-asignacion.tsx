"use client";

import { startTransition, useActionState, useState } from "react";
import { campo, etiqueta } from "@/lib/estilos";
import { crearAsignacionDia, type EstadoFormulario } from "../acciones";

type Opcion = { id: string; nombre: string; oficio: string | null; tarifa: number | null };

export function FormularioAsignacion({ proyectoId, subs }: { proyectoId: string; subs: Opcion[] }) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(
    crearAsignacionDia.bind(null, proyectoId),
    { error: null },
  );
  const [subId, setSubId] = useState("");
  const [tarifa, setTarifa] = useState("");

  const elegir = (id: string) => {
    setSubId(id);
    const t = subs.find((s) => s.id === id)?.tarifa;
    setTarifa(t != null ? String(t) : "");
  };

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
          Subcontratista
          <select name="subcontratista_id" required value={subId} onChange={(e) => elegir(e.target.value)} className={campo}>
            <option value="" disabled>
              Elegí uno
            </option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
                {s.oficio ? ` · ${s.oficio}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          Tarifa por día en este proyecto (USD)
          <input
            name="tarifa_diaria"
            inputMode="decimal"
            required
            placeholder="Ej.: 220"
            value={tarifa}
            onChange={(e) => setTarifa(e.target.value)}
            className={campo}
          />
          <span className="text-xs font-normal text-texto-suave">Viene de la ficha del sub; se puede cambiar solo para este proyecto.</span>
        </label>
        <label className={etiqueta}>
          Qué hace (opcional)
          <input name="descripcion" maxLength={200} placeholder="Ej.: ayudante de drywall" className={campo} />
        </label>
      </section>
      {estado.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{estado.error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Seguir: marcar los días"}
      </button>
    </form>
  );
}
