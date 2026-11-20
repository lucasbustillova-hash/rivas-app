"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Proyectos / Calendario / Pagos (solo administradores) / Subcontratistas. En el celular es la barra de abajo;
// en la compu (pantalla ancha) va arriba, en el encabezado.
export function Navegacion({ arriba = false, conPagos = false }: { arriba?: boolean; conPagos?: boolean }) {
  const ruta = usePathname();
  const enSubs = ruta.startsWith("/subs");
  const enCalendario = ruta.startsWith("/calendario");
  const enPagos = ruta.startsWith("/pagos");
  const enProyectos = !enSubs && !enCalendario && !enPagos;

  const item = (activo: boolean) =>
    arriba
      ? `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm ${
          activo ? "bg-tinta-suave font-semibold text-white" : "text-stone-300 hover:text-white"
        }`
      : `flex min-h-11 flex-col items-center justify-center gap-1 text-xs ${
          activo ? "font-semibold text-obra" : "text-texto-suave"
        }`;

  return (
    <nav
      aria-label="Secciones"
      className={
        arriba
          ? "hidden md:block"
          : "fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-white pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
      }
    >
      <div className={arriba ? "flex gap-1" : `mx-auto grid max-w-3xl ${conPagos ? "grid-cols-4" : "grid-cols-3"}`}>
        <Link href="/" className={item(enProyectos)} aria-current={enProyectos ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
          </svg>
          Proyectos
        </Link>
        <Link href="/calendario" className={item(enCalendario)} aria-current={enCalendario ? "page" : undefined}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          Calendario
        </Link>
        {conPagos && (
          <Link href="/pagos" className={item(enPagos)} aria-current={enPagos ? "page" : undefined}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="19" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M6 9.5v5M18 9.5v5" />
            </svg>
            Pagos
          </Link>
        )}
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
