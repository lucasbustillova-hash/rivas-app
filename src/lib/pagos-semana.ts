// Pagos a los subs por día: lo trabajado y no pagado hasta hoy, de todas las obras.
// No hay día de corte fijo: se paga lo que se debe al momento de pagar (viernes o sábado),
// y lo que se trabaje después aparece en el pago siguiente.

import { resumenAsignacion } from "@/lib/mano-de-obra";

export type AsignacionDia = {
  id: string;
  sub: { id: string; nombre: string };
  proyecto: { id: string; nombre: string };
  dias: { fecha: string; fraccion: number; tarifa: number }[];
  pagos: { monto: number }[];
};

export type DiaSinPagar = { fecha: string; fraccion: number; falta: number };
export type ObraAPagar = { asignacionId: string; proyectoId: string; proyecto: string; debe: number; dias: DiaSinPagar[] };
export type SubAPagar = { id: string; nombre: string; total: number; dias: number; desde: string; hasta: string; obras: ObraAPagar[] };

const centavos = (n: number) => Math.round(n * 100) / 100;

// Qué días quedan sin pagar: los pagos van cubriendo los días del más viejo al más nuevo.
export function diasSinPagar(dias: AsignacionDia["dias"], pagado: number): DiaSinPagar[] {
  let resto = pagado;
  const pendientes: DiaSinPagar[] = [];
  for (const d of [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const valor = centavos(Number(d.fraccion) * Number(d.tarifa));
    const cubierto = Math.min(Math.max(resto, 0), valor);
    resto = centavos(resto - cubierto);
    const falta = centavos(valor - cubierto);
    if (falta > 0) pendientes.push({ fecha: d.fecha, fraccion: Number(d.fraccion), falta });
  }
  return pendientes;
}

export function pagosPorSub(asignaciones: AsignacionDia[]): { subs: SubAPagar[]; total: number } {
  const porSub = new Map<string, SubAPagar>();
  for (const a of asignaciones) {
    const { pagado, debe } = resumenAsignacion({ modalidad: "dia", monto_contrato: null }, a.dias, a.pagos);
    if (debe <= 0) continue;
    const dias = diasSinPagar(a.dias, pagado);
    const s = porSub.get(a.sub.id) ?? { id: a.sub.id, nombre: a.sub.nombre, total: 0, dias: 0, desde: "", hasta: "", obras: [] };
    s.obras.push({ asignacionId: a.id, proyectoId: a.proyecto.id, proyecto: a.proyecto.nombre, debe, dias });
    s.total = centavos(s.total + debe);
    porSub.set(a.sub.id, s);
  }
  const subs = [...porSub.values()]
    .map((s) => {
      const fechas = s.obras.flatMap((o) => o.dias.map((d) => d.fecha)).sort();
      return {
        ...s,
        dias: s.obras.reduce((t, o) => t + o.dias.reduce((u, d) => u + d.fraccion, 0), 0),
        desde: fechas[0] ?? "",
        hasta: fechas.at(-1) ?? "",
        obras: s.obras.sort((x, y) => y.debe - x.debe),
      };
    })
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  return { subs, total: centavos(subs.reduce((t, s) => t + s.total, 0)) };
}
