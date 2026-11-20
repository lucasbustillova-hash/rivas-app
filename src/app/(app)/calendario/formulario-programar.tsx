"use client";

import { startTransition, useActionState, useState } from "react";
import { campo, etiqueta } from "@/lib/estilos";
import { programar, type EstadoProgramar } from "./acciones";

type Opcion = { id: string; nombre: string; detalle: string | null };

// Programar subs en una obra: qué obra, quiénes y qué días.
export function FormularioProgramar({
  proyectos,
  subs,
  diaInicial,
}: {
  proyectos: Opcion[];
  subs: Opcion[];
  diaInicial: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, guardando] = useActionState<EstadoProgramar, FormData>(programar, { error: null });
  const [ultimo, setUltimo] = useState(estado);
  const [desde, setDesde] = useState(diaInicial);

  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.listo) setAbierto(false);
  }

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        {estado.listo && !guardando && <p className="text-sm font-semibold text-green-800">Listo, quedó en el calendario.</p>}
        <button
          type="button"
          onClick={() => {
            setDesde(diaInicial);
            setAbierto(true);
          }}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro"
        >
          + Programar subs
        </button>
      </div>
    );
  }

  if (proyectos.length === 0 || subs.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm shadow-sm">
        <p>Para programar hace falta al menos una obra que no esté terminada y un sub activo.</p>
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-xl border border-borde font-semibold">
          Cerrar
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
      <h2 className="font-semibold">Programar subs</h2>
      <label className={etiqueta}>
        Obra
        <select name="proyecto_id" required className={campo} defaultValue="">
          <option value="" disabled>
            Elegí la obra
          </option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.detalle ? ` (${p.detalle})` : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col">
        <legend className="pb-1.5 text-sm font-medium">Quiénes van</legend>
        <div className="flex flex-wrap gap-2">
          {subs.map((s) => (
            <label
              key={s.id}
              className="flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border border-borde px-3.5 py-1 text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
            >
              <input type="checkbox" name="sub" value={s.id} className="sr-only" />
              {s.nombre}
              {s.detalle && <span className="text-xs font-normal opacity-75">{s.detalle}</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <label className={etiqueta}>
          Desde
          <input type="date" name="desde" required value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>
        <label className={etiqueta}>
          Hasta
          <input type="date" name="hasta" required key={desde} defaultValue={desde} min={desde} className={campo} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sin_domingos" value="si" defaultChecked className="h-5 w-5 accent-obra" />
        Saltear domingos
      </label>
      <label className={etiqueta}>
        Nota (opcional)
        <input name="nota" maxLength={200} placeholder="Ej.: llevar la escalera grande" className={campo} />
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
          {guardando ? "Guardando…" : "Programar"}
        </button>
      </div>
    </form>
  );
}
