import { describe, expect, it } from "vitest";
import { cuentasPendientes, type AsignacionLeida, type ContratoLeido } from "./pendientes";

const obraA = { id: "a", nombre: "Cocina", estado: "activo" as const };
const obraB = { id: "b", nombre: "Baño", estado: "terminado" as const };
const juan = { id: "s1", nombre: "Juan" };
const pedro = { id: "s2", nombre: "Pedro" };

const porDia = (id: string, sub: AsignacionLeida["sub"], proyecto: AsignacionLeida["proyecto"], dias: number[], pagos: number[]): AsignacionLeida => ({
  id,
  modalidad: "dia",
  monto_contrato: null,
  sub,
  proyecto,
  dias: dias.map((fraccion) => ({ fraccion, tarifa: 200 })),
  pagos: pagos.map((monto) => ({ monto })),
});

describe("cuentasPendientes: subs", () => {
  it("junta lo que se le debe a cada sub en todas las obras", () => {
    const r = cuentasPendientes({
      asignaciones: [
        porDia("1", juan, obraA, [1, 1, 0.5], [200]), // 500 − 200 = 300
        porDia("2", juan, obraB, [1], []), // 200
        { id: "3", modalidad: "contrato", monto_contrato: 3000, sub: pedro, proyecto: obraA, dias: [], pagos: [{ monto: 1000 }] }, // 2000
      ],
      contratos: [],
    });
    expect(r.subs.map((s) => [s.nombre, s.total])).toEqual([
      ["Pedro", 2000],
      ["Juan", 500],
    ]);
    expect(r.subs[1].obras.map((o) => [o.proyecto, o.debe])).toEqual([
      ["Cocina", 300],
      ["Baño", 200],
    ]);
    expect(r.debemos).toBe(2500);
  });

  it("deja afuera a los que están al día", () => {
    const r = cuentasPendientes({ asignaciones: [porDia("1", juan, obraA, [1], [200])], contratos: [] });
    expect(r.subs).toEqual([]);
    expect(r.debemos).toBe(0);
  });

  it("si en una obra se le pagó de más, se descuenta de lo que se le debe en otra", () => {
    const r = cuentasPendientes({
      asignaciones: [porDia("1", juan, obraA, [1], [300]), porDia("2", juan, obraB, [1, 1], [])],
      contratos: [],
    });
    expect(r.subs[0].total).toBe(300);
    expect(r.subs[0].obras.map((o) => o.debe)).toEqual([400, -100]);
  });

  it("un sub con saldo a favor no suma a lo que debemos", () => {
    const r = cuentasPendientes({ asignaciones: [porDia("1", juan, obraA, [1], [250])], contratos: [] });
    expect(r.subs[0].total).toBe(-50);
    expect(r.debemos).toBe(0);
  });
});

describe("cuentasPendientes: clientes", () => {
  const contrato = (proyecto: ContratoLeido["proyecto"], pagos: number[]): ContratoLeido => ({
    monto_total: 10000,
    proyecto,
    cuotas: [
      { id: "q1", orden: 1, descripcion: "Al empezar", monto: 5000 },
      { id: "q2", orden: 2, descripcion: "Al terminar", monto: 5000 },
    ],
    pagos: pagos.map((monto) => ({ monto })),
  });

  it("muestra lo que le falta pagar a cada cliente y su próximo cobro", () => {
    const r = cuentasPendientes({
      asignaciones: [],
      contratos: [
        contrato({ ...obraA, cliente: "Ana" }, [5000, 1000]),
        contrato({ ...obraB, cliente: "Beto" }, [10000]),
        contrato({ id: "c", nombre: "Pisos", estado: "estimado", cliente: "Caro" }, []),
      ],
    });
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0]).toMatchObject({ cliente: "Ana", falta: 4000, proxima: { descripcion: "Al terminar", falta: 4000 } });
    expect(r.nosDeben).toBe(4000);
  });
});
