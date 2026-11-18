"use client";

import { startTransition, useActionState, useState } from "react";
import { ETAPAS, type ArchivoProyecto } from "@/lib/fotos";
import { actualizarArchivo, borrarArchivo } from "../acciones";

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Cambiar etapa, fecha o nota, y borrar.
export function EditarArchivo({ archivo, dia }: { archivo: ArchivoProyecto; dia: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, guardar, guardando] = useActionState(actualizarArchivo.bind(null, archivo.id), {});
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const que = archivo.tipo === "video" ? "este video" : "esta foto";

  const borrar = async () => {
    if (!confirm(`¿Borrar ${que}? No se puede deshacer.`)) return;
    setBorrando(true);
    const r = await borrarArchivo(archivo.id);
    if (r?.error) {
      setErrorBorrar(r.error);
      setBorrando(false);
    }
  };

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        {estado.listo && !guardando && <p className="text-sm font-semibold text-green-800">Cambios guardados.</p>}
        {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="h-12 rounded-xl border border-borde bg-white font-semibold"
        >
          Cambiar etapa, fecha o nota
        </button>
        <button
          type="button"
          onClick={borrar}
          disabled={borrando}
          className="h-12 rounded-xl font-semibold text-red-700 disabled:opacity-60"
        >
          {borrando ? "Borrando…" : `Borrar ${que}`}
        </button>
        {errorBorrar && <p className="text-sm text-red-700">{errorBorrar}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => {
          guardar(datos);
          setAbierto(false);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="hoy" value={hoyLocal()} />
      <fieldset className="flex flex-col">
        <legend className="pb-1.5 text-sm font-medium">Etapa</legend>
        <div className="grid grid-cols-3 gap-2">
          {ETAPAS.map((e) => (
            <label
              key={e.valor}
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-borde text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
            >
              <input type="radio" name="etapa" value={e.valor} defaultChecked={archivo.etapa === e.valor} className="sr-only" />
              {e.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Fecha
        <input
          type="date"
          name="fecha"
          defaultValue={dia}
          max={hoyLocal()}
          required
          className="h-12 rounded-xl border border-borde bg-white px-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nota (opcional)
        <input
          type="text"
          name="nota"
          defaultValue={archivo.nota ?? ""}
          maxLength={500}
          placeholder="Ej.: drywall terminado"
          className="h-12 rounded-xl border border-borde bg-white px-3 text-base"
        />
      </label>
      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-12 rounded-xl border border-borde bg-white font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="h-12 rounded-xl bg-obra font-semibold text-white disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
