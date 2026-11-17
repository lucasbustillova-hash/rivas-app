"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.code === "invalid_credentials"
          ? "El correo o la contraseña no son correctos."
          : "No se pudo entrar. Revisá la conexión a internet y probá de nuevo.",
      );
      setLoading(false);
      return;
    }

    // El segundo paso (código del celular) se pide en /verificar.
    router.replace("/verificar");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col bg-tinta text-white safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-obra-claro">
            NAHOMY Pro Construction
          </span>
          <h1 className="font-titulo text-3xl font-bold">Iniciar sesión</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Correo
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-tinta-suave px-4 text-base text-white outline-none focus:border-obra-claro"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Contraseña
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-tinta-suave px-4 text-base text-white outline-none focus:border-obra-claro"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 rounded-xl bg-obra font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-stone-400">
          Solo pueden entrar las personas que agregó un administrador. Si no tenés cuenta, pedísela a Mario.
        </p>
      </div>
    </main>
  );
}
