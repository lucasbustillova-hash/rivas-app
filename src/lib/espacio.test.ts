import { describe, expect, it } from "vitest";
import { LIMITE_ARCHIVOS, tamano, uso } from "./espacio";

describe("espacio usado", () => {
  it("muestra el tamaño en KB, MB o GB", () => {
    expect(tamano(0)).toBe("0 KB");
    expect(tamano(200)).toBe("1 KB");
    expect(tamano(1536)).toBe("2 KB");
    expect(tamano(230 * 1024 ** 2)).toBe("230 MB");
    expect(tamano(1024 ** 3)).toBe("1 GB");
    expect(tamano(1.25 * 1024 ** 3)).toBe("1.3 GB");
  });

  it("avisa desde el 80 % y marca lleno al 100 %", () => {
    expect(uso(0.5 * LIMITE_ARCHIVOS, LIMITE_ARCHIVOS)).toEqual({ porcentaje: 50, avisar: false, lleno: false });
    expect(uso(0.8 * LIMITE_ARCHIVOS, LIMITE_ARCHIVOS)).toEqual({ porcentaje: 80, avisar: true, lleno: false });
    expect(uso(1.2 * LIMITE_ARCHIVOS, LIMITE_ARCHIVOS)).toEqual({ porcentaje: 100, avisar: true, lleno: true });
  });
});
