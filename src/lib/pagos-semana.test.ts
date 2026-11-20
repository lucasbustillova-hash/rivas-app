import { describe, expect, it } from "vitest";
import { diasSinPagar, pagosPorSub, type AsignacionDia } from "./pagos-semana";

const dia = (fecha: string, fraccion = 1, tarifa = 200) => ({ fecha, fraccion, tarifa });
const asignacion = (id: string, sub: string, proyecto: string, dias: AsignacionDia["dias"], pagos: number[] = []): AsignacionDia => ({
  id,
  sub: { id: sub, nombre: sub },
  proyecto: { id: proyecto, nombre: proyecto },
  dias,
  pagos: pagos.map((monto) => ({ monto })),
});

describe("diasSinPagar", () => {
  it("los pagos cubren primero los días más viejos", () => {
    const dias = [dia("2026-11-20"), dia("2026-11-18"), dia("2026-11-19", 0.5)];
    expect(diasSinPagar(dias, 200)).toEqual([
      { fecha: "2026-11-19", fraccion: 0.5, falta: 100 },
      { fecha: "2026-11-20", fraccion: 1, falta: 200 },
    ]);
  });

  it("un pago parcial deja lo que falta de ese día", () => {
    expect(diasSinPagar([dia("2026-11-18"), dia("2026-11-19")], 250)).toEqual([{ fecha: "2026-11-19", fraccion: 1, falta: 150 }]);
  });

  it("sin días pendientes si está todo pagado", () => {
    expect(diasSinPagar([dia("2026-11-18")], 200)).toEqual([]);
  });
});

describe("pagosPorSub", () => {
  it("junta las obras de cada sub y ordena por lo que se debe", () => {
    const { subs, total } = pagosPorSub([
      asignacion("a1", "Carlos", "Cocina", [dia("2026-11-16"), dia("2026-11-17")]),
      asignacion("a2", "Carlos", "Baño", [dia("2026-11-18", 0.5)]),
      asignacion("a3", "Luis", "Cocina", [dia("2026-11-16", 1, 180), dia("2026-11-17", 1, 180)], [180]),
      asignacion("a4", "Miguel", "Baño", [dia("2026-11-16")], [200]),
    ]);
    expect(total).toBe(680);
    expect(subs.map((s) => [s.nombre, s.total, s.dias, s.desde, s.hasta])).toEqual([
      ["Carlos", 500, 2.5, "2026-11-16", "2026-11-18"],
      ["Luis", 180, 1, "2026-11-17", "2026-11-17"],
    ]);
    expect(subs[0].obras.map((o) => [o.proyecto, o.debe])).toEqual([
      ["Cocina", 400],
      ["Baño", 100],
    ]);
  });

  it("si se le pagó de más no aparece", () => {
    expect(pagosPorSub([asignacion("a1", "Carlos", "Cocina", [dia("2026-11-16")], [300])]).subs).toEqual([]);
  });
});
