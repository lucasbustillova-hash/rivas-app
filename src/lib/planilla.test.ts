import { describe, expect, it } from "vitest";
import { celda, csv, fechaUS } from "./planilla";

describe("planilla para Excel", () => {
  it("deja los números negativos como números, para que Excel los sume", () => {
    expect(celda("-500.00")).toBe('"-500.00"');
    expect(celda("-12")).toBe('"-12"');
  });

  it("no deja que un texto se tome como fórmula", () => {
    expect(celda("=SUMA(A1)")).toBe(`"'=SUMA(A1)"`);
    expect(celda("-2+3")).toBe(`"'-2+3"`);
    expect(celda("+1")).toBe(`"'+1"`);
    expect(celda("@algo")).toBe(`"'@algo"`);
  });

  it("escapa las comillas y deja vacío lo que no hay", () => {
    expect(celda('Pisos "premium"')).toBe('"Pisos ""premium"""');
    expect(celda(null)).toBe('""');
  });

  it("arma el archivo con BOM y fechas como en EE. UU.", () => {
    expect(csv([["a", 1]])).toBe('﻿"a","1"\r\n');
    expect(fechaUS("2026-03-15")).toBe("03/15/2026");
  });
});
