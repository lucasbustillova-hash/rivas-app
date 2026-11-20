"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dinero } from "@/lib/cobros";
import { textoDias } from "@/lib/mano-de-obra";
import { diasSeguidos, tituloDia } from "@/lib/agenda";
import { campo, etiqueta } from "@/lib/estilos";
import { agregarDias } from "./acciones";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SEMANA = ["D", "L", "M", "M", "J", "V", "S"];

const dos = (n: number) => String(n).padStart(2, "0");
const clave = (a: number, m: number, d: number) => `${a}-${dos(m + 1)}-${dos(d)}`;

function hoy() {
  const d = new Date();
  return clave(d.getFullYear(), d.getMonth(), d.getDate());
}

// Calendario para marcar los días trabajados. Un toque: día completo; otro: medio día; otro: se quita.
export function CalendarioDias({
  asignacionId,
  tarifa,
  registrados,
}: {
  asignacionId: string;
  tarifa: number;
  registrados: { fecha: string; fraccion: number }[];
}) {
  const router = useRouter();
  const ahora = new Date();
  const [mes, setMes] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
  const [marcados, setMarcados] = useState<Map<string, number>>(new Map());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [varios, setVarios] = useState(false);

  const yaCargados = new Map(registrados.map((r) => [r.fecha, Number(r.fraccion)]));
  const primerDia = new Date(mes.anio, mes.mes, 1).getDay();
  const diasDelMes = new Date(mes.anio, mes.mes + 1, 0).getDate();
  const hoyClave = hoy();

  const tocar = (fecha: string) => {
    setError(null);
    setMarcados((actual) => {
      const nuevo = new Map(actual);
      const antes = nuevo.get(fecha) ?? yaCargados.get(fecha);
      // Ciclo: nada → completo → medio → nada (si ya estaba cargado, vuelve a como estaba).
      if (!nuevo.has(fecha)) nuevo.set(fecha, antes === 1 ? 0.5 : antes === 0.5 ? 0 : 1);
      else if (nuevo.get(fecha) === 1) nuevo.set(fecha, 0.5);
      else if (nuevo.get(fecha) === 0.5) nuevo.set(fecha, 0);
      else nuevo.set(fecha, 1);
      if (nuevo.get(fecha) === (yaCargados.get(fecha) ?? 0)) nuevo.delete(fecha);
      return nuevo;
    });
  };

  const nuevos = [...marcados.entries()].filter(([, f]) => f > 0);
  const quitados = [...marcados.entries()].filter(([, f]) => f === 0).length;
  const cantidad = nuevos.reduce((t, [, f]) => t + f, 0);

  const guardar = async () => {
    if (quitados > 0) {
      setError("Para quitar un día ya cargado, borralo en la lista de abajo.");
      return;
    }
    setGuardando(true);
    const r = await agregarDias(
      asignacionId,
      nuevos.map(([fecha, fraccion]) => ({ fecha, fraccion })),
    );
    setGuardando(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setMarcados(new Map());
    router.refresh();
  };

  // "Poner la cantidad de días": marca en el calendario N días seguidos desde una fecha.
  // Quedan en naranja (sin guardar) para revisarlos antes de tocar Guardar.
  const marcarVarios = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const desde = String(datos.get("desde") ?? "");
    const cantidad = Number(datos.get("cantidad"));
    const fraccion = datos.get("fraccion") === "0.5" ? 0.5 : 1;
    const fechas = diasSeguidos(desde, cantidad, datos.get("sin_domingos") === "si");
    if (!fechas) {
      setError("Revisá la fecha y la cantidad de días (de 1 a 62).");
      return;
    }
    const ultimo = fechas[fechas.length - 1];
    if (ultimo > hoyClave) {
      setError(`Con esa cantidad llega hasta el ${tituloDia(ultimo).toLowerCase()}, que todavía no pasó.`);
      return;
    }
    setError(null);
    setMarcados((actual) => {
      const nuevo = new Map(actual);
      for (const f of fechas) {
        if (yaCargados.get(f) === fraccion) nuevo.delete(f);
        else nuevo.set(f, fraccion);
      }
      return nuevo;
    });
    const [a, m] = desde.split("-").map(Number);
    setMes({ anio: a, mes: m - 1 });
    setVarios(false);
  };

  const moverMes = (delta: number) =>
    setMes((m) => {
      const d = new Date(m.anio, m.mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => moverMes(-1)} aria-label="Mes anterior" className="size-11 rounded-full text-xl">
          ‹
        </button>
        <h2 className="font-semibold capitalize">
          {MESES[mes.mes]} {mes.anio}
        </h2>
        <button type="button" onClick={() => moverMes(1)} aria-label="Mes siguiente" className="size-11 rounded-full text-xl">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-texto-suave">
        {SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primerDia }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const fecha = clave(mes.anio, mes.mes, i + 1);
          const valor = marcados.get(fecha) ?? yaCargados.get(fecha) ?? 0;
          const cambiado = marcados.has(fecha);
          const futuro = fecha > hoyClave;
          return (
            <button
              key={fecha}
              type="button"
              disabled={futuro}
              onClick={() => tocar(fecha)}
              aria-label={`${i + 1} de ${MESES[mes.mes]}: ${valor === 1 ? "día completo" : valor === 0.5 ? "medio día" : "sin trabajo"}`}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg text-sm font-semibold tabular-nums disabled:opacity-30 ${
                valor === 1
                  ? cambiado
                    ? "bg-obra text-white"
                    : "bg-tinta text-white"
                  : valor === 0.5
                    ? cambiado
                      ? "bg-[linear-gradient(135deg,var(--color-obra)_50%,var(--color-piedra)_50%)] text-tinta"
                      : "bg-[linear-gradient(135deg,var(--color-tinta)_50%,var(--color-piedra)_50%)] text-tinta"
                    : `bg-piedra ${cambiado ? "line-through ring-2 ring-red-400" : ""}`
              } ${fecha === hoyClave ? "outline-2 outline-offset-1 outline-obra" : ""}`}
            >
              <span className={valor === 0.5 ? "rounded bg-white/80 px-1" : ""}>{i + 1}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-texto-suave">
        Un toque: día completo · dos toques: medio día · tres: se quita. Negro = ya cargado; naranja = nuevo.
      </p>

      {varios ? (
        <form onSubmit={marcarVarios} className="flex flex-col gap-3 rounded-xl border border-borde p-3">
          <h3 className="text-sm font-semibold">Poner la cantidad de días</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className={etiqueta}>
              Desde
              <input type="date" name="desde" required defaultValue={hoyClave} max={hoyClave} className={campo} />
            </label>
            <label className={etiqueta}>
              Cuántos días
              <input type="number" name="cantidad" required min={1} max={62} step={1} inputMode="numeric" defaultValue={5} className={campo} />
            </label>
          </div>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Cada día es</legend>
            {[
              { valor: "1", nombre: "Días completos" },
              { valor: "0.5", nombre: "Medios días" },
            ].map((o) => (
              <label
                key={o.valor}
                className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-borde text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
              >
                <input type="radio" name="fraccion" value={o.valor} defaultChecked={o.valor === "1"} className="sr-only" />
                {o.nombre}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sin_domingos" value="si" defaultChecked className="h-5 w-5 accent-obra" />
            Saltear domingos
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setVarios(false)} className="h-11 rounded-xl border border-borde font-semibold">
              Cancelar
            </button>
            <button type="submit" className="h-11 rounded-xl bg-tinta font-semibold text-white">
              Marcar en el calendario
            </button>
          </div>
          <p className="text-xs text-texto-suave">Quedan marcados en naranja: revisalos y después tocá Guardar.</p>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setVarios(true);
          }}
          className="h-11 rounded-xl border border-borde text-sm font-semibold"
        >
          O poner la cantidad de días
        </button>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {nuevos.length > 0 && (
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
        >
          {guardando ? "Guardando…" : `Guardar ${textoDias(cantidad)} · ${dinero(Math.round(cantidad * tarifa * 100) / 100)}`}
        </button>
      )}
    </section>
  );
}
