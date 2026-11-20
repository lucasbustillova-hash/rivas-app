// Armar y abrir el respaldo completo de la app (solo en el navegador de un administrador).
// Es un .zip encriptado con AES-256: sin la contraseña no se puede abrir.

import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter, configure } from "@zip.js/zip.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rutaMini } from "@/lib/fotos";

configure({ useWebWorkers: false });

// Tablas que entran en el respaldo, en el orden en que habría que restaurarlas.
export const TABLAS = [
  "empresa",
  "clientes",
  "proyectos",
  "archivos_proyecto",
  "contratos_cliente",
  "cuotas_cliente",
  "pagos_cliente",
  "subcontratistas",
  "subcontratistas_privado",
  "asignaciones",
  "dias_trabajados",
  "pagos_sub",
  "gastos",
  "agenda",
] as const;

export const MINIMO_CONTRASENA = 10;
const POR_PAGINA = 1000;

type Fila = Record<string, unknown>;
export type Progreso = { paso: string; hechos?: number; total?: number };
export type Resumen = {
  creado_en: string;
  version: number;
  tablas: Record<string, number>;
  archivos: number;
  archivos_faltantes: string[];
};

async function leerTabla(supabase: SupabaseClient, tabla: string): Promise<Fila[]> {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .range(desde, desde + POR_PAGINA - 1);
    if (error) throw new Error(`No se pudo leer ${tabla}.`);
    filas.push(...(data ?? []));
    if (!data || data.length < POR_PAGINA) return filas;
  }
}

function texto(datos: unknown) {
  return JSON.stringify(datos, null, 2);
}

const LEEME = (fecha: string) => `RESPALDO DE NAHOMY PRO
Creado: ${fecha}

Este archivo tiene una copia completa de la app:
- datos/: cada tabla de la base de datos en formato JSON (proyectos, clientes, pagos, subcontratistas, días, gastos, calendario, etc.).
  En subcontratistas_privado.json, el campo "tin" tiene el SSN o EIN completo, para poder recuperarlo
  aunque se pierda la clave de encriptación de Supabase.
- archivos/obras/: fotos y videos de los proyectos.
- archivos/documentos/: W-9, acuerdos firmados y recibos de gastos.
- resumen.json: cuántas filas y archivos tiene, para comprobar que está completo.

Está protegido con contraseña (AES-256). Para abrirlo en la computadora sirve 7-Zip (Windows)
o Keka (Mac); el explorador de archivos de Windows y el Finder de Mac no abren este tipo de zip.
También se puede comprobar desde la app, en la pantalla Respaldo.

Guardalo en un lugar seguro: tiene SSN, W-9 y montos.
`;

// Arma el respaldo y devuelve el archivo listo para descargar.
export async function armarRespaldo(
  supabase: SupabaseClient,
  contrasena: string,
  avisar: (p: Progreso) => void,
): Promise<{ archivo: Blob; resumen: Resumen }> {
  if (contrasena.length < MINIMO_CONTRASENA) throw new Error("La contraseña es muy corta.");
  const creado = new Date().toISOString();
  const zip = new ZipWriter(new BlobWriter("application/zip"), { password: contrasena, encryptionStrength: 3 });
  const resumen: Resumen = { creado_en: creado, version: 1, tablas: {}, archivos: 0, archivos_faltantes: [] };
  const datos: Record<string, Fila[]> = {};

  // 1. Datos
  for (const [i, tabla] of TABLAS.entries()) {
    avisar({ paso: "Leyendo los datos", hechos: i, total: TABLAS.length });
    datos[tabla] = await leerTabla(supabase, tabla);
  }

  // El SSN/EIN completo: lo que está guardado en la base solo se puede abrir con la clave de Supabase.
  const conTin = datos.subcontratistas_privado.filter((p) => p.tin_ultimos4);
  for (const [i, p] of conTin.entries()) {
    avisar({ paso: "Leyendo SSN/EIN", hechos: i, total: conTin.length });
    const { data, error } = await supabase.rpc("ver_tin", { p_sub: p.subcontratista_id });
    if (error) throw new Error("No se pudo leer un SSN/EIN. ¿Tu usuario es administrador?");
    p.tin = data;
  }

  for (const tabla of TABLAS) {
    resumen.tablas[tabla] = datos[tabla].length;
    await zip.add(`datos/${tabla}.json`, new TextReader(texto(datos[tabla])));
  }

  // 2. Archivos: los que figuran en la base (fotos con su versión chica, W-9 y acuerdos).
  const lista: { carpeta: string; ruta: string; opcional?: boolean }[] = [];
  for (const a of datos.archivos_proyecto) {
    lista.push({ carpeta: "obras", ruta: String(a.ruta) });
    lista.push({ carpeta: "obras", ruta: rutaMini(String(a.ruta)), opcional: true });
  }
  for (const p of datos.subcontratistas_privado) if (p.w9_ruta) lista.push({ carpeta: "documentos", ruta: String(p.w9_ruta) });
  for (const a of datos.asignaciones) if (a.contrato_ruta) lista.push({ carpeta: "documentos", ruta: String(a.contrato_ruta) });
  for (const g of datos.gastos) if (g.recibo_ruta) lista.push({ carpeta: "documentos", ruta: String(g.recibo_ruta) });

  for (const [i, f] of lista.entries()) {
    avisar({ paso: "Copiando fotos y documentos", hechos: i, total: lista.length });
    const { data, error } = await supabase.storage.from(f.carpeta).download(f.ruta);
    if (error || !data) {
      if (!f.opcional) resumen.archivos_faltantes.push(`${f.carpeta}/${f.ruta}`);
      continue;
    }
    // Fotos y videos ya vienen comprimidos: guardarlos sin volver a comprimir es más rápido.
    await zip.add(`archivos/${f.carpeta}/${f.ruta}`, new BlobReader(data), { level: 0 });
    resumen.archivos++;
  }

  await zip.add("resumen.json", new TextReader(texto(resumen)));
  await zip.add("LEEME.txt", new TextReader(LEEME(creado)));
  avisar({ paso: "Cerrando el archivo" });
  const archivo = await zip.close();
  return { archivo, resumen };
}

// Abre un respaldo con la contraseña y comprueba que cada parte se pueda leer.
export async function comprobarRespaldo(
  archivo: Blob,
  contrasena: string,
  avisar: (p: Progreso) => void,
): Promise<{ resumen: Resumen; leidos: number }> {
  const zip = new ZipReader(new BlobReader(archivo), { password: contrasena });
  try {
    const entradas = await zip.getEntries();
    const entradaResumen = entradas.find((e) => e.filename === "resumen.json");
    if (!entradaResumen || entradaResumen.directory) throw new Error("Este archivo no es un respaldo de la app.");
    let resumen: Resumen;
    try {
      resumen = JSON.parse(await entradaResumen.getData(new TextWriter())) as Resumen;
    } catch {
      throw new Error("La contraseña no es correcta.");
    }
    let leidos = 0;
    const archivosEnZip = entradas.filter((e) => !e.directory);
    for (const [i, e] of archivosEnZip.entries()) {
      avisar({ paso: "Comprobando", hechos: i, total: archivosEnZip.length });
      if (e.directory) continue;
      await e.getData(new BlobWriter());
      leidos++;
    }
    const enArchivos = archivosEnZip.filter((e) => e.filename.startsWith("archivos/")).length;
    if (enArchivos !== resumen.archivos) throw new Error("Al respaldo le faltan archivos: puede estar incompleto o dañado.");
    return { resumen, leidos };
  } finally {
    await zip.close();
  }
}
