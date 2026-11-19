"use client";

import { useState } from "react";
import { BlobWriter, TextReader, ZipWriter, configure } from "@zip.js/zip.js";
import { createClient } from "@/lib/supabase/client";
import { campo, etiqueta } from "@/lib/estilos";
import { MINIMO_CONTRASENA } from "@/lib/respaldo";
import { einConGuion, lineasDireccion, tinCompleto } from "@/lib/subs";
import { dinero, nombreMetodo } from "@/lib/cobros";
import { faltanEmpresa, type Empresa, type Fila1099, type PagoDetalle } from "./datos";

configure({ useWebWorkers: false });

// Una celda de CSV: entre comillas, y sin que Excel la tome como fórmula.
function celda(valor: string | number | null) {
  let t = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

// El BOM al principio hace que Excel lea bien los acentos.
const csv = (filas: (string | number | null)[][]) => "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";

// fecha "2026-03-15" → "03/15/2026", como la usan el banco y los contadores en EE. UU.
const fechaUS = (f: string) => `${f.slice(5, 7)}/${f.slice(8, 10)}/${f.slice(0, 4)}`;

type Props = {
  anio: number;
  minimo: number;
  empresa: Empresa | null;
  necesitan: Fila1099[];
  todos: Fila1099[];
  detalle: PagoDetalle[];
};

// Planilla general para cualquier contador: un resumen con lo que va en cada 1099-NEC
// y el detalle de cada pago del año. Va en un .zip con contraseña porque trae el SSN/EIN completo.
export function ExportarContador({ anio, minimo, empresa, necesitan, todos, detalle }: Props) {
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const faltaEmpresa = faltanEmpresa(empresa);

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

      // 1) Resumen: una fila por sub que necesita 1099-NEC.
      const resumen: (string | number | null)[][] = [
        [
          "Nombre legal (Recipient name)",
          "Nombre en la app",
          "Tipo (Entity type)",
          "Tipo de número (TIN type)",
          "SSN / EIN (Recipient TIN)",
          "Calle (Street address)",
          "Ciudad (City)",
          "Estado (State)",
          "Código postal (ZIP)",
          "Teléfono (Phone)",
          "Correo (Email)",
          `Box 1: total pagado ${anio} (Nonemployee compensation)`,
          "Pagado con tarjeta, no va (Paid by card, excluded)",
          "W-9 firmado (W-9 on file)",
          "Datos que faltan",
        ],
      ];
      for (const f of necesitan) {
        let tin = "";
        if (f.tinUltimos4) {
          const { data, error: e } = await supabase.rpc("ver_tin", { p_sub: f.id });
          if (e || typeof data !== "string") throw new Error("No se pudo leer un SSN/EIN. ¿Tu usuario es administrador?");
          tin = tinCompleto(f.tinTipo, data);
        }
        resumen.push([
          f.nombreLegal,
          f.nombre,
          f.tipo === "llc" ? "LLC / empresa" : "Persona",
          f.tinTipo ? f.tinTipo.toUpperCase() : "",
          tin,
          f.direccion,
          f.ciudad,
          f.estado,
          f.codigoPostal,
          f.telefono,
          f.correo,
          f.total.toFixed(2),
          f.conTarjeta.toFixed(2),
          f.w9 ? "Sí" : "No",
          f.faltan.join(", "),
        ]);
      }

      // 2) Detalle: cada pago del año a cualquier sub, para el registro propio y para cruzar con el banco.
      const subDe = new Map(todos.map((f) => [f.id, f]));
      const pagos: (string | number | null)[][] = [
        [
          "Fecha (Date)",
          "Nombre legal (Recipient name)",
          "Nombre en la app",
          "Proyecto (Project)",
          "Tipo de trabajo",
          "Método (Method)",
          "Monto (Amount)",
          "Va en la 1099-NEC",
          "Nota",
        ],
      ];
      for (const p of detalle) {
        const sub = subDe.get(p.subId);
        const tipo = p.modalidad === "dia" ? "Por día" : p.esAdelanto ? "Contrato: adelanto" : "Contrato: pago";
        pagos.push([
          fechaUS(p.fecha),
          sub?.nombreLegal ?? "",
          sub?.nombre ?? "",
          p.proyecto,
          tipo,
          nombreMetodo(p.metodo),
          p.monto.toFixed(2),
          p.metodo === "tarjeta" ? "No (tarjeta: va en la 1099-K)" : "Sí",
          p.nota,
        ]);
      }

      const pagador = empresa
        ? [empresa.nombre_legal, empresa.ein ? `EIN ${einConGuion(empresa.ein)}` : null, ...lineasDireccion(empresa), empresa.telefono]
            .filter(Boolean)
            .join("\r\n")
        : "";
      const leeme = [
        `Pagos a subcontratistas ${anio} — planilla para la 1099-NEC`,
        `Armada con la app de NAHOMY Pro el ${new Date().toLocaleDateString("en-US")}.`,
        "",
        "PAGADOR (Payer)",
        pagador || "(faltan los datos de la empresa: se cargan en la app, en el Reporte 1099)",
        "",
        "ARCHIVOS",
        `1-resumen-1099-NEC-${anio}.csv: un sub por fila, solo los que llevan 1099-NEC (se les pagó ${dinero(minimo)} o más en el año).`,
        "   El total va en la Box 1 (Nonemployee compensation). Trae el SSN/EIN completo.",
        `2-pagos-${anio}.csv: cada pago del año a cualquier sub, con fecha, proyecto, método y monto. Sirve para`,
        "   cruzarlo con el banco y como registro propio. No trae SSN/EIN.",
        "",
        "NOTAS",
        "- Los pagos con tarjeta no se suman en la Box 1: esos los reporta el procesador de pagos en la 1099-K.",
        "- Las LLC que tributan como corporación (C o S, según su W-9) no llevan 1099.",
        "- Los archivos .csv se abren con Excel, Google Sheets o Numbers, y los importan los programas de 1099.",
        `- Las 1099-NEC de ${anio} se entregan al sub y al IRS antes del 31 de enero de ${anio + 1}.`,
        "",
      ].join("\r\n");

      const zip = new ZipWriter(new BlobWriter("application/zip"), { password: contrasena, encryptionStrength: 3 });
      await zip.add("LEEME.txt", new TextReader(leeme));
      await zip.add(`1-resumen-1099-NEC-${anio}.csv`, new TextReader(csv(resumen)));
      await zip.add(`2-pagos-${anio}.csv`, new TextReader(csv(pagos)));
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
        Sirve para cualquier contador y como registro propio. Baja un archivo con:
      </p>
      <ul className="-mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-texto-suave">
        <li>
          <strong className="text-tinta">Resumen 1099-NEC:</strong> un sub por fila, con lo que va en cada formulario
          (nombre legal, SSN/EIN completo, dirección y total del año)
        </li>
        <li>
          <strong className="text-tinta">Pagos del año:</strong> cada pago a cada sub con fecha, proyecto, método y monto,
          para cruzarlo con el banco
        </li>
      </ul>
      <p className="text-sm text-texto-suave">
        Va con contraseña porque trae el SSN/EIN completo: pasásela al contador por otro medio (por ejemplo, por teléfono).
      </p>
      {faltaEmpresa.length > 0 && (
        <p className="rounded-xl bg-orange-100 p-3 text-sm text-orange-900">
          Faltan datos de la empresa ({faltaEmpresa.join(", ")}). Se pueden cargar arriba; sin eso la planilla sale igual.
        </p>
      )}
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
