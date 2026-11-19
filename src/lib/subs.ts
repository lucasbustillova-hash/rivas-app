// Tipos y formatos de subcontratistas.

export type Sub = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null; // calle y número
  ciudad: string | null;
  estado: string | null; // dos letras, ej. FL
  codigo_postal: string | null;
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

// Dirección en una o dos líneas: "123 Main St" y "Orlando, FL 32801".
export function lineasDireccion(d: {
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
}) {
  const segunda = [d.ciudad, [d.estado, d.codigo_postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [d.direccion, segunda].filter(Boolean) as string[];
}

// ¿Está la dirección completa como la pide la 1099?
export function direccionCompleta(d: Parameters<typeof lineasDireccion>[0]) {
  return Boolean(d.direccion && d.ciudad && d.estado && d.codigo_postal);
}

// Normaliza estado (2 letras) y código postal; devuelve un error si no son válidos.
export function leerEstadoYZip(estadoTxt: string | null, zipTxt: string | null) {
  const estado = estadoTxt ? estadoTxt.trim().toUpperCase() : null;
  const codigo_postal = zipTxt ? zipTxt.trim() : null;
  if (estado && !/^[A-Z]{2}$/.test(estado)) return { error: "El estado son dos letras, por ejemplo FL." } as const;
  if (codigo_postal && !/^[0-9]{5}(-[0-9]{4})?$/.test(codigo_postal))
    return { error: "El código postal son 5 números, por ejemplo 32801." } as const;
  return { estado, codigo_postal, error: null } as const;
}

// EIN con guion: 12-3456789.
export function einConGuion(ein: string) {
  return `${ein.slice(0, 2)}-${ein.slice(2)}`;
}
