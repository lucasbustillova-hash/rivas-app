"use client";

import { useState } from "react";
import { campo, etiqueta } from "@/lib/estilos";
import { comprobarRespaldo, type Progreso, type Resumen } from "@/lib/respaldo";

const NOMBRES: Record<string, string> = {
  clientes: "Clientes",
  proyectos: "Proyectos",
  archivos_proyecto: "Fotos y videos (registros)",
  contratos_cliente: "Contratos de clientes",
  cuotas_cliente: "Partes de los planes de pago",
  pagos_cliente: "Pagos de clientes",
  subcontratistas: "Subcontratistas",
  subcontratistas_privado: "Datos para la 1099",
  asignaciones: "Subs en proyectos",
  dias_trabajados: "Días trabajados",
  pagos_sub: "Pagos a subs",
};

// Abre un respaldo con su contraseña y muestra qué tiene, para saber que sirve.
export function ComprobarRespaldo() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resumen | null>(null);

  const comprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultado(null);
    if (!archivo) {
      setError("Elegí el archivo del respaldo.");
      return;
    }
    try {
      setProgreso({ paso: "Abriendo" });
      const { resumen } = await comprobarRespaldo(archivo, contrasena, setProgreso);
      setResultado(resumen);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "";
      setError(
        /password|contraseña/i.test(mensaje)
          ? "La contraseña no es correcta."
          : mensaje || "No se pudo abrir el archivo: puede estar dañado.",
      );
    } finally {
      setProgreso(null);
    }
  };

  return (
    <form onSubmit={comprobar} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Comprobar un respaldo</h2>
      <p className="text-sm text-texto-suave">
        Elegí un respaldo descargado y escribí su contraseña. La app lo abre y revisa que todo se pueda leer. No cambia
        nada de los datos actuales.
      </p>
      <label className={etiqueta}>
        Archivo
        <input
          id="comprobar-archivo"
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <label className={etiqueta}>
        Contraseña
        <input
          id="comprobar-contrasena"
          type="password"
          autoComplete="off"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className={campo}
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {resultado && (
        <div className="flex flex-col gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">
            El respaldo está bien. Se creó el{" "}
            {new Intl.DateTimeFormat("es-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }).format(
              new Date(resultado.creado_en),
            )}
          </p>
          <ul className="flex flex-col gap-0.5 tabular-nums">
            {Object.entries(resultado.tablas).map(([tabla, n]) => (
              <li key={tabla} className="flex justify-between gap-3">
                <span>{NOMBRES[tabla] ?? tabla}</span>
                <span>{n}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-green-200 pt-1 font-semibold">
              <span>Fotos, videos y documentos</span>
              <span>{resultado.archivos}</span>
            </li>
          </ul>
          {resultado.archivos_faltantes.length > 0 && (
            <p className="text-amber-800">
              Cuando se hizo, {resultado.archivos_faltantes.length} archivo(s) no se pudieron copiar.
            </p>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={progreso !== null}
        className="h-12 rounded-xl border border-borde bg-white font-semibold disabled:opacity-60"
      >
        {progreso
          ? `${progreso.paso}${progreso.total ? ` (${(progreso.hechos ?? 0) + 1} de ${progreso.total})` : ""}…`
          : "Comprobar"}
      </button>
    </form>
  );
}
