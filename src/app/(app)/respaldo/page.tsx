import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { Encabezado } from "@/components/encabezado";
import { ComprobarRespaldo } from "./comprobar-respaldo";
import { DescargarRespaldo } from "./descargar-respaldo";
import { diasDesde } from "./ultimo";

// Respaldo de toda la app en un archivo con contraseña (solo administradores).
export default async function RespaldoPage() {
  if (!(await esAdmin())) notFound();
  const supabase = await createClient();
  const { data: ultimos } = await supabase
    .from("respaldos")
    .select("hecho_en, archivos, bytes")
    .order("hecho_en", { ascending: false })
    .limit(5);
  const ultimo = ultimos?.[0];
  const dias = ultimo ? diasDesde(ultimo.hecho_en) : null;
  const formato = new Intl.DateTimeFormat("es-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado volver="/" volverTexto="Proyectos" titulo="Respaldo" subtitulo="Una copia de todo, fuera de Supabase" />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div
          className={`rounded-xl p-3.5 text-sm ${
            dias === null || dias > 7 ? "bg-orange-100 text-orange-900" : "bg-green-50 text-green-900"
          }`}
        >
          {ultimo ? (
            <>
              Último respaldo: <strong>{formato.format(new Date(ultimo.hecho_en))}</strong>
              {dias === 0 ? " (hoy)" : dias === 1 ? " (ayer)" : ` (hace ${dias} días)`}.
              {dias !== null && dias > 7 && " Conviene hacer uno nuevo: se recomienda una vez por semana."}
            </>
          ) : (
            <>Todavía no se hizo ningún respaldo. Hacé uno antes de cargar datos reales.</>
          )}
        </div>
        <DescargarRespaldo />
        <ComprobarRespaldo />
      </div>
    </main>
  );
}
