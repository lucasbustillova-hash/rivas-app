"use client";

import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dinero } from "@/lib/cobros";
import { campo, etiqueta } from "@/lib/estilos";
import { editarContrato, marcarContratoArchivo, type EstadoFormulario } from "../acciones";

// Tarea y monto acordado, con opción de cambiarlos.
export function DatosContrato({
  asignacionId,
  descripcion,
  monto,
}: {
  asignacionId: string;
  descripcion: string;
  monto: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(editarContrato.bind(null, asignacionId), {
    error: null,
  });

  if (!abierto) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">
            <strong>{descripcion}</strong> · {dinero(monto)}
          </span>
          <button type="button" onClick={() => setAbierto(true)} className="shrink-0 text-sm font-semibold text-obra">
            Cambiar
          </button>
        </div>
        {estado.error && <span className="text-sm text-red-700">{estado.error}</span>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => {
          accion(datos);
          setAbierto(false);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <label className={etiqueta}>
        Tarea
        <input name="descripcion" required maxLength={200} defaultValue={descripcion} className={campo} />
      </label>
      <label className={etiqueta}>
        Monto acordado (USD)
        <input name="monto_contrato" inputMode="decimal" required defaultValue={monto} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-xl border border-borde font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="h-11 rounded-xl bg-obra font-semibold text-white disabled:opacity-60">
          Guardar
        </button>
      </div>
    </form>
  );
}

// Subir el acuerdo firmado (PDF o foto) a la carpeta privada "documentos".
export function SubirContrato({ asignacionId, tiene }: { asignacionId: string; tiene: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"listo" | "subiendo" | "error">("listo");

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > 20 * 1024 * 1024) {
      setEstado("error");
      return;
    }
    setEstado("subiendo");
    const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    const ruta = `contratos/${asignacionId}/${Date.now()}.${extension}`;
    const { error } = await createClient()
      .storage.from("documentos")
      .upload(ruta, archivo, { contentType: archivo.type || undefined });
    if (error) {
      setEstado("error");
      return;
    }
    const r = await marcarContratoArchivo(asignacionId, ruta);
    setEstado(r.error ? "error" : "listo");
    router.refresh();
  };

  return (
    <span className="flex flex-col gap-1">
      <label className="w-fit cursor-pointer text-sm font-semibold text-obra">
        {estado === "subiendo" ? "Subiendo…" : tiene ? "Reemplazar acuerdo" : "Subir acuerdo firmado (opcional)"}
        <input
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          disabled={estado === "subiendo"}
          onChange={(e) => subir(e.target.files?.[0])}
        />
      </label>
      {estado === "error" && <span className="text-xs text-red-700">No se pudo subir. Tiene que pesar menos de 20 MB.</span>}
    </span>
  );
}
