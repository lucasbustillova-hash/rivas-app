import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ¿El usuario actual es administrador? (ve impuestos y montos)
// Se pregunta una sola vez por pantalla aunque varias partes lo necesiten.
export const esAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("es_admin");
  return data === true;
});
