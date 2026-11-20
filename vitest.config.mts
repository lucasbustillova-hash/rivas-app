import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas automáticas: `npm test`. Se ejecutan los archivos *.test.ts.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
