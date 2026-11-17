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
    background_color: "#1C1917",
    theme_color: "#1C1917",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
