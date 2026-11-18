import { createClient } from "@/lib/supabase/server";

// ¿El usuario actual es administrador? (ve impuestos y montos)
export async function esAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("es_admin");
  return data === true;
}
