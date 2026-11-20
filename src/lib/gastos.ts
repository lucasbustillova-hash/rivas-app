// Gastos del proyecto y ganancia real.

import type { Metodo } from "@/lib/cobros";

export type Categoria = "materiales" | "herramientas" | "permisos" | "basura" | "otro";

export type Gasto = {
  id: string;
  fecha: string;
  categoria: Categoria;
  descripcion: string;
  lugar: string | null;
  monto: number;
  metodo: Metodo;
  nota: string | null;
  recibo_ruta: string | null;
};

export const CATEGORIAS: { valor: Categoria; nombre: string }[] = [
  { valor: "materiales", nombre: "Materiales" },
  { valor: "herramientas", nombre: "Herramientas / alquiler" },
  { valor: "permisos", nombre: "Permisos" },
  { valor: "basura", nombre: "Dumpster / basura" },
  { valor: "otro", nombre: "Otro" },
];

export function nombreCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.nombre ?? valor;
}

// Sugerencias para "Dónde"; se puede escribir otro.
export const LUGARES = ["Home Depot", "Lowe's", "Floor & Decor", "Ferguson", "Sherwin-Williams"];

const centavos = (n: number) => Math.round(n * 100) / 100;

// Cuánto deja el proyecto.
// - ganancia: precio del contrato − mano de obra (lo ganado por los subs, pagado o no) − gastos.
// - enMano: lo que entró de verdad hasta hoy: cobrado − pagado a subs − gastos.
export function resumenGanancia({
  contrato,
  cobrado,
  manoDeObra,
  gastos,
}: {
  contrato: number | null;
  cobrado: number;
  manoDeObra: { ganado: number; pagado: number };
  gastos: Pick<Gasto, "categoria" | "monto">[];
}) {
  const totalGastos = centavos(gastos.reduce((t, g) => t + Number(g.monto), 0));
  const porCategoria = CATEGORIAS.map((c) => ({
    ...c,
    total: centavos(gastos.filter((g) => g.categoria === c.valor).reduce((t, g) => t + Number(g.monto), 0)),
  })).filter((c) => c.total > 0);
  const costo = centavos(manoDeObra.ganado + totalGastos);
  const ganancia = contrato == null ? null : centavos(contrato - costo);
  const margen = ganancia != null && contrato ? Math.round((ganancia / contrato) * 100) : null;
  const enMano = centavos(cobrado - manoDeObra.pagado - totalGastos);
  return { totalGastos, porCategoria, manoDeObra: manoDeObra.ganado, costo, ganancia, margen, enMano };
}
