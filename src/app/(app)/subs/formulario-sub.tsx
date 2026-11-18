"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { guardarSub, type EstadoFormulario } from "./acciones";
import { campo, etiqueta } from "@/lib/estilos";
import { OFICIOS, tinOculto, type Sub, type SubPrivado } from "@/lib/subs";

type Props = {
  sub?: Sub;
  privado?: SubPrivado | null;
  // Solo los administradores ven y cargan impuestos y tarifa.
  admin: boolean;
};

export function FormularioSub({ sub, privado, admin }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarSub, { error: null });
  const volver = sub ? `/subs/${sub.id}` : "/subs";
  const tinActual = tinOculto(privado?.tin_tipo ?? null, privado?.tin_ultimos4 ?? null);

  return (
    <form
      // Se envía a mano para que el formulario no se vacíe si hay un error.
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      {sub && <input type="hidden" name="id" value={sub.id} />}

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Contacto</h2>
        <label className={etiqueta}>
          Nombre
          <input name="nombre" required defaultValue={sub?.nombre} autoComplete="off" className={campo} />
        </label>
        <label className={etiqueta}>
          Oficio
          <input name="oficio" list="oficios" defaultValue={sub?.oficio ?? ""} placeholder="Elegí o escribí" className={campo} />
          <datalist id="oficios">
            {OFICIOS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        <label className={etiqueta}>
          Teléfono
          <input name="telefono" type="tel" defaultValue={sub?.telefono ?? ""} autoComplete="off" className={campo} />
        </label>
        <label className={etiqueta}>
          Correo
          <input name="correo" type="email" defaultValue={sub?.correo ?? ""} autoComplete="off" className={campo} />
        </label>
        <label className={etiqueta}>
          Dirección
          <input name="direccion" defaultValue={sub?.direccion ?? ""} autoComplete="off" className={campo} />
        </label>
        <label className={etiqueta}>
          Notas
          <textarea name="notas" rows={2} defaultValue={sub?.notas ?? ""} className={campo} />
        </label>
        {sub && (
          <label className={etiqueta}>
            ¿Sigue trabajando con ustedes?
            <select name="activo" defaultValue={sub.activo ? "si" : "no"} className={campo}>
              <option value="si">Sí, activo</option>
              <option value="no">No, inactivo</option>
            </select>
          </label>
        )}
      </section>

      {admin && (
        <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Pago e impuestos</h2>
            <span className="text-xs text-texto-suave">Solo administradores</span>
          </div>
          <label className={etiqueta}>
            Tarifa diaria (USD)
            <input
              name="tarifa_diaria"
              inputMode="decimal"
              defaultValue={privado?.tarifa_diaria ?? ""}
              placeholder="Ej.: 200"
              className={campo}
            />
          </label>
          <label className={etiqueta}>
            Nombre legal (como figura en el W-9)
            <input name="nombre_legal" defaultValue={privado?.nombre_legal ?? ""} autoComplete="off" className={campo} />
          </label>
          <label className={etiqueta}>
            Tipo
            <select name="tipo" defaultValue={privado?.tipo ?? "persona"} className={campo}>
              <option value="persona">Persona</option>
              <option value="llc">LLC / empresa</option>
            </select>
          </label>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <label className={etiqueta}>
              Número
              <select name="tin_tipo" defaultValue={privado?.tin_tipo ?? "ssn"} className={campo}>
                <option value="ssn">SSN</option>
                <option value="ein">EIN</option>
              </select>
            </label>
            <label className={etiqueta}>
              {tinActual ? "Cambiar número" : "9 dígitos"}
              <input
                name="tin"
                inputMode="numeric"
                autoComplete="off"
                placeholder={tinActual ?? "Opcional"}
                className={campo}
              />
            </label>
          </div>
          <p className="text-xs text-texto-suave">
            Se guarda encriptado. {tinActual ? "Dejalo vacío para no cambiarlo." : ""}
          </p>
        </section>
      )}

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {estado.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href={volver} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-borde bg-white font-semibold">
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={guardando}
          className="h-12 flex-[2] rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
