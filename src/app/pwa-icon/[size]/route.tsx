import { connection } from "next/server";
import { iconoApp } from "@/lib/icono";

// 180 = ícono del iPhone ("Agregar a pantalla de inicio"); 192 y 512 = manifiesto.
const TAMANOS = ["180", "192", "512"];

// Íconos de la app: /pwa-icon/180, /pwa-icon/192 y /pwa-icon/512.
// Se generan al pedirlos (no al compilar): generarlos durante la compilación
// hace fallar el build en Windows.
export async function GET(_request: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  await connection();
  const { size } = await ctx.params;
  if (!TAMANOS.includes(size)) {
    return new Response("No encontrado", { status: 404 });
  }
  const imagen = iconoApp(Number(size));
  imagen.headers.set("Cache-Control", "public, max-age=86400, immutable");
  return imagen;
}
