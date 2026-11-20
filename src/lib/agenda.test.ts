import { describe, expect, it } from "vitest";
import { choques, diasDeLaSemana, diasSeguidos, fechaValida, lunesDe, rangoDeDias, tituloDia, tituloSemana } from "@/lib/agenda";

describe("semanas del calendario", () => {
  it("la semana empieza el lunes", () => {
    expect(lunesDe("2026-11-19")).toBe("2026-11-16"); // jueves
    expect(lunesDe("2026-11-16")).toBe("2026-11-16"); // lunes
    expect(lunesDe("2026-11-22")).toBe("2026-11-16"); // domingo
  });

  it("cruza meses y años sin problema", () => {
    expect(lunesDe("2027-01-01")).toBe("2026-12-28");
    expect(diasDeLaSemana("2026-11-30")).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
  });

  it("el cambio de horario de noviembre no corre los días", () => {
    expect(diasDeLaSemana("2026-11-02")[6]).toBe("2026-11-08");
  });

  it("título del día", () => {
    expect(tituloDia("2026-11-23")).toBe("Lun 23 nov");
    expect(tituloDia("2026-11-19")).toBe("Jue 19 nov");
  });

  it("título de la semana", () => {
    expect(tituloSemana("2026-11-16")).toBe("16 – 22 nov 2026");
    expect(tituloSemana("2026-11-30")).toBe("30 nov – 6 dic 2026");
  });
});

describe("programar varios días", () => {
  it("incluye las dos puntas y saca los domingos si se pide", () => {
    expect(rangoDeDias("2026-11-20", "2026-11-23", true)).toEqual(["2026-11-20", "2026-11-21", "2026-11-23"]);
    expect(rangoDeDias("2026-11-20", "2026-11-23", false)).toHaveLength(4);
  });

  it("un solo día", () => {
    expect(rangoDeDias("2026-11-20", "2026-11-20", true)).toEqual(["2026-11-20"]);
  });

  it("rechaza rangos al revés, fechas que no existen y más de dos meses", () => {
    expect(rangoDeDias("2026-11-23", "2026-11-20", true)).toBeNull();
    expect(rangoDeDias("2026-02-30", "2026-03-02", true)).toBeNull();
    expect(rangoDeDias("2026-01-01", "2026-12-31", true)).toBeNull();
  });

  it("reconoce fechas reales", () => {
    expect(fechaValida("2028-02-29")).toBe(true);
    expect(fechaValida("2026-02-29")).toBe(false);
    expect(fechaValida("hoy")).toBe(false);
  });
});

describe("sub en dos obras el mismo día", () => {
  it("avisa solo cuando son obras distintas", () => {
    const r = choques([
      { fecha: "2026-11-20", subcontratista_id: "juan", proyecto_id: "cocina" },
      { fecha: "2026-11-20", subcontratista_id: "juan", proyecto_id: "bano" },
      { fecha: "2026-11-21", subcontratista_id: "juan", proyecto_id: "cocina" },
      { fecha: "2026-11-20", subcontratista_id: "pedro", proyecto_id: "cocina" },
    ]);
    expect([...r]).toEqual(["2026-11-20|juan"]);
  });
});

describe("diasSeguidos", () => {
  it("cuenta los días a partir de una fecha, salteando domingos", () => {
    // 2026-11-19 es jueves: jue, vie, sáb, (dom no), lun
    expect(diasSeguidos("2026-11-19", 4, true)).toEqual(["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-23"]);
  });

  it("sin saltear domingos los cuenta todos", () => {
    expect(diasSeguidos("2026-11-21", 3, false)).toEqual(["2026-11-21", "2026-11-22", "2026-11-23"]);
  });

  it("si empieza un domingo y se saltean, arranca el lunes", () => {
    expect(diasSeguidos("2026-11-22", 1, true)).toEqual(["2026-11-23"]);
  });

  it("rechaza cantidades o fechas no válidas", () => {
    expect(diasSeguidos("2026-11-19", 0, true)).toBeNull();
    expect(diasSeguidos("2026-11-19", 2.5, true)).toBeNull();
    expect(diasSeguidos("2026-11-19", 100, true)).toBeNull();
    expect(diasSeguidos("2026-02-30", 3, true)).toBeNull();
  });
});
