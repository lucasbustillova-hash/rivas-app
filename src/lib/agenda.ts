// Fechas del calendario. Se trabaja con textos "2026-11-23" (sin hora) para no
// tener problemas de zona horaria: la cuenta se hace en UTC.

const DIA_MS = 24 * 60 * 60 * 1000;
export const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const MAXIMO_DIAS = 62; // como mucho dos meses por vez al programar

const aFecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const aTexto = (d: Date) => d.toISOString().slice(0, 10);

export function sumarDias(fecha: string, dias: number) {
  return aTexto(new Date(aFecha(fecha).getTime() + dias * DIA_MS));
}

// ¿Es una fecha real? ("2026-02-30" no lo es)
export function fechaValida(texto: string) {
  return FECHA.test(texto) && aTexto(aFecha(texto)) === texto;
}

// 0 = domingo … 6 = sábado
export function diaDeLaSemana(fecha: string) {
  return aFecha(fecha).getUTCDay();
}

// El lunes de la semana de esa fecha (la semana va de lunes a domingo).
export function lunesDe(fecha: string) {
  return sumarDias(fecha, -((diaDeLaSemana(fecha) + 6) % 7));
}

// Los 7 días de la semana que empieza ese lunes.
export function diasDeLaSemana(lunes: string) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

// Días entre dos fechas (incluidas), opcionalmente sin domingos.
// Devuelve null si el rango está al revés o es demasiado largo.
export function rangoDeDias(desde: string, hasta: string, sinDomingos: boolean) {
  if (!fechaValida(desde) || !fechaValida(hasta) || hasta < desde) return null;
  const total = Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / DIA_MS) + 1;
  if (total > MAXIMO_DIAS) return null;
  return Array.from({ length: total }, (_, i) => sumarDias(desde, i)).filter((f) => !sinDomingos || diaDeLaSemana(f) !== 0);
}

// Hoy en Florida.
export function hoyEnFlorida() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

// "Lun 23 nov"
export function tituloDia(fecha: string) {
  const texto = new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(aFecha(fecha))
    .replace(/\./g, "")
    .replace(",", "")
    .replace(" de ", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "23 – 29 nov 2026" o "30 nov – 6 dic 2026"
export function tituloSemana(lunes: string) {
  const domingo = sumarDias(lunes, 6);
  const fmt = (f: string, opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-US", { ...opciones, timeZone: "UTC" }).format(aFecha(f)).replace(/\./g, "");
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  const inicio = mismoMes ? fmt(lunes, { day: "numeric" }) : fmt(lunes, { day: "numeric", month: "short" });
  return `${inicio} – ${fmt(domingo, { day: "numeric", month: "short", year: "numeric" })}`;
}

// Subs que quedaron en más de una obra el mismo día: "fecha|subId" de cada choque.
export function choques(entradas: { fecha: string; subcontratista_id: string; proyecto_id: string }[]) {
  const obras = new Map<string, Set<string>>();
  for (const e of entradas) {
    const clave = `${e.fecha}|${e.subcontratista_id}`;
    obras.set(clave, (obras.get(clave) ?? new Set()).add(e.proyecto_id));
  }
  return new Set([...obras].filter(([, p]) => p.size > 1).map(([clave]) => clave));
}
