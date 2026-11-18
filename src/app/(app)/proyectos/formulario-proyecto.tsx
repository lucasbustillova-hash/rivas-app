"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { guardarProyecto, type EstadoFormulario } from "./acciones";
import { ESTADOS, TIPOS_TRABAJO, type Cliente, type Proyecto } from "@/lib/proyectos";

const campo =
  "w-full rounded-xl border border-borde bg-white px-3.5 py-3 text-base text-tinta outline-none focus:border-obra focus:ring-2 focus:ring-obra/20";
const etiqueta = "flex flex-col gap-1.5 text-sm font-medium";

type Props = {
  // Edición: el proyecto y su cliente. Nuevo: la lista de clientes para elegir.
  proyecto?: Proyecto;
  cliente?: Cliente;
  clientes?: Pick<Cliente, "id" | "nombre">[];
};

export function FormularioProyecto({ proyecto, cliente, clientes = [] }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarProyecto, { error: null });
  const [clienteId, setClienteId] = useState("nuevo");
  const mostrarCliente = Boolean(proyecto) || clienteId === "nuevo";
  const volver = proyecto ? `/proyectos/${proyecto.id}` : "/";

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
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Proyecto</h2>
        <label className={etiqueta}>
          Nombre
          <input name="nombre" required defaultValue={proyecto?.nombre} placeholder="Ej.: Remodelación de cocina" className={campo} />
        </label>
        <label className={etiqueta}>
          Tipo de trabajo
          <input
            name="tipo_trabajo"
            required
            list="tipos-trabajo"
            defaultValue={proyecto?.tipo_trabajo}
            placeholder="Elegí o escribí"
            className={campo}
          />
          <datalist id="tipos-trabajo">
            {TIPOS_TRABAJO.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className={etiqueta}>
          Estado
          <select name="estado" defaultValue={proyecto?.estado ?? "estimado"} className={campo}>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>
            Inicio
            <input type="date" name="fecha_inicio" defaultValue={proyecto?.fecha_inicio ?? ""} className={campo} />
          </label>
          <label className={etiqueta}>
            Fin estimado
            <input type="date" name="fecha_fin_estimada" defaultValue={proyecto?.fecha_fin_estimada ?? ""} className={campo} />
          </label>
        </div>
        <label className={etiqueta}>
          Dirección de la obra
          <input name="direccion_obra" defaultValue={proyecto?.direccion_obra ?? ""} autoComplete="street-address" className={campo} />
        </label>
        <label className={etiqueta}>
          Alcance
          <textarea name="alcance" rows={3} defaultValue={proyecto?.alcance ?? ""} placeholder="Qué se va a hacer" className={campo} />
        </label>
        <label className={etiqueta}>
          Notas
          <textarea name="notas" rows={2} defaultValue={proyecto?.notas ?? ""} className={campo} />
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Cliente</h2>
        {!proyecto && clientes.length > 0 && (
          <label className={etiqueta}>
            ¿Qué cliente?
            <select name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={campo}>
              <option value="nuevo">Cliente nuevo</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {mostrarCliente && (
          <>
            <label className={etiqueta}>
              Nombre
              <input name="cliente_nombre" required defaultValue={cliente?.nombre} autoComplete="off" className={campo} />
            </label>
            <label className={etiqueta}>
              Teléfono
              <input name="cliente_telefono" type="tel" defaultValue={cliente?.telefono ?? ""} autoComplete="off" className={campo} />
            </label>
            <label className={etiqueta}>
              Correo
              <input name="cliente_correo" type="email" defaultValue={cliente?.correo ?? ""} autoComplete="off" className={campo} />
            </label>
            <label className={etiqueta}>
              Dirección
              <input name="cliente_direccion" defaultValue={cliente?.direccion ?? ""} autoComplete="off" className={campo} />
            </label>
            <label className={etiqueta}>
              Notas del cliente
              <textarea name="cliente_notas" rows={2} defaultValue={cliente?.notas ?? ""} className={campo} />
            </label>
          </>
        )}
      </section>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {estado.error}
        </p>
      )}

      <div className="flex gap-3 pb-[env(safe-area-inset-bottom)]">
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
