import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Cliente de Supabase para componentes del servidor y acciones.
export async function createClient() {
  // Todo lo que pasa por Supabase depende del usuario: se hace siempre en el
  // momento del pedido, nunca de antemano (Supabase usa la hora actual).
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies.
            // La sesión la renueva proxy.ts en cada pedido.
          }
        },
      },
    },
  );
}

// Devuelve el usuario si inició sesión Y completó la verificación en dos pasos.
// Si no, devuelve a dónde hay que mandarlo.
export async function getVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, redirectTo: "/login" } as const;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return { user: null, redirectTo: "/verificar" } as const;
  }

  return { user, redirectTo: null } as const;
}
