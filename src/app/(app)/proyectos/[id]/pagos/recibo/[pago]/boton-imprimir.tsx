"use client";

// En el iPhone abre la hoja de imprimir, que también deja guardarlo como PDF o compartirlo.
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-12 rounded-xl bg-obra font-semibold text-white active:bg-obra-oscuro print:hidden"
    >
      Imprimir o guardar PDF
    </button>
  );
}
