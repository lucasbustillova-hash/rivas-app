"use client";

import { useState } from "react";
import { BlobWriter, TextReader, ZipWriter, configure } from "@zip.js/zip.js";
import { createClient } from "@/lib/supabase/client";
import { campo, etiqueta } from "@/lib/estilos";
import { MINIMO_CONTRASENA } from "@/lib/respaldo";
import { tinCompleto } from "@/lib/subs";
import type { Fila1099 } from "./datos";

configure({ useWebWorkers: false });

// Una celda de CSV: entre comillas, y sin que Excel la tome como fórmula.
function celda(valor: string | number | null) {
  let t = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

// Descarga una planilla para el contador (CSV, se abre con Excel) dentro de un .zip con contraseña,
// porque trae el SSN/EIN completo.
export function ExportarContador({ anio, filas }: { anio: number; filas: Fila1099[] }) {
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const exportar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setListo(false);
    if (contrasena.length < MINIMO_CONTRASENA) {
      setError(`La contraseña tiene que tener al menos ${MINIMO_CONTRASENA} caracteres.`);
      return;
    }
    if (contrasena !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setTrabajando(true);
    try {
      const supabase = createClient();
      const lineas = [
        [
          "Nombre legal",
          "Nombre",
          "Tipo",
          "Tipo de número",
          "SSN / EIN",
          "Dirección",
          "Teléfono",
          "Correo",
          `Total pagado ${anio} (USD)`,
          "W-9",
          "Datos que faltan",
        ]
          .map(celda)
          .join(","),
      ];
      for (const f of filas) {
        let tin = "";
        if (f.tinUltimos4) {
          const { data, error: e } = await supabase.rpc("ver_tin", { p_sub: f.id });
          if (e || typeof data !== "string") throw new Error("No se pudo leer un SSN/EIN. ¿Tu usuario es administrador?");
          tin = tinCompleto(f.tinTipo, data);
        }
        lineas.push(
          [
            f.nombreLegal,
            f.nombre,
            f.tipo === "llc" ? "LLC / empresa" : "Persona",
            f.tinTipo ? f.tinTipo.toUpperCase() : "",
            tin,
            f.direccion,
            f.telefono,
            f.correo,
            f.total.toFixed(2),
            f.w9 ? "Sí" : "No",
            f.faltan.join(", "),
          ]
            .map(celda)
            .join(","),
        );
      }
      // El BOM al principio hace que Excel lea bien los acentos.
      const csv = "﻿" + lineas.join("\r\n") + "\r\n";

      const zip = new ZipWriter(new BlobWriter("application/zip"), { password: contrasena, encryptionStrength: 3 });
      await zip.add(`1099-NEC-${anio}.csv`, new TextReader(csv));
      const archivo = await zip.close();

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `1099-NEC-${anio}-NAHOMY.zip`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setListo(true);
      setContrasena("");
      setRepetida("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el archivo. Probá de nuevo.");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <form onSubmit={exportar} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Exportar para el contador</h2>
      <p className="text-sm text-texto-suave">
        Una planilla que se abre con Excel, con los subs de arriba y todos sus datos, <strong className="text-tinta">SSN/EIN
        completo incluido</strong>. Por eso va en un archivo con contraseña: pasásela al contador por otro medio (por
        ejemplo, por teléfono).
      </p>
      <label className={etiqueta}>
        Contraseña del archivo
        <input
          id="exportar-contrasena"
          type="password"
          autoComplete="new-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className={campo}
        />
        <span className="text-xs font-normal text-texto-suave">Al menos {MINIMO_CONTRASENA} caracteres.</span>
      </label>
      <label className={etiqueta}>
        Repetir la contraseña
        <input
          id="exportar-repetida"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          className={campo}
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {listo && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <strong>Listo.</strong> Para abrirlo hace falta 7-Zip (Windows) o Keka (Mac), y adentro está la planilla para Excel.
        </p>
      )}
      <button
        type="submit"
        disabled={trabajando}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {trabajando ? "Armando el archivo…" : `Descargar planilla ${anio}`}
      </button>
    </form>
  );
}
