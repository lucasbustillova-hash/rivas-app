import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dinero } from "@/lib/cobros";
import { cargarPendientes } from "./datos";

// Arriba de la lista de proyectos (solo administradores): los dos totales y el enlace a Cuentas pendientes.
export async function CuentasEnInicio() {
  const supabase = await createClient();
  let cuentas;
  try {
    cuentas = await cargarPendientes(supabase);
  } catch {
    return null;
  }
  const { debemos, nosDeben } = cuentas;
  return (
    <Link
      href="/pendientes"
      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-stone-50"
    >
      <span className="grid flex-1 grid-cols-2 gap-3 tabular-nums">
        <span className="flex flex-col">
          <span className="text-xs text-texto-suave">Debemos a subs</span>
          <strong className={debemos > 0 ? "text-orange-700" : "text-green-800"}>{dinero(debemos)}</strong>
        </span>
        <span className="flex flex-col">
          <span className="text-xs text-texto-suave">Nos deben clientes</span>
          <strong>{dinero(nosDeben)}</strong>
        </span>
      </span>
      <span aria-hidden="true" className="text-xl text-obra">
        ›
      </span>
    </Link>
  );
}
