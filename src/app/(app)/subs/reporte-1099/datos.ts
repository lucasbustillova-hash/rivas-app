import type { SupabaseClient } from "@supabase/supabase-js";
import { minimo1099 } from "@/lib/subs";

export type Fila1099 = {
  id: string;
  nombre: string;
  nombreLegal: string | null;
  tipo: "persona" | "llc";
  tinTipo: "ssn" | "ein" | null;
  tinUltimos4: string | null;
  w9: boolean;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  total: number; // lo que va en la 1099-NEC (sin tarjeta)
  conTarjeta: number; // pagado con tarjeta: no va en la 1099-NEC
  faltan: string[];
};

const centavos = (n: number) => Math.round(n * 100) / 100;

// Pagos a subs del año, sumados por sub, con los datos que pide la 1099-NEC.
export async function cargarReporte1099(supabase: SupabaseClient, anio: number) {
  const pagos: { monto: number; metodo: string; asignaciones: { subcontratista_id: string } | null }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("pagos_sub")
      .select("monto, metodo, asignaciones(subcontratista_id)")
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`)
      .range(desde, desde + 999);
    if (error) throw new Error("No se pudieron leer los pagos.");
    pagos.push(...((data ?? []) as unknown as typeof pagos));
    if (!data || data.length < 1000) break;
  }

  const sumas = new Map<string, { total: number; conTarjeta: number }>();
  for (const p of pagos) {
    const subId = p.asignaciones?.subcontratista_id;
    if (!subId) continue;
    const s = sumas.get(subId) ?? { total: 0, conTarjeta: 0 };
    if (p.metodo === "tarjeta") s.conTarjeta += Number(p.monto);
    else s.total += Number(p.monto);
    sumas.set(subId, s);
  }

  const ids = [...sumas.keys()];
  const [{ data: subs }, { data: privados }] = ids.length
    ? await Promise.all([
        supabase.from("subcontratistas").select("id, nombre, direccion, telefono, correo").in("id", ids),
        supabase
          .from("subcontratistas_privado")
          .select("subcontratista_id, nombre_legal, tipo, tin_tipo, tin_ultimos4, w9_firmado")
          .in("subcontratista_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const privadoDe = new Map((privados ?? []).map((p) => [p.subcontratista_id as string, p]));

  const filas: Fila1099[] = (subs ?? []).map((s) => {
    const p = privadoDe.get(s.id);
    const suma = sumas.get(s.id)!;
    const faltan = [
      !p?.w9_firmado && "W-9",
      !p?.nombre_legal && "nombre legal",
      !p?.tin_ultimos4 && "SSN/EIN",
      !s.direccion && "dirección",
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
    necesitan: filas.filter((f) => f.total >= minimo),
    debajo: filas.filter((f) => f.total < minimo),
  };
}
