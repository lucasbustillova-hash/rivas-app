import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/supabase/server";
import { BotonSalir } from "./boton-salir";
import { Navegacion } from "./navegacion";

// Todo lo que está dentro de (app) requiere sesión iniciada y verificación en dos pasos.
// proxy.ts ya redirige antes, pero se vuelve a comprobar acá en el servidor por seguridad.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top bg-tinta px-5 pb-4 text-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-obra-claro">
            NAHOMY Pro Construction
          </span>
          <BotonSalir />
        </div>
      </header>
      {/* pb deja lugar para la barra de abajo. */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24">
        {/* La sesión se lee al momento del pedido, por eso va dentro de Suspense. */}
        <Suspense fallback={<p className="px-5 py-6 text-texto-suave">Cargando…</p>}>
          <SoloConSesion>{children}</SoloConSesion>
        </Suspense>
      </div>
      {/* La sección activa depende de la dirección: se completa al abrir la página. */}
      <Suspense fallback={null}>
        <Navegacion />
      </Suspense>
    </div>
  );
}

async function SoloConSesion({ children }: { children: React.ReactNode }) {
  const { user, redirectTo } = await getVerifiedUser();
  if (!user) redirect(redirectTo);
  return children;
}
