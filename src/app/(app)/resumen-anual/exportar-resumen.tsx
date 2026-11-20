"use client";

import { useState } from "react";
import { BlobWriter, TextReader, ZipWriter, configure } from "@zip.js/zip.js";
import { dinero, nombreMetodo } from "@/lib/cobros";
import { nombreCategoria } from "@/lib/gastos";
import { csv, descargar, fechaUS, type Celda } from "@/lib/planilla";
import type { FilaProyecto } from "@/lib/resumen-anual";
import type { CobroDetalle, GastoDetalle, PagoSubDetalle } from "./datos";

configure({ useWebWorkers: false });

type Props = {
  anio: number;
  porProyecto: FilaProyecto[];
  totales: { cobrado: number; subs: number; gastos: number; neto: number };
  cobros: CobroDetalle[];
  pagosSubs: PagoSubDetalle[];
  gastos: GastoDetalle[];
};

const plata = (n: number) => n.toFixed(2);

// Planilla del año para el contador: el resumen por proyecto y cada movimiento, en un .zip.
// No lleva contraseña: no trae SSN/EIN (eso va en la planilla de la 1099).
export function ExportarResumen({ anio, porProyecto, totales, cobros, pagosSubs, gastos }: Props) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const exportar = async () => {
    setError(null);
    setListo(false);
    setTrabajando(true);
    try {
      const proyecto = new Map(porProyecto.map((p) => [p.id, p]));
      const nombre = (id: string) => proyecto.get(id)?.nombre ?? "";
      const cliente = (id: string) => proyecto.get(id)?.cliente ?? "";

      const resumen: Celda[][] = [
        ["Proyecto (Project)", "Cliente (Client)", "Cobrado (Income)", "Pagado a subs (Contract labor)", "Gastos (Expenses)", "Quedó (Net)"],
        ...porProyecto.map((p) => [p.nombre, p.cliente, plata(p.cobrado), plata(p.subs), plata(p.gastos), plata(p.neto)]),
        ["TOTAL", "", plata(totales.cobrado), plata(totales.subs), plata(totales.gastos), plata(totales.neto)],
      ];
      const tablaCobros: Celda[][] = [
        ["Fecha (Date)", "Proyecto (Project)", "Cliente (Client)", "Método (Method)", "Monto (Amount)", "Nota"],
        ...cobros.map((c) => [fechaUS(c.fecha), nombre(c.proyectoId), cliente(c.proyectoId), nombreMetodo(c.metodo), plata(c.monto), c.nota]),
      ];
      const tablaSubs: Celda[][] = [
        ["Fecha (Date)", "Sub", "Proyecto (Project)", "Tipo de trabajo", "Método (Method)", "Monto (Amount)", "Nota"],
        ...pagosSubs.map((p) => [fechaUS(p.fecha), p.sub, nombre(p.proyectoId), p.tipo, nombreMetodo(p.metodo), plata(p.monto), p.nota]),
      ];
      const tablaGastos: Celda[][] = [
        ["Fecha (Date)", "Proyecto (Project)", "Tipo (Category)", "Qué (Description)", "Dónde (Vendor)", "Método (Method)", "Monto (Amount)", "Nota"],
        ...gastos.map((g) => [
          fechaUS(g.fecha),
          nombre(g.proyectoId),
          nombreCategoria(g.categoria),
          g.descripcion,
          g.lugar,
          g.metodo === "tarjeta" ? "Tarjeta" : nombreMetodo(g.metodo),
          plata(g.monto),
          g.nota,
        ]),
      ];

      const leeme = [
        `Resumen del año ${anio} — NAHOMY Pro Construction`,
        `Armado con la app de NAHOMY Pro el ${new Date().toLocaleDateString("en-US")}.`,
        "",
        "TOTALES DEL AÑO",
        `Cobrado a clientes (Income): ${dinero(totales.cobrado)}`,
        `Pagado a subcontratistas (Contract labor): ${dinero(totales.subs)}`,
        `Gastos de obra (Job expenses): ${dinero(totales.gastos)}`,
        `Quedó (Net): ${dinero(totales.neto)}`,
        "",
        "Se cuenta por la fecha de cada pago (cash basis), como lo ve el banco.",
        "",
        "ARCHIVOS",
        `1-resumen-por-proyecto-${anio}.csv: un proyecto por fila, con lo cobrado, lo pagado a subs, los gastos y lo que quedó.`,
        `2-cobros-${anio}.csv: cada pago recibido de un cliente.`,
        `3-pagos-a-subs-${anio}.csv: cada pago a un subcontratista.`,
        `4-gastos-${anio}.csv: cada gasto de obra (materiales, herramientas, permisos, dumpster, etc.).`,
        "",
        "NOTAS",
        "- Solo incluye lo que se cargó en la app. Gastos generales del negocio (camioneta, seguro, teléfono) no están.",
        "- Para las 1099-NEC de los subs (con SSN/EIN) está la otra planilla, en el Reporte 1099 de la app.",
        "- Los archivos .csv se abren con Excel, Google Sheets o Numbers.",
        "",
      ].join("\r\n");

      const zip = new ZipWriter(new BlobWriter("application/zip"));
      await zip.add("LEEME.txt", new TextReader(leeme));
      await zip.add(`1-resumen-por-proyecto-${anio}.csv`, new TextReader(csv(resumen)));
      await zip.add(`2-cobros-${anio}.csv`, new TextReader(csv(tablaCobros)));
      await zip.add(`3-pagos-a-subs-${anio}.csv`, new TextReader(csv(tablaSubs)));
      await zip.add(`4-gastos-${anio}.csv`, new TextReader(csv(tablaGastos)));
      descargar(await zip.close(), `resumen-${anio}-NAHOMY.zip`);
      setListo(true);
    } catch {
      setError("No se pudo armar el archivo. Probá de nuevo.");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Planilla para el contador</h2>
      <p className="text-sm text-texto-suave">
        Baja un archivo con el resumen por proyecto y el detalle de cada cobro, cada pago a subs y cada gasto del año, para
        abrir en Excel. No trae SSN ni EIN.
      </p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {listo && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">Listo, se descargó.</p>}
      <button
        type="button"
        onClick={exportar}
        disabled={trabajando}
        className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
      >
        {trabajando ? "Armando el archivo…" : `Descargar planilla ${anio}`}
      </button>
    </section>
  );
}
