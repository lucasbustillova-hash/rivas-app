// Cuentas pendientes de todas las obras: a quién le debemos y quién nos debe.

import { resumenAsignacion, type Modalidad } from "@/lib/mano-de-obra";
import { resumenCobro, type Cuota } from "@/lib/cobros";
import type { EstadoProyecto } from "@/lib/proyectos";

type ProyectoBasico = { id: string; nombre: string; estado: EstadoProyecto };

export type AsignacionLeida = {
  id: string;
  modalidad: Modalidad;
  monto_contrato: number | null;
  sub: { id: string; nombre: string };
  proyecto: ProyectoBasico;
  dias: { fraccion: number; tarifa: number }[];
  pagos: { monto: number }[];
};

export type ContratoLeido = {
  monto_total: number;
  proyecto: ProyectoBasico & { cliente: string };
  cuotas: Cuota[];
  pagos: { monto: number }[];
};

export type DeudaObra = { asignacionId: string; proyectoId: string; proyecto: string; modalidad: Modalidad; debe: number };
export type DeudaSub = { id: string; nombre: string; total: number; obras: DeudaObra[] };
export type ContratoEnCurso = {
  asignacionId: string;
  proyectoId: string;
  proyecto: string;
  sub: string;
  monto: number;
  pagado: number;
  falta: number;
};
export type CobroPendiente = {
  proyectoId: string;
  proyecto: string;
  cliente: string;
  estado: EstadoProyecto;
  total: number;
  pagado: number;
  falta: number;
  proxima: { descripcion: string; falta: number } | null;
};

const centavos = (n: number) => Math.round(n * 100) / 100;

export function cuentasPendientes({ asignaciones, contratos }: { asignaciones: AsignacionLeida[]; contratos: ContratoLeido[] }) {
  // Subs: lo que se le debe ya en cada obra (si se le pagó de más en una, queda en negativo y se descuenta).
  // Un contrato cuenta como deuda recién cuando la obra está terminada; mientras tanto va aparte, en "en curso".
  const porSub = new Map<string, DeudaSub>();
  const enCurso: ContratoEnCurso[] = [];
  for (const a of asignaciones) {
    const { ganado, pagado, debe } = resumenAsignacion(a, a.dias, a.pagos);
    if (Math.abs(debe) < 0.005) continue;
    if (a.modalidad === "contrato" && a.proyecto.estado !== "terminado") {
      enCurso.push({ asignacionId: a.id, proyectoId: a.proyecto.id, proyecto: a.proyecto.nombre, sub: a.sub.nombre, monto: ganado, pagado, falta: debe });
      continue;
    }
    const s = porSub.get(a.sub.id) ?? { id: a.sub.id, nombre: a.sub.nombre, total: 0, obras: [] };
    s.obras.push({ asignacionId: a.id, proyectoId: a.proyecto.id, proyecto: a.proyecto.nombre, modalidad: a.modalidad, debe });
    s.total = centavos(s.total + debe);
    porSub.set(a.sub.id, s);
  }
  const subs = [...porSub.values()]
    .map((s) => ({ ...s, obras: s.obras.sort((x, y) => y.debe - x.debe) }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));

  // Clientes: lo que falta cobrar. Los estimados no cuentan: todavía no arrancó la obra.
  const clientes: CobroPendiente[] = contratos
    .filter((c) => c.proyecto.estado !== "estimado")
    .map((c) => {
      const r = resumenCobro(c, c.cuotas, c.pagos);
      return {
        proyectoId: c.proyecto.id,
        proyecto: c.proyecto.nombre,
        cliente: c.proyecto.cliente,
        estado: c.proyecto.estado,
        total: r.total,
        pagado: r.pagado,
        falta: r.falta,
        proxima: r.proxima ? { descripcion: r.proxima.descripcion, falta: centavos(r.proxima.monto - r.proxima.cubierto) } : null,
      };
    })
    .filter((c) => c.falta > 0)
    .sort((a, b) => b.falta - a.falta);

  enCurso.sort((a, b) => b.falta - a.falta || a.sub.localeCompare(b.sub));

  return {
    subs,
    enCurso,
    clientes,
    debemos: centavos(subs.reduce((t, s) => t + Math.max(0, s.total), 0)),
    enCursoTotal: centavos(enCurso.reduce((t, c) => t + Math.max(0, c.falta), 0)),
    nosDeben: centavos(clientes.reduce((t, c) => t + c.falta, 0)),
  };
}
