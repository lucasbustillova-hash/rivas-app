import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CARPETA, datosEtapa, diaDe, tituloDia, type ArchivoProyecto } from "@/lib/fotos";
import { Encabezado } from "../../../encabezado";
import { EditarArchivo } from "./editar-archivo";

// Una foto o video en grande, con su etapa, fecha y nota.
export default async function ArchivoPage({ params }: PageProps<"/proyectos/[id]/fotos/[archivo]">) {
  const { id, archivo: archivoId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("archivos_proyecto")
    .select("id, proyecto_id, ruta, tipo, etapa, nota, tomada_en")
    .eq("id", archivoId)
    .eq("proyecto_id", id)
    .maybeSingle();
  if (!data) notFound();

  const archivo = data as ArchivoProyecto;
  const { data: enlace } = await supabase.storage.from(CARPETA).createSignedUrl(archivo.ruta, 3600);
  const url = enlace?.signedUrl;
  const dia = diaDe(archivo.tomada_en);
  const etapa = datosEtapa(archivo.etapa);

  return (
    <main className="flex flex-1 flex-col">
      <Encabezado
        volver={`/proyectos/${id}/fotos`}
        volverTexto="Fotos y videos"
        titulo={archivo.tipo === "video" ? "Video" : "Foto"}
        subtitulo={tituloDia(dia)}
      >
        <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${etapa?.chip}`}>{etapa?.nombre}</span>
      </Encabezado>

      <div className="bg-black">
        {!url && <p className="p-6 text-center text-stone-300">No se pudo abrir el archivo.</p>}
        {url && archivo.tipo === "video" && (
          <video src={url} controls playsInline preload="metadata" className="max-h-[70vh] w-full" />
        )}
        {url && archivo.tipo === "foto" && (
          <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir la foto en tamaño completo">
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace temporal de Supabase */}
            <img src={url} alt={archivo.nota ?? "Foto de la obra"} className="max-h-[70vh] w-full object-contain" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {archivo.nota && <p className="rounded-2xl bg-white p-4 shadow-sm">{archivo.nota}</p>}
        <EditarArchivo archivo={archivo} dia={dia} />
      </div>
    </main>
  );
}
