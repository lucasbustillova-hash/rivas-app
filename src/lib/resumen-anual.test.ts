import { describe, expect, it } from "vitest";
import { resumenAnual } from "./resumen-anual";

const proyectos = [
  { id: "a", nombre: "Cocina", cliente: "Ana" },
  { id: "b", nombre: "Baño", cliente: "Beto" },
  { id: "c", nombre: "Pisos", cliente: "Caro" },
];

describe("resumenAnual", () => {
  const r = resumenAnual({
    proyectos,
    cobros: [
      { fecha: "2026-01-10", proyectoId: "a", monto: 5000, metodo: "zelle" },
      { fecha: "2026-03-01", proyectoId: "a", monto: 2500.1, metodo: "cheque" },
      { fecha: "2026-02-01", proyectoId: "b", monto: 1000, metodo: "zelle" },
    ],
    pagosSubs: [
      { fecha: "2026-01-12", proyectoId: "a", monto: 1200, metodo: "efectivo", sub: "S1" },
      { fecha: "2026-02-03", proyectoId: "b", monto: 1500, metodo: "zelle", sub: "S2" },
    ],
    gastos: [
      { fecha: "2026-01-11", proyectoId: "a", monto: 300.2, metodo: "tarjeta", categoria: "materiales", descripcion: "x", lugar: null },
      { fecha: "2026-01-15", proyectoId: "a", monto: 99.8, metodo: "efectivo", categoria: "basura", descripcion: "y", lugar: null },
      { fecha: "2026-01-20", proyectoId: "z", monto: 50, metodo: "efectivo", categoria: "materiales", descripcion: "z", lugar: null },
    ],
  });

  it("suma los totales del año", () => {
    expect(r.totales).toEqual({ cobrado: 8500.1, subs: 2700, gastos: 450, neto: 5350.1 });
  });

  it("suma por proyecto y deja afuera los que no tuvieron movimiento", () => {
    expect(r.porProyecto.map((p) => p.id)).toEqual(["a", "b", "z"]);
    expect(r.porProyecto[0]).toMatchObject({ cobrado: 7500.1, subs: 1200, gastos: 400, neto: 5900.1 });
    expect(r.porProyecto[1]).toMatchObject({ cobrado: 1000, subs: 1500, gastos: 0, neto: -500 });
  });

  it("un movimiento de un proyecto que ya no está igual se cuenta", () => {
    expect(r.porProyecto[2]).toMatchObject({ nombre: "(proyecto borrado)", gastos: 50, neto: -50 });
  });

  it("separa los gastos por categoría y lo cobrado por método", () => {
    expect(r.gastosPorCategoria).toEqual([
      { valor: "materiales", nombre: "Materiales", total: 350.2 },
      { valor: "basura", nombre: "Dumpster / basura", total: 99.8 },
    ]);
    expect(r.cobradoPorMetodo.map((m) => [m.valor, m.total])).toEqual([
      ["zelle", 6000],
      ["cheque", 2500.1],
    ]);
  });

  it("un año sin movimientos da todo en cero", () => {
    const vacio = resumenAnual({ proyectos, cobros: [], pagosSubs: [], gastos: [] });
    expect(vacio.porProyecto).toEqual([]);
    expect(vacio.totales).toEqual({ cobrado: 0, subs: 0, gastos: 0, neto: 0 });
  });
});
