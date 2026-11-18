import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { FormularioSub } from "../formulario-sub";

export default async function NuevoSubPage() {
  const admin = await esAdmin();
  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/subs" volverTexto="Subcontratistas" titulo="Nuevo subcontratista" />
      <FormularioSub admin={admin} />
    </main>
  );
}
