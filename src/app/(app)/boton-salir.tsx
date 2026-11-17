"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BotonSalir() {
  const router = useRouter();

  async function salir() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={salir} className="min-h-11 px-2 text-sm text-stone-300 underline">
      Salir
    </button>
  );
}
