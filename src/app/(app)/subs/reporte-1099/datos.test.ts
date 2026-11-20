import { describe, expect, it } from "vitest";
import { sumarPagos1099, type PagoLeido } from "./datos";

const pago = (subId: string | null, monto: number, metodo = "zelle"): PagoLeido => ({
  fecha: "2026-03-01",
  monto,
  metodo,
  es_adelanto: false,
  nota: null,
  asignaciones: subId ? { subcontratista_id: subId, modalidad: "contrato", proyectos: { nombre: "PRUEBA" } } : null,
});

describe("totales de la 1099", () => {
  it("suma todos los pagos de cada sub, de cualquier proyecto", () => {
    const { sumas } = sumarPagos1099([pago("a", 1000, "efectivo"), pago("b", 300), pago("a", 2200, "cheque")]);
    expect(sumas.get("a")).toEqual({ total: 3200, conTarjeta: 0 });
    expect(sumas.get("b")).toEqual({ total: 300, conTarjeta: 0 });
  });

  it("lo pagado con tarjeta no entra en el total de la 1099-NEC", () => {
    const { sumas } = sumarPagos1099([pago("a", 1500), pago("a", 700, "tarjeta")]);
    expect(sumas.get("a")).toEqual({ total: 1500, conTarjeta: 700 });
  });

  it("los centavos se suman bien", () => {
    const { sumas } = sumarPagos1099([pago("a", 0.1), pago("a", 0.2)]);
    expect(sumas.get("a")!.total).toBeCloseTo(0.3, 10);
  });

  it("cada pago aparece en el detalle de la planilla, con su proyecto", () => {
    const { detalle } = sumarPagos1099([pago("a", 1000), pago("a", 50, "tarjeta"), pago(null, 999)]);
    expect(detalle).toHaveLength(2);
    expect(detalle[0]).toMatchObject({ subId: "a", proyecto: "PRUEBA", monto: 1000, metodo: "zelle" });
  });
});
