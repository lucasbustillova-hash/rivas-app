// Tipos y textos compartidos de las fotos y videos de obra.

export type Etapa = "antes" | "durante" | "despues";
export type TipoArchivo = "foto" | "video";

export type ArchivoProyecto = {
  id: string;
  proyecto_id: string;
  ruta: string;
  tipo: TipoArchivo;
  etapa: Etapa;
  nota: string | null;
  tomada_en: string;
};

export const ETAPAS: { valor: Etapa; nombre: string; chip: string }[] = [
  { valor: "antes", nombre: "Antes", chip: "bg-indigo-100 text-indigo-800" },
  { valor: "durante", nombre: "Durante", chip: "bg-amber-100 text-amber-800" },
  { valor: "despues", nombre: "Después", chip: "bg-green-100 text-green-800" },
];

export function datosEtapa(valor: string) {
  return ETAPAS.find((e) => e.valor === valor);
}

// Carpeta privada de Supabase donde se guardan.
export const CARPETA = "obras";

// El plan gratis de Supabase acepta archivos de hasta 50 MB.
export const MAXIMO_VIDEO_MB = 50;

// Cada archivo tiene una versión chica para las listas: "x/abc.jpg" → "x/abc.mini.jpg".
export function rutaMini(ruta: string) {
  return ruta.replace(/\.[^./]+$/, "") + ".mini.jpg";
}

const ZONA = "America/New_York";

// Día de la foto en hora de Florida, como "2026-11-18" (sirve para agrupar).
export function diaDe(fecha: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(fecha));
}

// "2026-11-18" → "Miércoles, 18 de noviembre de 2026"
export function tituloDia(dia: string) {
  const texto = new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dia}T12:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// La etapa que más probablemente corresponde según el estado del proyecto.
export function etapaSugerida(estadoProyecto: string): Etapa {
  if (estadoProyecto === "estimado") return "antes";
  if (estadoProyecto === "terminado") return "despues";
  return "durante";
}
