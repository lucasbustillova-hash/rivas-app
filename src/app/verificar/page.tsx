"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "configurar"; factorId: string; qr: string; secreto: string }
  | { tipo: "verificar"; factorId: string }
  | { tipo: "error"; mensaje: string };

// Segundo paso del login: un código de 6 dígitos de una app como
// Google Authenticator. La primera vez se escanea un código QR.
export default function VerificarPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function preparar() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setEstado({ tipo: "error", mensaje: "No se pudo cargar la verificación. Volvé a iniciar sesión." });
        return;
      }

      const verificado = data.totp.find((f) => f.status === "verified");
      if (verificado) {
        setEstado({ tipo: "verificar", factorId: verificado.id });
        return;
      }

      // Borra intentos anteriores que quedaron sin terminar.
      for (const f of data.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data: nuevo, error: errorEnroll } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "NAHOMY Pro",
      });
      if (errorEnroll || !nuevo) {
        setEstado({ tipo: "error", mensaje: "No se pudo preparar el código QR. Probá de nuevo." });
        return;
      }
      setEstado({
        tipo: "configurar",
        factorId: nuevo.id,
        qr: nuevo.totp.qr_code,
        secreto: nuevo.totp.secret,
      });
    }

    preparar();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (estado.tipo !== "configurar" && estado.tipo !== "verificar") return;
    setError(null);
    setEnviando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: estado.factorId,
      code: codigo.trim(),
    });

    if (error) {
      setError("El código no es correcto o ya venció. Probá con el código nuevo.");
      setEnviando(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function salir() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col bg-tinta text-white safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-obra-claro">
            Verificación en dos pasos
          </span>
          <h1 className="font-titulo text-3xl font-bold">
            {estado.tipo === "configurar" ? "Activá la verificación" : "Ingresá tu código"}
          </h1>
        </div>

        {estado.tipo === "cargando" && <p className="text-stone-300">Cargando…</p>}

        {estado.tipo === "error" && (
          <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200">
            {estado.mensaje}
          </p>
        )}

        {estado.tipo === "configurar" && (
          <div className="flex flex-col gap-3 text-sm text-stone-300">
            <p>
              1. Instalá <strong className="text-white">Google Authenticator</strong> (o la app de
              contraseñas del iPhone) y escaneá este código:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={estado.qr}
              alt="Código QR para la app de verificación"
              className="mx-auto h-48 w-48 rounded-xl bg-white p-2"
            />
            <p>
              ¿No podés escanearlo? Escribí esta clave en la app:{" "}
              <code className="break-all rounded bg-tinta-suave px-1.5 py-0.5 text-white">
                {estado.secreto}
              </code>
            </p>
            <p>2. Escribí abajo el código de 6 dígitos que muestra la app.</p>
          </div>
        )}

        {estado.tipo === "verificar" && (
          <p className="text-sm text-stone-300">
            Abrí tu app de verificación y escribí el código de 6 dígitos de NAHOMY Pro.
          </p>
        )}

        {(estado.tipo === "configurar" || estado.tipo === "verificar") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Código
              <input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="h-14 rounded-xl border border-white/10 bg-tinta-suave px-4 text-center font-titulo text-2xl tracking-[0.4em] text-white outline-none focus:border-obra-claro"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || codigo.length !== 6}
              className="h-12 rounded-xl bg-obra font-semibold text-white disabled:opacity-60"
            >
              {enviando ? "Verificando…" : "Verificar"}
            </button>
          </form>
        )}

        <button type="button" onClick={salir} className="min-h-11 text-sm text-stone-400 underline">
          Salir y entrar con otra cuenta
        </button>
      </div>
    </main>
  );
}
