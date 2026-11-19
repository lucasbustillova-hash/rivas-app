import type { SupabaseClient } from "@supabase/supabase-js";
import { direccionCompleta, minimo1099 } from "@/lib/subs";

export type Fila1099 = {
  id: string;
  nombre: string;
  nombreLegal: string | null;
  tipo: "persona" | "llc";
  tinTipo: "ssn" | "ein" | null;
  tinUltimos4: string | null;
  w9: boolean;
  direccion: string | null; // calle y número
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  telefono: string | null;
  correo: string | null;
  total: number; // lo que va en la 1099-NEC (sin tarjeta)
  conTarjeta: number; // pagado con tarjeta: no va en la 1099-NEC
  faltan: string[];
};

// Un pago del año, para el detalle de la planilla.
export type PagoDetalle = {
  fecha: string;
  subId: string;
  proyecto: string;
  modalidad: "dia" | "contrato";
  esAdelanto: boolean;
  metodo: string;
  monto: number;
  nota: string | null;
};

export type Empresa = {
  nombre_legal: string | null;
  ein: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
  telefono: string | null;
};

type PagoLeido = {
  fecha: string;
  monto: number;
  metodo: string;
  es_adelanto: boolean;
  nota: string | null;
  asignaciones: { subcontratista_id: string; modalidad: "dia" | "contrato"; proyectos: { nombre: string } | null } | null;
};

const centavos = (n: number) => Math.round(n * 100) / 100;

// ¿Qué le falta a los datos de la empresa para la 1099?
export function faltanEmpresa(e: Empresa | null) {
  return [
    !e?.nombre_legal && "nombre legal",
    !e?.ein && "EIN",
    !(e && direccionCompleta(e)) && "dirección",
  ].filter(Boolean) as string[];
}

// Pagos a subs del año, sumados por sub, con los datos que pide la 1099-NEC.
export async function cargarReporte1099(supabase: SupabaseClient, anio: number) {
  const pagos: PagoLeido[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("pagos_sub")
      .select("fecha, monto, metodo, es_adelanto, nota, asignaciones(subcontratista_id, modalidad, proyectos(nombre))")
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`)
      .order("fecha")
      .order("id")
      .range(desde, desde + 999);
    if (error) throw new Error("No se pudieron leer los pagos.");
    pagos.push(...((data ?? []) as unknown as PagoLeido[]));
    if (!data || data.length < 1000) break;
  }

  const sumas = new Map<string, { total: number; conTarjeta: number }>();
  const detalle: PagoDetalle[] = [];
  for (const p of pagos) {
    const subId = p.asignaciones?.subcontratista_id;
    if (!subId) continue;
    const s = sumas.get(subId) ?? { total: 0, conTarjeta: 0 };
    if (p.metodo === "tarjeta") s.conTarjeta += Number(p.monto);
    else s.total += Number(p.monto);
    sumas.set(subId, s);
    detalle.push({
      fecha: p.fecha,
      subId,
      proyecto: p.asignaciones?.proyectos?.nombre ?? "",
      modalidad: p.asignaciones?.modalidad ?? "dia",
      esAdelanto: p.es_adelanto,
      metodo: p.metodo,
      monto: Number(p.monto),
      nota: p.nota,
    });
  }

  const ids = [...sumas.keys()];
  const [{ data: subs }, { data: privados }, { data: empresa }] = await Promise.all([
    ids.length
      ? supabase.from("subcontratistas").select("id, nombre, direccion, ciudad, estado, codigo_postal, telefono, correo").in("id", ids)
      : Promise.resolve({ data: [] as never[] }),
    ids.length
      ? supabase
          .from("subcontratistas_privado")
          .select("subcontratista_id, nombre_legal, tipo, tin_tipo, tin_ultimos4, w9_firmado")
          .in("subcontratista_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("empresa")
      .select("nombre_legal, ein, direccion, ciudad, estado, codigo_postal, telefono")
      .maybeSingle<Empresa>(),
  ]);
  const privadoDe = new Map((privados ?? []).map((p) => [p.subcontratista_id as string, p]));

  const filas: Fila1099[] = (subs ?? []).map((s) => {
    const p = privadoDe.get(s.id);
    const suma = sumas.get(s.id)!;
    const faltan = [
      !p?.w9_firmado && "W-9",
      !p?.nombre_legal && "nombre legal",
      !p?.tin_ultimos4 && "SSN/EIN",
      !direccionCompleta(s) && "dirección completa",
    ].filter(Boolean) as string[];
    return {
      id: s.id,
      nombre: s.nombre,
      nombreLegal: p?.nombre_legal ?? null,
      tipo: p?.tipo === "llc" ? "llc" : "persona",
      tinTipo: p?.tin_tipo ?? null,
      tinUltimos4: p?.tin_ultimos4 ?? null,
      w9: Boolean(p?.w9_firmado),
      direccion: s.direccion,
      ciudad: s.ciudad,
      estado: s.estado,
      codigoPostal: s.codigo_postal,
      telefono: s.telefono,
      correo: s.correo,
      total: centavos(suma.total),
      conTarjeta: centavos(suma.conTarjeta),
      faltan,
    };
  });
  filas.sort((a, b) => b.total - a.total);

  const minimo = minimo1099(anio);
  return {
    minimo,
    empresa: empresa ?? null,
    detalle,
    todos: filas,
    necesitan: filas.filter((f) => f.total >= minimo),
    debajo: filas.filter((f) => f.total < minimo),
  };
}
