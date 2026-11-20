import { describe, expect, it } from "vitest";
import { cuotasDelPlan, dinero, estadoCuotas, leerMonto, metodoBilingue, numeroRecibo, resumenCobro, saldoAlPago, type Cuota } from "@/lib/cobros";

const suma = (montos: { monto: number }[]) => Math.round(montos.reduce((t, c) => t + c.monto, 0) * 100) / 100;

describe("cuotas del plan de pagos del cliente", () => {
  it("50/50 reparte el contrato en dos mitades", () => {
    expect(cuotasDelPlan("50_50", 18500)).toEqual([
      { descripcion: "Al empezar", monto: 9250 },
      { descripcion: "Al terminar", monto: 9250 },
    ]);
  });

  it("40/30/30 reparte en tres cuotas", () => {
    expect(cuotasDelPlan("40_30_30", 10000).map((c) => c.monto)).toEqual([4000, 3000, 3000]);
  });

  it("los centavos que sobran van a la última cuota", () => {
    expect(cuotasDelPlan("40_30_30", 1000.01).map((c) => c.monto)).toEqual([400, 300, 300.01]);
  });

  it("las cuotas siempre suman exactamente el contrato", () => {
    for (const total of [0.01, 99.99, 1000.01, 1234.56, 18500, 33333.33, 99999.99]) {
      expect(suma(cuotasDelPlan("50_50", total))).toBe(total);
      expect(suma(cuotasDelPlan("40_30_30", total))).toBe(total);
    }
  });

  it("el plan propio no arma cuotas solo", () => {
    expect(cuotasDelPlan("propio", 5000)).toEqual([]);
  });
});

describe("qué cuotas están pagadas", () => {
  const cuotas: Cuota[] = [
    { id: "b", orden: 2, descripcion: "Al terminar", monto: 9250 },
    { id: "a", orden: 1, descripcion: "Al empezar", monto: 9250 },
  ];

  it("lo pagado cubre las cuotas en orden, aunque vengan desordenadas", () => {
    const estados = estadoCuotas(cuotas, 10000);
    expect(estados.map((c) => [c.id, c.estado, c.cubierto])).toEqual([
      ["a", "pagada", 9250],
      ["b", "parcial", 750],
    ]);
  });

  it("sin pagos, todas pendientes", () => {
    expect(estadoCuotas(cuotas, 0).map((c) => c.estado)).toEqual(["pendiente", "pendiente"]);
  });

  it("pagado justo el total, todas pagadas", () => {
    expect(estadoCuotas(cuotas, 18500).map((c) => c.estado)).toEqual(["pagada", "pagada"]);
  });
});

describe("resumen de lo cobrado al cliente", () => {
  const contrato = { proyecto_id: "p", monto_total: 18500, plan: "50_50" as const };
  const cuotas: Cuota[] = [
    { id: "a", orden: 1, descripcion: "Al empezar", monto: 9250 },
    { id: "b", orden: 2, descripcion: "Al terminar", monto: 9250 },
  ];
  const pago = (monto: number) => ({ id: String(monto), fecha: "2026-01-01", monto, metodo: "zelle" as const, nota: null });

  it("a mitad de pago: cuánto falta, porcentaje y próxima cuota", () => {
    const r = resumenCobro(contrato, cuotas, [pago(5000), pago(4250)]);
    expect(r).toMatchObject({ total: 18500, pagado: 9250, falta: 9250, deMas: 0, porcentaje: 50 });
    expect(r.proxima?.id).toBe("b");
  });

  it("suma bien pagos con centavos", () => {
    const r = resumenCobro(contrato, cuotas, [pago(0.1), pago(0.2), pago(9249.7)]);
    expect(r.pagado).toBe(9250);
  });

  it("si el cliente pagó de más, lo muestra aparte y la barra no pasa de 100%", () => {
    const r = resumenCobro(contrato, cuotas, [pago(19000)]);
    expect(r).toMatchObject({ pagado: 19000, falta: 0, deMas: 500, porcentaje: 100 });
    expect(r.proxima).toBeNull();
  });

  it("un contrato en cero no rompe la cuenta", () => {
    expect(resumenCobro({ ...contrato, monto_total: 0 }, [], []).porcentaje).toBe(0);
  });
});

describe("leer y mostrar montos", () => {
  it("acepta signo de dólar, comas y espacios", () => {
    expect(leerMonto("$1,500.50")).toBe(1500.5);
    expect(leerMonto(" 200 ")).toBe(200);
  });

  it("rechaza lo que no es un monto", () => {
    for (const malo of ["", "abc", "-5", "1.234", "1.5.0"]) expect(leerMonto(malo)).toBeNull();
  });

  it("muestra dólares con centavos solo si hacen falta", () => {
    expect(dinero(1500)).toBe("$1,500");
    expect(dinero(1500.5)).toBe("$1,500.50");
  });
});

describe("recibo del cliente", () => {
  const pagos = [
    { id: "c", fecha: "2026-03-01", creado_en: "2026-03-01T10:00:00Z", monto: 2000 },
    { id: "a", fecha: "2026-01-10", creado_en: "2026-01-10T09:00:00Z", monto: 5000 },
    { id: "b2", fecha: "2026-02-01", creado_en: "2026-02-01T15:00:00Z", monto: 500 },
    { id: "b1", fecha: "2026-02-01", creado_en: "2026-02-01T11:00:00Z", monto: 1000 },
  ];

  it("cuenta lo pagado hasta ese pago, en orden de fecha", () => {
    expect(saldoAlPago(10000, pagos, "a")).toEqual({ pagado: 5000, saldo: 5000 });
    expect(saldoAlPago(10000, pagos, "b1")).toEqual({ pagado: 6000, saldo: 4000 });
    expect(saldoAlPago(10000, pagos, "b2")).toEqual({ pagado: 6500, saldo: 3500 });
    expect(saldoAlPago(10000, pagos, "c")).toEqual({ pagado: 8500, saldo: 1500 });
  });

  it("si pagó de más, el saldo queda en cero", () => {
    expect(saldoAlPago(8000, pagos, "c")).toEqual({ pagado: 8500, saldo: 0 });
  });

  it("un pago que no está da null", () => {
    expect(saldoAlPago(10000, pagos, "x")).toBeNull();
  });

  it("muestra la forma de pago en los dos idiomas y el número del recibo", () => {
    expect(metodoBilingue("efectivo")).toBe("Efectivo / Cash");
    expect(metodoBilingue("zelle")).toBe("Zelle");
    expect(metodoBilingue("tarjeta")).toBe("Tarjeta / Card");
    expect(metodoBilingue("transferencia")).toBe("Transferencia / Bank transfer");
    expect(numeroRecibo("1a2b3c4d-0000-4000-8000-000000000000")).toBe("R-1A2B3C4D");
  });
});
