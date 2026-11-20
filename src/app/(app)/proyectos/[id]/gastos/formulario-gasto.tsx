"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { METODOS } from "@/lib/cobros";
import { CATEGORIAS, LUGARES } from "@/lib/gastos";
import { campo, etiqueta } from "@/lib/estilos";
import { registrarGasto, type EstadoGasto } from "./acciones";

const MAXIMO_MB = 20; // límite de la carpeta "documentos"
const LADO = 2000; // la foto del recibo se achica a este tamaño (se sigue leyendo bien)

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Achica la foto del recibo. Si es un PDF o no se puede leer, se sube tal cual.
async function prepararRecibo(archivo: File): Promise<{ datos: Blob; extension: string }> {
  const original = { datos: archivo, extension: archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf" };
  if (!archivo.type.startsWith("image/")) return original;
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpg = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
    return jpg ? { datos: jpg, extension: "jpg" } : original;
  } catch {
    return original;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Anotar un gasto: qué, dónde, cuánto, cómo se pagó y la foto del recibo (opcional).
export function FormularioGasto({ proyectoId }: { proyectoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, guardando] = useActionState<EstadoGasto, FormData>(registrarGasto.bind(null, proyectoId), {
    error: null,
  });
  const [ultimo, setUltimo] = useState(estado);
  const [subiendo, setSubiendo] = useState(false);
  const [errorRecibo, setErrorRecibo] = useState<string | null>(null);
  const [nombreRecibo, setNombreRecibo] = useState<string | null>(null);
  // Si guardar falla y se vuelve a intentar con el mismo recibo, no se sube dos veces.
  const subido = useRef<{ archivo: File; ruta: string } | null>(null);

  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado.listo) {
      setAbierto(false);
      setNombreRecibo(null);
    }
  }

  if (!abierto) {
    return (
      <div className="flex flex-col gap-2">
        {estado.listo && !guardando && <p className="text-sm font-semibold text-green-800">Gasto anotado.</p>}
        <button
          type="button"
          onClick={() => {
            subido.current = null;
            setAbierto(true);
          }}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro"
        >
          + Anotar gasto
        </button>
      </div>
    );
  }

  const enviar = async (formulario: HTMLFormElement) => {
    setErrorRecibo(null);
    const datos = new FormData(formulario);
    const archivo = datos.get("recibo");
    datos.delete("recibo");
    if (archivo instanceof File && archivo.size > 0) {
      if (subido.current?.archivo === archivo) {
        datos.set("recibo_ruta", subido.current.ruta);
      } else {
        if (archivo.size > MAXIMO_MB * 1024 * 1024) {
          setErrorRecibo(`El recibo tiene que pesar menos de ${MAXIMO_MB} MB.`);
          return;
        }
        setSubiendo(true);
        const { datos: contenido, extension } = await prepararRecibo(archivo);
        const ruta = `recibos/${proyectoId}/${Date.now()}.${extension}`;
        const { error } = await createClient()
          .storage.from("documentos")
          .upload(ruta, contenido, { contentType: contenido.type || undefined });
        setSubiendo(false);
        if (error) {
          setErrorRecibo("No se pudo subir el recibo. Probá de nuevo o guardalo sin recibo.");
          return;
        }
        subido.current = { archivo, ruta };
        datos.set("recibo_ruta", ruta);
      }
    }
    startTransition(() => accion(datos));
  };

  const ocupado = subiendo || guardando;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enviar(e.currentTarget);
      }}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold">Gasto nuevo</h2>
      <fieldset className="flex flex-col">
        <legend className="pb-1.5 text-sm font-medium">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c, i) => (
            <label
              key={c.valor}
              className="flex h-11 cursor-pointer items-center rounded-xl border border-borde px-3.5 text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
            >
              <input type="radio" name="categoria" value={c.valor} defaultChecked={i === 0} className="sr-only" />
              {c.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={etiqueta}>
        En qué
        <input name="descripcion" required maxLength={200} placeholder="Ej.: cerámica, pegamento y lechada" className={campo} />
      </label>
      <label className={etiqueta}>
        Dónde (opcional)
        <input name="lugar" maxLength={100} list="lugares-gasto" placeholder="Ej.: Home Depot" className={campo} />
        <datalist id="lugares-gasto">
          {LUGARES.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={etiqueta}>
          Monto (USD)
          <input name="monto" inputMode="decimal" required placeholder="Ej.: 245.80" className={campo} />
        </label>
        <label className={etiqueta}>
          Fecha
          <input type="date" name="fecha" required defaultValue={hoyLocal()} max={hoyLocal()} className={campo} />
        </label>
      </div>
      <fieldset className="flex flex-col">
        <legend className="pb-1.5 text-sm font-medium">Forma de pago</legend>
        <div className="flex flex-wrap gap-2">
          {METODOS.map((m) => (
            <label
              key={m.valor}
              className="flex h-11 cursor-pointer items-center rounded-xl border border-borde px-3.5 text-sm font-semibold has-checked:border-tinta has-checked:bg-tinta has-checked:text-white"
            >
              <input type="radio" name="metodo" value={m.valor} defaultChecked={m.valor === "tarjeta"} className="sr-only" />
              {m.valor === "tarjeta" ? "Tarjeta" : m.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-borde px-3 text-sm font-semibold text-obra">
        <span className="truncate">{nombreRecibo ? `Recibo: ${nombreRecibo}` : "📷 Foto del recibo (opcional)"}</span>
        <input
          type="file"
          name="recibo"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => setNombreRecibo(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      <label className={etiqueta}>
        Nota (opcional)
        <input name="nota" maxLength={500} placeholder="Ej.: devolver 2 cajas que sobraron" className={campo} />
      </label>
      {(errorRecibo || estado.error) && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorRecibo ?? estado.error}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-12 rounded-xl border border-borde bg-white font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={ocupado}
          className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro disabled:opacity-60"
        >
          {subiendo ? "Subiendo recibo…" : guardando ? "Guardando…" : "Guardar gasto"}
        </button>
      </div>
    </form>
  );
}
