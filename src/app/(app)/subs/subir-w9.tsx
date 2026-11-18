"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marcarW9 } from "./acciones";

// Sube el W-9 firmado (PDF o foto) a la carpeta privada "documentos".
export function SubirW9({ subId, tiene }: { subId: string; tiene: boolean }) {
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
    const ruta = `w9/${subId}/${Date.now()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("documentos").upload(ruta, archivo, { contentType: archivo.type });
    if (error) {
      setEstado("error");
      return;
    }
    const r = await marcarW9(subId, ruta);
    setEstado(r.error ? "error" : "listo");
    router.refresh();
  };

  return (
    <span className="flex flex-col gap-1">
      <label className="w-fit cursor-pointer text-sm font-semibold text-obra">
        {estado === "subiendo" ? "Subiendo…" : tiene ? "Reemplazar W-9" : "Subir W-9 (PDF o foto)"}
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
