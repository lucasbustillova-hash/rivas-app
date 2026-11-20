import { describe, expect, it } from "vitest";
import { resumenGanancia, type Categoria } from "@/lib/gastos";

const gasto = (monto: number, categoria: Categoria = "materiales") => ({ monto, categoria });

describe("ganancia del proyecto", () => {
  it("contrato − mano de obra − gastos", () => {
    const r = resumenGanancia({
      contrato: 18500,
      cobrado: 9250,
      manoDeObra: { ganado: 3500, pagado: 1000 },
      gastos: [gasto(2400), gasto(350, "basura"), gasto(150, "permisos")],
    });
    expect(r).toMatchObject({ totalGastos: 2900, manoDeObra: 3500, costo: 6400, ganancia: 12100, margen: 65 });
  });

  it("la plata en mano usa lo cobrado y lo pagado de verdad", () => {
    const r = resumenGanancia({
      contrato: 18500,
      cobrado: 9250,
      manoDeObra: { ganado: 3500, pagado: 1000 },
      gastos: [gasto(2900)],
    });
    expect(r.enMano).toBe(5350);
  });

  it("si se gastó más de lo cobrado, la plata en mano queda negativa", () => {
    const r = resumenGanancia({ contrato: 5000, cobrado: 0, manoDeObra: { ganado: 0, pagado: 0 }, gastos: [gasto(800)] });
    expect(r.enMano).toBe(-800);
  });

  it("si el costo pasa el contrato, la ganancia es negativa", () => {
    const r = resumenGanancia({ contrato: 1000, cobrado: 1000, manoDeObra: { ganado: 900, pagado: 900 }, gastos: [gasto(300)] });
    expect(r).toMatchObject({ ganancia: -200, margen: -20 });
  });

  it("sin contrato cargado no hay ganancia ni margen, pero sí gastos", () => {
    const r = resumenGanancia({ contrato: null, cobrado: 0, manoDeObra: { ganado: 0, pagado: 0 }, gastos: [gasto(100)] });
    expect(r).toMatchObject({ ganancia: null, margen: null, totalGastos: 100 });
  });

  it("separa los gastos por categoría y deja afuera las que no tienen", () => {
    const r = resumenGanancia({
      contrato: 1000,
      cobrado: 0,
      manoDeObra: { ganado: 0, pagado: 0 },
      gastos: [gasto(10.1), gasto(20.2), gasto(5, "otro")],
    });
    expect(r.porCategoria.map((c) => [c.valor, c.total])).toEqual([
      ["materiales", 30.3],
      ["otro", 5],
    ]);
    expect(r.totalGastos).toBe(35.3);
  });
});
