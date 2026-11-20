// Contrato, plan de pagos y pagos recibidos del cliente.

export type Plan = "50_50" | "40_30_30" | "propio";
export type Metodo = "efectivo" | "zelle" | "cheque" | "tarjeta" | "otro";

export type Contrato = { proyecto_id: string; monto_total: number; plan: Plan };
export type Cuota = { id: string; orden: number; descripcion: string; monto: number };
export type PagoCliente = { id: string; fecha: string; monto: number; metodo: Metodo; nota: string | null };

export const PLANES: { valor: Plan; nombre: string; cuotas: { descripcion: string; porcentaje: number }[] }[] = [
  {
    valor: "50_50",
    nombre: "50 / 50",
    cuotas: [
      { descripcion: "Al empezar", porcentaje: 50 },
      { descripcion: "Al terminar", porcentaje: 50 },
    ],
  },
  {
    valor: "40_30_30",
    nombre: "40 / 30 / 30",
    cuotas: [
      { descripcion: "Al empezar", porcentaje: 40 },
      { descripcion: "A mitad de obra", porcentaje: 30 },
      { descripcion: "Al terminar", porcentaje: 30 },
    ],
  },
  { valor: "propio", nombre: "Propio", cuotas: [] },
];

export const METODOS: { valor: Metodo; nombre: string }[] = [
  { valor: "efectivo", nombre: "Efectivo" },
  { valor: "zelle", nombre: "Zelle" },
  { valor: "cheque", nombre: "Cheque" },
  { valor: "tarjeta", nombre: "Tarjeta (Melio)" },
  { valor: "otro", nombre: "Otro" },
];

export function nombreMetodo(valor: string) {
  return METODOS.find((m) => m.valor === valor)?.nombre ?? valor;
}

// $1,500 o $1,500.50
export function dinero(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// "1,500.50" o "$1500" → 1500.5. Devuelve null si no es un monto válido.
export function leerMonto(texto: string) {
  const limpio = texto.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100) / 100;
}

// Reparte el total según los porcentajes; la última cuota se lleva los centavos que sobran.
export function cuotasDelPlan(plan: Plan, total: number) {
  const datos = PLANES.find((p) => p.valor === plan)?.cuotas ?? [];
  let resto = total;
  return datos.map((c, i) => {
    const monto = i === datos.length - 1 ? Math.round(resto * 100) / 100 : Math.round(total * c.porcentaje) / 100;
    resto -= monto;
    return { descripcion: c.descripcion, monto };
  });
}

export type EstadoCuota = Cuota & { cubierto: number; estado: "pagada" | "parcial" | "pendiente" };

// Lo pagado va cubriendo las cuotas en orden.
export function estadoCuotas(cuotas: Cuota[], pagado: number): EstadoCuota[] {
  let disponible = pagado;
  return [...cuotas]
    .sort((a, b) => a.orden - b.orden)
    .map((c) => {
      const monto = Number(c.monto);
      const cubierto = Math.min(monto, Math.max(0, disponible));
      disponible -= cubierto;
      const estado = cubierto >= monto - 0.004 ? "pagada" : cubierto > 0 ? "parcial" : "pendiente";
      return { ...c, monto, cubierto: Math.round(cubierto * 100) / 100, estado };
    });
}

export function resumenCobro(contrato: Pick<Contrato, "monto_total">, cuotas: Cuota[], pagos: Pick<PagoCliente, "monto">[]) {
  const total = Number(contrato.monto_total);
  const pagado = Math.round(pagos.reduce((t, p) => t + Number(p.monto), 0) * 100) / 100;
  const falta = Math.max(0, Math.round((total - pagado) * 100) / 100);
  const deMas = Math.max(0, Math.round((pagado - total) * 100) / 100);
  const porcentaje = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 0;
  const estados = estadoCuotas(cuotas, pagado);
  const proxima = estados.find((c) => c.estado !== "pagada") ?? null;
  return { total, pagado, falta, deMas, porcentaje, estados, proxima };
}
