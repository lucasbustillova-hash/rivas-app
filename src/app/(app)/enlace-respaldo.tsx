import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { diasDesde } from "./respaldo/ultimo";

// Enlace a "Respaldo" arriba, solo para administradores. Muestra un punto naranja
// si nunca se hizo uno o si el último tiene más de 7 días.
export async function EnlaceRespaldo() {
  if (!(await esAdmin())) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("respaldos")
    .select("hecho_en")
    .order("hecho_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  const atrasado = !data || diasDesde(data.hecho_en) > 7;

  return (
    <Link href="/respaldo" className="relative flex min-h-11 items-center px-2 text-sm text-stone-300 underline">
      Respaldo
      {atrasado && (
        <span aria-label="(conviene hacer uno)" className="absolute top-2 right-0 size-2 rounded-full bg-obra" />
      )}
    </Link>
  );
}
