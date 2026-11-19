"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { campo, etiqueta } from "@/lib/estilos";
import { MINIMO_CONTRASENA, armarRespaldo, type Progreso } from "@/lib/respaldo";

function tamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fechaLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pide la contraseña, arma el respaldo en el navegador y lo descarga.
export function DescargarRespaldo() {
  const router = useRouter();
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  const descargar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setListo(null);
    if (contrasena.length < MINIMO_CONTRASENA) {
      setError(`La contraseña tiene que tener al menos ${MINIMO_CONTRASENA} caracteres.`);
      return;
    }
    if (contrasena !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    const supabase = createClient();
    try {
      setProgreso({ paso: "Empezando" });
      const { archivo, resumen } = await armarRespaldo(supabase, contrasena, setProgreso);

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `respaldo-nahomy-${fechaLocal()}.zip`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      await supabase.from("respaldos").insert({ archivos: resumen.archivos, bytes: archivo.size });
      const faltan = resumen.archivos_faltantes.length;
      setListo(
        `Listo: ${tamano(archivo.size)}, ${resumen.archivos} archivos.` +
          (faltan ? ` Atención: ${faltan} archivo(s) no se pudieron copiar.` : ""),
      );
      setContrasena("");
      setRepetida("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el respaldo. Revisá la conexión y probá de nuevo.");
    } finally {
      setProgreso(null);
    }
  };

  return (
    <form onSubmit={descargar} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Descargar respaldo</h2>
      <p className="text-sm text-texto-suave">
        Baja un archivo con todo: proyectos, clientes, pagos, subs, días, fotos, W-9 y acuerdos. Queda protegido con la
        contraseña que elijas. <strong className="text-tinta">Si la olvidás, no hay forma de abrirlo.</strong>
      </p>
      <label className={etiqueta}>
        Contraseña del respaldo
        <input
          id="respaldo-contrasena"
          type="password"
          autoComplete="new-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className={campo}
        />
        <span className="text-xs font-normal text-texto-suave">
          Al menos {MINIMO_CONTRASENA} caracteres. Guardala en un gestor de contraseñas.
        </span>
      </label>
      <label className={etiqueta}>
        Repetir la contraseña
        <input
          id="respaldo-repetida"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          className={campo}
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {listo && <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{listo}</p>}
      <button
        type="submit"
        disabled={progreso !== null}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {progreso
          ? `${progreso.paso}${progreso.total ? ` (${(progreso.hechos ?? 0) + 1} de ${progreso.total})` : ""}…`
          : "Descargar respaldo"}
      </button>
      <p className="text-xs text-texto-suave">
        Con muchas fotos y videos conviene hacerlo desde una computadora. No cierres la pantalla hasta que termine.
      </p>
    </form>
  );
}
