"use client";

import { startTransition, useActionState, useState } from "react";
import { campo, etiqueta } from "@/lib/estilos";
import { einConGuion, lineasDireccion } from "@/lib/subs";
import { guardarEmpresa, type EstadoEmpresa } from "./acciones";
import { faltanEmpresa, type Empresa } from "./datos";

const chico = "text-xs font-normal text-texto-suave";

// Datos de NAHOMY que van en cada 1099 como "pagador". Se cargan una sola vez.
export function DatosEmpresa({ empresa }: { empresa: Empresa | null }) {
  const faltan = faltanEmpresa(empresa);
  const [abierto, setAbierto] = useState(faltan.length > 0);
  const [estado, accion, guardando] = useActionState<EstadoEmpresa, FormData>(guardarEmpresa, { error: null });

  // Al guardar bien, se cierra el formulario (también si se guarda más de una vez).
  const [ultimo, setUltimo] = useState(estado);
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.listo) setAbierto(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Datos de la empresa (pagador)</h2>
        {!abierto && (
          <button type="button" onClick={() => setAbierto(true)} className="text-sm font-semibold text-obra">
            Editar
          </button>
        )}
      </div>

      {!abierto && (
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">{empresa?.nombre_legal}</span>
          {empresa?.ein && <span className="tabular-nums">EIN {einConGuion(empresa.ein)}</span>}
          {empresa && lineasDireccion(empresa).map((l) => <span key={l}>{l}</span>)}
          {empresa?.telefono && <span>{empresa.telefono}</span>}
          {estado.listo && <span className="pt-1 text-green-800">Guardado.</span>}
        </div>
      )}

      {abierto && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => accion(datos));
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-texto-suave">
            Van en cada 1099 como quien pagó. Se cargan una vez y salen en la planilla.
            {faltan.length > 0 && <> Falta: {faltan.join(", ")}.</>}
          </p>
          <label className={etiqueta}>
            <span className={chico}>Nombre legal de la empresa</span>
            <input name="nombre_legal" defaultValue={empresa?.nombre_legal ?? ""} autoComplete="off" className={campo} />
          </label>
          <label className={etiqueta}>
            <span className={chico}>EIN (9 dígitos)</span>
            <input
              name="ein"
              inputMode="numeric"
              defaultValue={empresa?.ein ? einConGuion(empresa.ein) : ""}
              placeholder="12-3456789"
              autoComplete="off"
              className={campo}
            />
          </label>
          <label className={etiqueta}>
            <span className={chico}>Calle y número</span>
            <input name="direccion" defaultValue={empresa?.direccion ?? ""} autoComplete="off" className={campo} />
          </label>
          <label className={etiqueta}>
            <span className={chico}>Ciudad</span>
            <input name="ciudad" defaultValue={empresa?.ciudad ?? ""} autoComplete="off" className={campo} />
          </label>
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <label className={etiqueta}>
              <span className={chico}>Estado</span>
              <input
                name="estado"
                defaultValue={empresa?.estado ?? ""}
                maxLength={2}
                autoCapitalize="characters"
                placeholder="FL"
                autoComplete="off"
                className={`${campo} uppercase`}
              />
            </label>
            <label className={etiqueta}>
              <span className={chico}>Código postal</span>
              <input
                name="codigo_postal"
                defaultValue={empresa?.codigo_postal ?? ""}
                inputMode="numeric"
                maxLength={10}
                autoComplete="off"
                className={campo}
              />
            </label>
          </div>
          <label className={etiqueta}>
            <span className={chico}>Teléfono</span>
            <input name="telefono" type="tel" defaultValue={empresa?.telefono ?? ""} autoComplete="off" className={campo} />
          </label>
          {estado.error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {estado.error}
            </p>
          )}
          <div className="flex gap-3">
            {faltan.length === 0 && (
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="h-12 flex-1 rounded-xl border border-borde bg-white font-semibold"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="h-12 flex-[2] rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
