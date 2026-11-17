import { ImageResponse } from "next/og";

// Ícono de la app: "N" blanca sobre el naranja de obra.
// Se genera con código para no tener que guardar imágenes en el repositorio.
export function iconoApp(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C2410C",
          color: "#FFFFFF",
          fontSize: Math.round(size * 0.62),
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        N
      </div>
    ),
    { width: size, height: size },
  );
}
