// Días enteros desde una fecha hasta hoy.
export function diasDesde(fecha: string) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}
