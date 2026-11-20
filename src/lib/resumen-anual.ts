// Resumen del año para el contador: lo que entró y salió, por la fecha de cada pago
// (como lo ve el banco), sumado por proyecto y en total.

import { CATEGORIAS } from "@/lib/gastos";
import { METODOS } from "@/lib/cobros";

export type Movimiento = {
  fecha: string;
  proyectoId: string;
  monto: number;
  metodo: string;
};

export type CobroAnual = Movimiento;
export type PagoSubAnual = Movimiento & { sub: string };
export type GastoAnual = Movimiento & { categoria: string; descripcion: string; lugar: string | null };

export type ProyectoAnual = { id: string; nombre: string; cliente: string };

export type FilaProyecto = ProyectoAnual & { cobrado: number; subs: number; gastos: number; neto: number };

const centavos = (n: number) => Math.round(n * 100) / 100;
const sumar = (lista: { monto: number }[]) => centavos(lista.reduce((t, m) => t + Number(m.monto), 0));

export function resumenAnual({
  proyectos,
  cobros,
  pagosSubs,
  gastos,
}: {
  proyectos: ProyectoAnual[];
  cobros: CobroAnual[];
  pagosSubs: PagoSubAnual[];
  gastos: GastoAnual[];
}) {
  const vacia = (p: ProyectoAnual): FilaProyecto => ({ ...p, cobrado: 0, subs: 0, gastos: 0, neto: 0 });
  const filas = new Map(proyectos.map((p) => [p.id, vacia(p)]));
  const fila = (id: string) => {
    let f = filas.get(id);
    if (!f) {
      f = vacia({ id, nombre: "(proyecto borrado)", cliente: "" });
      filas.set(id, f);
    }
    return f;
  };
  for (const c of cobros) fila(c.proyectoId).cobrado += Number(c.monto);
  for (const p of pagosSubs) fila(p.proyectoId).subs += Number(p.monto);
  for (const g of gastos) fila(g.proyectoId).gastos += Number(g.monto);

  // Solo los proyectos que tuvieron algún movimiento en el año, el de más cobrado primero.
  const porProyecto = [...filas.values()]
    .filter((f) => f.cobrado || f.subs || f.gastos)
    .map((f) => {
      const cobrado = centavos(f.cobrado);
      const subs = centavos(f.subs);
      const gastosP = centavos(f.gastos);
      return { ...f, cobrado, subs, gastos: gastosP, neto: centavos(cobrado - subs - gastosP) };
    })
    .sort((a, b) => b.cobrado - a.cobrado || a.nombre.localeCompare(b.nombre));

  const cobrado = sumar(cobros);
  const subs = sumar(pagosSubs);
  const totalGastos = sumar(gastos);

  const gastosPorCategoria = CATEGORIAS.map((c) => ({
    valor: c.valor,
    nombre: c.nombre,
    total: sumar(gastos.filter((g) => g.categoria === c.valor)),
  })).filter((c) => c.total > 0);

  const cobradoPorMetodo = METODOS.map((m) => ({
    valor: m.valor,
    nombre: m.nombre,
    total: sumar(cobros.filter((c) => c.metodo === m.valor)),
  })).filter((m) => m.total > 0);

  return {
    porProyecto,
    totales: { cobrado, subs, gastos: totalGastos, neto: centavos(cobrado - subs - totalGastos) },
    gastosPorCategoria,
    cobradoPorMetodo,
  };
}
