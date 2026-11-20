import { describe, expect, it } from "vitest";
import { coincideBusqueda, normalizar } from "./proyectos";

const obra = ["Remodelación de cocina", "José Pérez", "123 Orange Ave, Orlando", "Cocina", "(407) 555-1234"];

describe("buscar proyectos", () => {
  it("no le importan los acentos ni las mayúsculas", () => {
    expect(normalizar("  JOSÉ Pérez ")).toBe("jose perez");
    expect(coincideBusqueda("jose", obra)).toBe(true);
    expect(coincideBusqueda("REMODELACION", obra)).toBe(true);
  });

  it("busca en el cliente, la dirección y el tipo de trabajo", () => {
    expect(coincideBusqueda("orange", obra)).toBe(true);
    expect(coincideBusqueda("orlando", obra)).toBe(true);
    expect(coincideBusqueda("baño", obra)).toBe(false);
  });

  it("todas las palabras tienen que aparecer, en cualquier orden", () => {
    expect(coincideBusqueda("perez cocina", obra)).toBe(true);
    expect(coincideBusqueda("perez baño", obra)).toBe(false);
  });

  it("encuentra el teléfono escrito de cualquier forma", () => {
    expect(coincideBusqueda("4075551234", obra)).toBe(true);
    expect(coincideBusqueda("555-1234", obra)).toBe(true);
    expect(coincideBusqueda("999", obra)).toBe(false);
  });

  it("sin nada escrito, muestra todo", () => {
    expect(coincideBusqueda("   ", obra)).toBe(true);
  });
});
