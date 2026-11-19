// Tipos y formatos de subcontratistas.

export type Sub = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  oficio: string | null;
  activo: boolean;
  notas: string | null;
};

export type SubPrivado = {
  nombre_legal: string | null;
  tipo: "persona" | "llc";
  tin_tipo: "ssn" | "ein" | null;
  tin_ultimos4: string | null;
  w9_firmado: boolean;
  w9_ruta: string | null;
  tarifa_diaria: number | null;
};

// A partir de este monto pagado en el año, el sub necesita 1099-NEC.
export const MINIMO_1099 = 2000;

// El mínimo para la 1099-NEC subió de $600 a $2,000 para los pagos desde 2026.
export function minimo1099(anio: number) {
  return anio >= 2026 ? MINIMO_1099 : 600;
}

// Sugerencias para "Oficio"; se puede escribir otro.
export const OFICIOS = [
  "Drywall",
  "Colgar sheetrock",
  "Finishing sheetrock",
  "Tile",
  "Pintura",
  "Carpintería",
  "Plomería",
  "Electricidad",
  "Pisos",
  "Ayudante",
];

export { dinero } from "@/lib/cobros";

// "•••-••-1234" (SSN) o "••-•••1234" (EIN).
export function tinOculto(tipo: SubPrivado["tin_tipo"], ultimos4: string | null) {
  if (!ultimos4) return null;
  return tipo === "ein" ? `••-•••${ultimos4}` : `•••-••-${ultimos4}`;
}

// "123456789" → "123-45-6789" (SSN) o "12-3456789" (EIN).
export function tinCompleto(tipo: SubPrivado["tin_tipo"], digitos: string) {
  return tipo === "ein"
    ? `${digitos.slice(0, 2)}-${digitos.slice(2)}`
    : `${digitos.slice(0, 3)}-${digitos.slice(3, 5)}-${digitos.slice(5)}`;
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Año en curso en Florida (para el historial y la 1099).
export function anioActual() {
  return Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/New_York" }).format(new Date()));
}
