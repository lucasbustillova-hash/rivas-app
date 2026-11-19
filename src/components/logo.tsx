import Image from "next/image";
import logo from "../../public/logo-nahomy.png";

// Logo de NAHOMY Pro Construction para fondo oscuro (la parte verde va en blanco).
// El ancho lo decide quien lo usa, con className (por ejemplo "w-40").
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={logo}
      alt="NAHOMY Pro Construction"
      priority={priority}
      className={`h-auto ${className ?? ""}`}
    />
  );
}
