import type { SupabaseClient } from "@supabase/supabase-js";
import { Logo } from "@/components/logo";
import { lineasDireccion } from "@/lib/subs";

export type DatosMembrete = {
  nombre_legal: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
  telefono: string | null;
};

// Datos de NAHOMY para los papeles que se imprimen (recibos, estados de cuenta). Solo administradores.
export async function cargarMembrete(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("empresa")
    .select("nombre_legal, direccion, ciudad, estado, codigo_postal, telefono")
    .maybeSingle<DatosMembrete>();
  return data ?? null;
}

// Franja de arriba con el logo y los datos de la empresa. Se imprime con su color.
export function Membrete({ empresa }: { empresa: DatosMembrete | null }) {
  return (
    <header className="flex items-center justify-between gap-4 bg-tinta px-5 py-4 text-white [print-color-adjust:exact]">
      <Logo className="w-32" />
      <div className="text-right text-xs leading-relaxed text-stone-200">
        <p className="font-semibold text-white">{empresa?.nombre_legal || "NAHOMY Pro Construction"}</p>
        {empresa && lineasDireccion(empresa).map((l) => <p key={l}>{l}</p>)}
        {empresa?.telefono && <p>{empresa.telefono}</p>}
      </div>
    </header>
  );
}

// Aviso (no se imprime) si faltan los datos de la empresa.
export function AvisoMembrete({ empresa }: { empresa: DatosMembrete | null }) {
  if (empresa?.nombre_legal) return null;
  return (
    <p className="rounded-xl bg-orange-100 p-3 text-sm text-orange-900 print:hidden">
      Faltan los datos de la empresa (nombre legal, dirección y teléfono). Se cargan en Subcontratistas → Reporte 1099 →
      Datos de la empresa.
    </p>
  );
}

// Un dato del papel, con su nombre en español e inglés.
export function DatoPapel({ es, en, children }: { es: string; en: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-texto-suave">
        {es}
        <span className="block text-xs">{en}</span>
      </dt>
      <dd className="font-medium">{children}</dd>
    </>
  );
}

// Una línea de totales, en español e inglés.
export function LineaPapel({ es, en, valor, fuerte = false }: { es: string; en: string; valor: string; fuerte?: boolean }) {
  return (
    <>
      <dt className={fuerte ? "font-semibold" : "text-texto-suave"}>
        {es} <span className="text-xs font-normal text-texto-suave">/ {en}</span>
      </dt>
      <dd className={`text-right ${fuerte ? "font-bold" : ""}`}>{valor}</dd>
    </>
  );
}
