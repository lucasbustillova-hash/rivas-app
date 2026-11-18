// Subs trabajando en un proyecto: por día o por contrato, y lo que se les pagó.

export type Modalidad = "dia" | "contrato";

export type Asignacion = {
  id: string;
  proyecto_id: string;
  subcontratista_id: string;
  modalidad: Modalidad;
  tarifa_diaria: number | null;
  monto_contrato: number | null;
  descripcion: string | null;
  contrato_ruta?: string | null;
};

export type DiaTrabajado = { id: string; fecha: string; fraccion: number; tarifa: number };
export type PagoSub = {
  id: string;
  fecha: string;
  monto: number;
  metodo: string;
  es_adelanto: boolean;
  nota: string | null;
};

const centavos = (n: number) => Math.round(n * 100) / 100;

// Días, lo ganado (días × tarifa, o el monto del contrato), lo pagado y lo que se le debe.
export function resumenAsignacion(
  asignacion: Pick<Asignacion, "modalidad" | "monto_contrato">,
  dias: Pick<DiaTrabajado, "fraccion" | "tarifa">[],
  pagos: Pick<PagoSub, "monto">[],
) {
  const cantidadDias = dias.reduce((t, d) => t + Number(d.fraccion), 0);
  const ganado =
    asignacion.modalidad === "contrato"
      ? Number(asignacion.monto_contrato ?? 0)
      : centavos(dias.reduce((t, d) => t + Number(d.fraccion) * Number(d.tarifa), 0));
  const pagado = centavos(pagos.reduce((t, p) => t + Number(p.monto), 0));
  return { dias: cantidadDias, ganado, pagado, debe: centavos(ganado - pagado) };
}

// 1 → "1 día", 2.5 → "2½ días", 0.5 → "½ día"
export function textoDias(n: number) {
  const enteros = Math.floor(n);
  const medio = n - enteros >= 0.5;
  const numero = `${enteros || (medio ? "" : "0")}${medio ? "½" : ""}`;
  return `${numero} ${n > 0 && n <= 1 ? "día" : "días"}`;
}
