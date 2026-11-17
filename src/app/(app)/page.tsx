// Pantalla de inicio. Por ahora solo confirma que el login funciona;
// la lista de proyectos llega con el issue #4.
export default function InicioPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 py-6">
      <h1 className="font-titulo text-3xl font-bold">Proyectos</h1>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="font-medium">Todavía no hay proyectos.</p>
        <p className="mt-1 text-sm text-texto-suave">
          La lista de proyectos se agrega en la próxima etapa. Si estás viendo esta pantalla, el login y
          la verificación en dos pasos funcionan.
        </p>
      </div>
    </main>
  );
}
