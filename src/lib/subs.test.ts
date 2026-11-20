import { describe, expect, it } from "vitest";
import { direccionCompleta, leerEstadoYZip, lineasDireccion, minimo1099, tinCompleto, tinOculto } from "@/lib/subs";

describe("mínimo para la 1099-NEC", () => {
  it("$600 hasta 2025 y $2,000 desde 2026", () => {
    expect(minimo1099(2025)).toBe(600);
    expect(minimo1099(2026)).toBe(2000);
    expect(minimo1099(2027)).toBe(2000);
  });
});

describe("SSN y EIN", () => {
  it("ocultos muestran solo los últimos 4", () => {
    expect(tinOculto("ssn", "3456")).toBe("•••-••-3456");
    expect(tinOculto("ein", "3456")).toBe("••-•••3456");
    expect(tinOculto("ssn", null)).toBeNull();
  });

  it("completos llevan los guiones donde van", () => {
    expect(tinCompleto("ssn", "000123456")).toBe("000-12-3456");
    expect(tinCompleto("ein", "001234567")).toBe("00-1234567");
  });
});

describe("dirección", () => {
  const d = { direccion: "100 Calle Inventada", ciudad: "Orlando", estado: "FL", codigo_postal: "32801" };

  it("se arma en dos líneas", () => {
    expect(lineasDireccion(d)).toEqual(["100 Calle Inventada", "Orlando, FL 32801"]);
  });

  it("está completa solo si tiene las cuatro partes", () => {
    expect(direccionCompleta(d)).toBe(true);
    expect(direccionCompleta({ ...d, codigo_postal: null })).toBe(false);
  });

  it("el estado se pasa a mayúsculas y se validan estado y código postal", () => {
    expect(leerEstadoYZip(" fl ", "32801-1234")).toEqual({ estado: "FL", codigo_postal: "32801-1234", error: null });
    expect(leerEstadoYZip("Florida", "32801").error).not.toBeNull();
    expect(leerEstadoYZip("FL", "3280").error).not.toBeNull();
    expect(leerEstadoYZip(null, null).error).toBeNull();
  });
});
