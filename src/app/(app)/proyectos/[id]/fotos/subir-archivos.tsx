"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CARPETA, ETAPAS, MAXIMO_VIDEO_MB, rutaMini, type Etapa } from "@/lib/fotos";
import { registrarArchivo } from "./acciones";

const LADO_GRANDE = 2560; // La foto se achica a este tamaño antes de subirla.
const LADO_MINI = 480; // Versión chica para las listas.

// Fecha de hoy en el teléfono, como "2026-11-18".
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function aJpg(fuente: CanvasImageSource, ancho: number, alto: number, lado: number, calidad: number) {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  canvas.getContext("2d")!.drawImage(fuente, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
}

// Achica la foto y prepara su versión chica. Si el navegador no puede leerla, se sube tal cual.
async function prepararFoto(archivo: File) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const grande = await aJpg(img, img.naturalWidth, img.naturalHeight, LADO_GRANDE, 0.85);
    const mini = await aJpg(img, img.naturalWidth, img.naturalHeight, LADO_MINI, 0.75);
    return { grande, mini };
  } catch {
    return { grande: null, mini: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Saca un cuadro del video para mostrarlo en la lista. Si no se puede, el video queda sin imagen.
async function cuadroDeVideo(archivo: File): Promise<Blob | null> {
  const url = URL.createObjectURL(archivo);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const cuadro = await new Promise<Blob | null>((ok) => {
      const espera = setTimeout(() => ok(null), 5000);
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = async () => {
        clearTimeout(espera);
        ok(await aJpg(video, video.videoWidth, video.videoHeight, LADO_MINI, 0.75));
      };
      video.onerror = () => {
        clearTimeout(espera);
        ok(null);
      };
      video.src = url;
      video.load();
    });
    return cuadro;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extensionDe(archivo: File, porDefecto: string) {
  return archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || porDefecto;
}

// Botón para agregar fotos y videos: se eligen, se marca la etapa y se suben.
export function SubirArchivos({ proyectoId, etapaInicial }: { proyectoId: string; etapaInicial: Etapa }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<File[]>([]);
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);
  const [fecha, setFecha] = useState(hoyLocal);
  const [nota, setNota] = useState("");
  const [progreso, setProgreso] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  const fotos = elegidos.filter((a) => !a.type.startsWith("video/")).length;
  const videos = elegidos.length - fotos;
  const resumen = [
    fotos ? `${fotos} ${fotos === 1 ? "foto" : "fotos"}` : null,
    videos ? `${videos} ${videos === 1 ? "video" : "videos"}` : null,
  ]
    .filter(Boolean)
    .join(" y ");

  const elegir = (lista: FileList | null) => {
    setErrores([]);
    setElegidos(lista ? [...lista] : []);
    setFecha(hoyLocal());
  };

  const cancelar = () => {
    setElegidos([]);
    setNota("");
    if (entrada.current) entrada.current.value = "";
  };

  const subir = async () => {
    const supabase = createClient();
    const fallas: string[] = [];
    for (const [i, archivo] of elegidos.entries()) {
      setProgreso(`Subiendo ${i + 1} de ${elegidos.length}…`);
      const esVideo = archivo.type.startsWith("video/");
      const nombre = `${proyectoId}/${crypto.randomUUID()}`;

      let ruta: string;
      let contenido: Blob = archivo;
      let mini: Blob | null;
      if (esVideo) {
        if (archivo.size > MAXIMO_VIDEO_MB * 1024 * 1024) {
          fallas.push(`${archivo.name}: pesa más de ${MAXIMO_VIDEO_MB} MB (grabá videos más cortos).`);
          continue;
        }
        ruta = `${nombre}.${extensionDe(archivo, "mp4")}`;
        mini = await cuadroDeVideo(archivo);
      } else {
        const preparada = await prepararFoto(archivo);
        if (preparada.grande) {
          ruta = `${nombre}.jpg`;
          contenido = preparada.grande;
        } else {
          ruta = `${nombre}.${extensionDe(archivo, "jpg")}`;
        }
        mini = preparada.mini;
      }

      const { error } = await supabase.storage
        .from(CARPETA)
        .upload(ruta, contenido, { contentType: contenido.type || archivo.type || undefined });
      if (error) {
        fallas.push(`${archivo.name}: no se pudo subir. Revisá la conexión.`);
        continue;
      }
      if (mini) await supabase.storage.from(CARPETA).upload(rutaMini(ruta), mini, { contentType: "image/jpeg" });

      const r = await registrarArchivo({
        proyectoId,
        ruta,
        tipo: esVideo ? "video" : "foto",
        etapa,
        nota,
        fecha,
        hoy: hoyLocal(),
      });
      if (r.error) fallas.push(`${archivo.name}: ${r.error}`);
    }
    setProgreso(null);
    setErrores(fallas);
    cancelar();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <label
        className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro ${
          elegidos.length || progreso ? "hidden" : ""
        }`}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        Agregar fotos o videos
        <input
          ref={entrada}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => elegir(e.target.files)}
        />
      </label>

      {progreso && <p className="rounded-xl bg-white p-4 text-center font-semibold shadow-sm">{progreso}</p>}

      {elegidos.length > 0 && !progreso && (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-semibold">{resumen}</p>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-sm font-medium">Etapa</legend>
            <div className="grid grid-cols-3 gap-2">
              {ETAPAS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  aria-pressed={etapa === e.valor}
                  onClick={() => setEtapa(e.valor)}
                  className={`h-11 rounded-xl border text-sm font-semibold ${
                    etapa === e.valor ? "border-tinta bg-tinta text-white" : "border-borde bg-white"
                  }`}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Fecha
            <input
              type="date"
              value={fecha}
              max={hoyLocal()}
              onChange={(e) => setFecha(e.target.value)}
              className="h-12 rounded-xl border border-borde bg-white px-3 text-base"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nota (opcional)
            <input
              type="text"
              value={nota}
              maxLength={500}
              placeholder="Ej.: drywall terminado"
              onChange={(e) => setNota(e.target.value)}
              className="h-12 rounded-xl border border-borde bg-white px-3 text-base"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={cancelar} className="h-12 rounded-xl border border-borde bg-white font-semibold">
              Cancelar
            </button>
            <button type="button" onClick={subir} className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro">
              Subir
            </button>
          </div>
        </div>
      )}

      {errores.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
