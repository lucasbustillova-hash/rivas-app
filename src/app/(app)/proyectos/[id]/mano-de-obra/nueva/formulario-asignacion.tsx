"use client";

import { startTransition, useActionState, useState } from "react";
import { campo, etiqueta } from "@/lib/estilos";
import type { Modalidad } from "@/lib/mano-de-obra";
import { crearAsignacionContrato, crearAsignacionDia, type EstadoFormulario } from "../acciones";

type Opcion = { id: string; nombre: string; oficio: string | null; tarifa: number | null };

// Sumar un sub al proyecto: por día (con tarifa) o por contrato (tarea con monto cerrado).
export function FormularioAsignacion({
  proyectoId,
  subs,
  modalidadInicial,
}: {
  proyectoId: string;
  subs: Opcion[];
  modalidadInicial: Modalidad;
}) {
  const [estadoDia, accionDia, guardandoDia] = useActionState<EstadoFormulario, FormData>(
    crearAsignacionDia.bind(null, proyectoId),
    { error: null },
  );
  const [estadoContrato, accionContrato, guardandoContrato] = useActionState<EstadoFormulario, FormData>(
    crearAsignacionContrato.bind(null, proyectoId),
    { error: null },
  );
  const [modalidad, setModalidad] = useState<Modalidad>(modalidadInicial);
  const [subId, setSubId] = useState("");
  const [tarifa, setTarifa] = useState("");
  const porDia = modalidad === "dia";
  const error = porDia ? estadoDia.error : estadoContrato.error;
  const guardando = guardandoDia || guardandoContrato;

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
        startTransition(() => (porDia ? accionDia(datos) : accionContrato(datos)));
      }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cómo se le paga">
        {(
          [
            { valor: "dia", nombre: "Por día" },
            { valor: "contrato", nombre: "Por contrato" },
          ] as const
        ).map((m) => (
          <button
            key={m.valor}
            type="button"
            role="radio"
            aria-checked={modalidad === m.valor}
            onClick={() => setModalidad(m.valor)}
            className={`h-12 rounded-xl border font-semibold ${
              modalidad === m.valor ? "border-tinta bg-tinta text-white" : "border-borde bg-white"
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>

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

        {porDia ? (
          <>
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
              <span className="text-xs font-normal text-texto-suave">
                Viene de la ficha del sub; se puede cambiar solo para este proyecto.
              </span>
            </label>
            <label className={etiqueta}>
              Qué hace (opcional)
              <input name="descripcion" maxLength={200} placeholder="Ej.: ayudante de drywall" className={campo} />
            </label>
          </>
        ) : (
          <>
            <label className={etiqueta}>
              Tarea
              <input name="descripcion" required maxLength={200} placeholder="Ej.: colgar sheetrock" className={campo} />
            </label>
            <label className={etiqueta}>
              Monto acordado (USD)
              <input name="monto_contrato" inputMode="decimal" required placeholder="Ej.: 3200" className={campo} />
            </label>
          </>
        )}
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {guardando ? "Guardando…" : porDia ? "Seguir: marcar los días" : "Guardar contrato"}
      </button>
    </form>
  );
}
