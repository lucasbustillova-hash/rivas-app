import type { MetadataRoute } from "next";

// Permite instalar la app en el iPhone y en la computadora como si fuera nativa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NAHOMY Pro",
    short_name: "NAHOMY Pro",
    description: "Proyectos, subcontratistas y pagos de NAHOMY Pro Construction",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#1C2B1F",
    theme_color: "#1C2B1F",
    // Símbolo del logo sobre el verde de la marca (imágenes en /public).
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
