import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import type { Sub, SubPrivado } from "@/lib/subs";
import { FormularioSub } from "../../formulario-sub";

export default async function EditarSubPage({ params }: PageProps<"/subs/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await esAdmin();

  const [{ data: sub }, { data: privado }] = await Promise.all([
    supabase.from("subcontratistas").select("*").eq("id", id).maybeSingle<Sub>(),
    admin
      ? supabase.from("subcontratistas_privado").select("*").eq("subcontratista_id", id).maybeSingle<SubPrivado>()
      : Promise.resolve({ data: null }),
  ]);
  if (!sub) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver={`/subs/${id}`} volverTexto={sub.nombre} titulo="Editar subcontratista" />
      <FormularioSub sub={sub} privado={privado} admin={admin} />
    </main>
  );
}
