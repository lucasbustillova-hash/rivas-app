import Link from "next/link";

// Franja oscura con "‹ volver" y el título de la pantalla.
export function Encabezado({
  volver,
  volverTexto,
  titulo,
  subtitulo,
  children,
}: {
  volver: string;
  volverTexto: string;
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="franja flex flex-col gap-1 px-5 pb-4 text-white">
      <Link href={volver} className="-ml-1 flex min-h-11 w-fit items-center gap-1 text-[15px] text-obra-claro">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {volverTexto}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="font-titulo text-2xl font-bold">{titulo}</h1>
          {subtitulo && <span className="text-sm text-stone-300">{subtitulo}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
