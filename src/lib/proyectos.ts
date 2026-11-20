// Tipos y textos compartidos de proyectos y clientes.

export type EstadoProyecto = "estimado" | "activo" | "en_pausa" | "terminado";

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  notas: string | null;
};

export type Proyecto = {
  id: string;
  cliente_id: string;
  nombre: string;
  tipo_trabajo: string;
  alcance: string | null;
  direccion_obra: string | null;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  estado: EstadoProyecto;
  notas: string | null;
};

export const ESTADOS: { valor: EstadoProyecto; nombre: string; plural: string; chip: string }[] = [
  { valor: "activo", nombre: "Activo", plural: "Activos", chip: "bg-green-100 text-green-800" },
  { valor: "estimado", nombre: "Estimado", plural: "Estimados", chip: "bg-indigo-100 text-indigo-800" },
  { valor: "en_pausa", nombre: "En pausa", plural: "En pausa", chip: "bg-amber-100 text-amber-800" },
  { valor: "terminado", nombre: "Terminado", plural: "Terminados", chip: "bg-stone-200 text-stone-700" },
];

export function datosEstado(valor: string) {
  return ESTADOS.find((e) => e.valor === valor);
}

// Sugerencias para "Tipo de trabajo"; se puede escribir otro.
export const TIPOS_TRABAJO = [
  "Cocina",
  "Baño",
  "Pisos",
  "Paredes exteriores",
  "Pintura",
  "Drywall",
  "Techo",
  "Otro",
];

// "2026-11-03" → "3 nov 2026". Las fechas se guardan sin hora, así que se leen en UTC.
export function formatoFecha(fecha: string | null) {
  if (!fecha) return null;
  return new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${fecha}T00:00:00Z`))
    .replace(".", "");
}

export function rangoFechas(inicio: string | null, fin: string | null) {
  const a = formatoFecha(inicio);
  const b = formatoFecha(fin);
  if (a && b) return `${a} – ${b}`;
  if (a) return `Desde ${a}`;
  if (b) return `Hasta ${b}`;
  return "Sin fechas";
}

// Minúsculas y sin acentos, para buscar: "José" → "jose".
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// ¿El proyecto coincide con la búsqueda? Cada palabra buscada tiene que aparecer en alguno de los campos
// (no importan los acentos ni las mayúsculas). En el teléfono se buscan solo los números.
export function coincideBusqueda(busqueda: string, campos: (string | null | undefined)[]) {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const textos = campos.filter((c): c is string => Boolean(c));
  const texto = normalizar(textos.join(" "));
  const numeros = textos.map((c) => c.replace(/\D/g, "")).join(" ");
  return palabras.every((p) => {
    if (texto.includes(p)) return true;
    // "555-1234" o "(407)" se buscan como números, si tienen al menos 3.
    const digitos = p.replace(/\D/g, "");
    return digitos.length >= 3 && numeros.includes(digitos);
  });
}
