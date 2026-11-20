import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/permisos";
import { BotonSalir } from "./boton-salir";
import { EnlaceRespaldo } from "./enlace-respaldo";
import { Navegacion } from "./navegacion";

// Todo lo que está dentro de (app) requiere sesión iniciada y verificación en dos pasos.
// proxy.ts ya redirige antes, pero se vuelve a comprobar acá en el servidor por seguridad.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top bg-tinta px-5 pb-4 text-white print:hidden">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <Link href="/" aria-label="Inicio">
            <Logo className="w-36" priority />
          </Link>
          <Suspense fallback={null}>
            <NavegacionSegunUsuario arriba />
          </Suspense>
          <div className="flex items-center gap-1">
            <Suspense fallback={null}>
              <EnlaceRespaldo />
            </Suspense>
            <BotonSalir />
          </div>
        </div>
      </header>
      {/* pb deja lugar para la barra de abajo (en la compu va arriba). */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24 md:pb-10 print:pb-0">
        {/* La sesión se lee al momento del pedido, por eso va dentro de Suspense. */}
        <Suspense fallback={<p className="px-5 py-6 text-texto-suave">Cargando…</p>}>
          <SoloConSesion>{children}</SoloConSesion>
        </Suspense>
      </div>
      {/* La sección activa depende de la dirección: se completa al abrir la página. */}
      <Suspense fallback={null}>
        <NavegacionSegunUsuario />
      </Suspense>
    </div>
  );
}

async function SoloConSesion({ children }: { children: React.ReactNode }) {
  const { user, redirectTo } = await getVerifiedUser();
  if (!user) redirect(redirectTo);
  return children;
}

// La pestaña Pagos tiene montos: solo la ven los administradores.
async function NavegacionSegunUsuario({ arriba = false }: { arriba?: boolean }) {
  return <Navegacion arriba={arriba} conPagos={await esAdmin()} />;
}
