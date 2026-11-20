// Espacio usado en Supabase. Límites del plan gratis: si se pasa a Pro, cambiar acá (8 GB de base y 100 GB de archivos).
export const LIMITE_BASE = 500 * 1024 ** 2; // 500 MB
export const LIMITE_ARCHIVOS = 1024 ** 3; // 1 GB
export const AVISO = 0.8; // avisar al 80 %

// 1536 → "2 KB"; 230 MB → "230 MB"; 1.2 GB → "1.2 GB"
export function tamano(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(/\.0$/, "")} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / 1024))} KB`;
}

// Cuánto se usó de un límite: porcentaje (0 a 100) y si ya hay que avisar.
export function uso(bytes: number, limite: number) {
  const fraccion = limite > 0 ? bytes / limite : 0;
  return { porcentaje: Math.min(100, Math.round(fraccion * 100)), avisar: fraccion >= AVISO, lleno: fraccion >= 1 };
}
