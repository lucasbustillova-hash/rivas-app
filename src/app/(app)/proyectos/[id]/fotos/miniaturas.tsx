import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CARPETA, rutaMini, type ArchivoProyecto } from "@/lib/fotos";

// Enlaces temporales (1 hora) a las versiones chicas: la carpeta es privada.
export async function enlacesMini(supabase: SupabaseClient, archivos: ArchivoProyecto[]) {
  const enlaces = new Map<string, string>();
  if (archivos.length === 0) return enlaces;
  const { data } = await supabase.storage.from(CARPETA).createSignedUrls(
    archivos.map((a) => rutaMini(a.ruta)),
    3600,
  );
  for (const e of data ?? []) if (e.signedUrl && e.path) enlaces.set(e.path, e.signedUrl);
  return enlaces;
}

// Cuadrícula de fotos y videos; cada uno abre su pantalla.
export function Miniaturas({ archivos, enlaces }: { archivos: ArchivoProyecto[]; enlaces: Map<string, string> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {archivos.map((a) => {
        const url = enlaces.get(rutaMini(a.ruta));
        return (
          <Link
            key={a.id}
            href={`/proyectos/${a.proyecto_id}/fotos/${a.id}`}
            className="relative aspect-square overflow-hidden rounded-lg bg-stone-300"
            aria-label={a.nota || (a.tipo === "video" ? "Video" : "Foto")}
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element -- enlace temporal de Supabase
              <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            )}
            {a.tipo === "video" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            )}
            {a.nota && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
                {a.nota}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
