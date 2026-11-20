import { describe, expect, it } from "vitest";
import { enOrden, fraccionBilingue, resumenAsignacion, textoDias } from "@/lib/mano-de-obra";

const porDia = { modalidad: "dia" as const, monto_contrato: null };
const dia = (fraccion: number, tarifa: number) => ({ fraccion, tarifa });
const pago = (monto: number) => ({ monto });

describe("sub por día", () => {
  it("días × tarifa, con medios días", () => {
    const r = resumenAsignacion(porDia, [dia(1, 200), dia(0.5, 200), dia(1, 200)], []);
    expect(r).toEqual({ dias: 2.5, ganado: 500, pagado: 0, debe: 500 });
  });

  it("si cambió la tarifa, cada día cuenta con la suya", () => {
    const r = resumenAsignacion(porDia, [dia(1, 200), dia(1, 250)], [pago(300)]);
    expect(r).toEqual({ dias: 2, ganado: 450, pagado: 300, debe: 150 });
  });

  it("tarifas con centavos dan centavos exactos", () => {
    expect(resumenAsignacion(porDia, [dia(1, 133.33), dia(1, 133.33), dia(1, 133.33)], []).ganado).toBe(399.99);
    expect(resumenAsignacion(porDia, [dia(0.5, 150.5)], []).ganado).toBe(75.25);
  });

  it("si se le pagó de más, lo que debe queda en negativo", () => {
    expect(resumenAsignacion(porDia, [dia(1, 200)], [pago(250)]).debe).toBe(-50);
  });
});

describe("sub por contrato", () => {
  const contrato = { modalidad: "contrato" as const, monto_contrato: 3200 };

  it("con un adelanto, debe el resto", () => {
    expect(resumenAsignacion(contrato, [], [pago(1000)])).toEqual({ dias: 0, ganado: 3200, pagado: 1000, debe: 2200 });
  });

  it("con el pago final, no debe nada", () => {
    expect(resumenAsignacion(contrato, [], [pago(1000), pago(2200)]).debe).toBe(0);
  });

  it("los días marcados no cambian lo que se le paga por contrato", () => {
    expect(resumenAsignacion(contrato, [dia(1, 200)], []).ganado).toBe(3200);
  });

  it("pagos con centavos suman exacto", () => {
    expect(resumenAsignacion(contrato, [], [pago(0.1), pago(0.2), pago(3199.7)]).debe).toBe(0);
  });
});

describe("texto de los días", () => {
  it("escribe medios días con ½", () => {
    expect(textoDias(0)).toBe("0 días");
    expect(textoDias(0.5)).toBe("½ día");
    expect(textoDias(1)).toBe("1 día");
    expect(textoDias(1.5)).toBe("1½ días");
    expect(textoDias(3)).toBe("3 días");
  });
});

describe("estado de cuenta del sub", () => {
  it("nombra el día en los dos idiomas", () => {
    expect(fraccionBilingue(1)).toBe("Día completo / Full day");
    expect(fraccionBilingue(0.5)).toBe("Medio día / Half day");
  });

  it("ordena de la fecha más vieja a la más nueva", () => {
    const lista = [
      { fecha: "2026-03-02", creado_en: "b" },
      { fecha: "2026-03-01", creado_en: "z" },
      { fecha: "2026-03-02", creado_en: "a" },
    ];
    expect(enOrden(lista)).toEqual([
      { fecha: "2026-03-01", creado_en: "z" },
      { fecha: "2026-03-02", creado_en: "a" },
      { fecha: "2026-03-02", creado_en: "b" },
    ]);
  });
});
