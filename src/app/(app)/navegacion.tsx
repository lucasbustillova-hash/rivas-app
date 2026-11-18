"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barra de abajo: Proyectos / Subcontratistas.
export function Navegacion() {
  const ruta = usePathname();
  const enSubs = ruta.startsWith("/subs");

  const item = (activo: boolean) =>
    `flex min-h-11 flex-col items-center justify-center gap-1 text-xs ${
      activo ? "font-semibold text-obra" : "text-texto-suave"
    }`;

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-white pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-2">
        <Link href="/" className={item(!enSubs)} aria-current={!enSubs ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
          </svg>
          Proyectos
        </Link>
        <Link href="/subs" className={item(enSubs)} aria-current={enSubs ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6" />
          </svg>
          Subcontratistas
        </Link>
      </div>
    </nav>
  );
}
