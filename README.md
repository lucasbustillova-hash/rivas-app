# Rivas App

App interna de NAHOMY Pro Construction para manejar proyectos, subcontratistas y pagos. Funciona en la web y se instala en el iPhone.

Tecnología: Next.js + Supabase + Netlify (detalles en [`CLAUDE.md`](CLAUDE.md)).

## Qué hace la app (versión 1)

- **Proyectos:** lista con filtro por estado y ficha de cada proyecto con los datos del cliente.
- **Fotos y videos de obra:** se sacan desde el iPhone con etapa (antes / durante / después), fecha y nota, y se ven en línea de tiempo.
- **Pagos del cliente:** monto del contrato, plan (50/50, 40/30/30 o propio), cada pago recibido y una barra de progreso.
- **Subcontratistas:** ficha con contacto y datos para la 1099. El SSN/EIN se guarda encriptado y el W-9 queda en una carpeta privada.
- **Mano de obra:** subs por día (los días se marcan en un calendario, con medios días) o por contrato (adelantos y pago final). Muestra cuánto se le debe a cada uno.

Montos, pagos y datos de impuestos los ven **solo los administradores**.

## Equipo

- Lucas
- Mario

## Cómo empezar a trabajar (primera vez)

Cada uno trabaja con **su propio Claude**. Los dos siguen las mismas reglas porque Claude lee [`CLAUDE.md`](CLAUDE.md) al empezar cada sesión.

### 1. Lo que hay que tener

- Una cuenta de **Claude con Claude Code** (plan Pro o Max).
- La **app de escritorio de Claude** ([claude.ai/download](https://claude.ai/download)): se usa la pestaña **Code**. También sirve VS Code con la extensión de Claude.
- **Git**, **Node.js** (versión LTS) y **GitHub CLI** (`gh`). Si falta alguno, se le puede pedir a Claude: *"instalá Git, Node y GitHub CLI"*.
- Ser **colaborador** del repositorio en GitHub.

### 2. Conectar GitHub (una sola vez)

En una terminal:
```bash
gh auth login
```
Elegir **GitHub.com**, **HTTPS**, **Yes** para Git y **Login with a web browser**. Después:
```bash
gh auth setup-git
```

### 3. Bajar el proyecto

Pedirle a Claude, en la pestaña Code: *"Cloná github.com/lucasbustillova-hash/rivas-app en una carpeta Proyectos"*. Después abrir esa carpeta en Claude.

O a mano:
```bash
git clone https://github.com/lucasbustillova-hash/rivas-app.git
```

### 4. Claves de Supabase

Copiar `.env.example` como `.env.local` y completar la URL del proyecto y la *publishable key* (Supabase → Project Settings → API Keys). `.env.local` nunca se sube. Nunca usar la *secret key*.

### 5. Conectar Slack a Claude

En la app de Claude, en los conectores, agregar **Slack** y elegir el workspace **Rivas-app**. Así Claude puede leer `#bitacora` y `#ideas` antes de empezar una tarea.

### 6. Trabajar

Pedirle a Claude algo como: *"Tomá el issue #6 y hacé la pantalla de subcontratistas"*. Claude revisa que nadie la esté haciendo, se asigna el issue, crea una rama, programa, prueba y une el pull request. El aviso llega solo a `#github`.

## Correr la app en tu computadora

Hace falta [Node.js](https://nodejs.org) 20 o más nuevo.

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar `.env.example` como `.env.local` y completar las dos claves de Supabase (el archivo explica dónde están). `.env.local` nunca se sube.
3. Arrancar:
   ```bash
   npm run dev
   ```
4. Abrir http://localhost:3000.

Antes de subir cambios, comprobar que compila:
```bash
npm run lint
npm run build
```

Todavía no hay tests automáticos: cada cambio se prueba a mano en la app, en tamaño de celular y con datos inventados.

### Si la computadora tiene poca memoria

`npm run dev` puede cerrarse solo si queda poca memoria libre. En ese caso, compilar y correr la versión final:
```bash
npm run build
```
```bash
npm run start -- -p 3001
```
y abrir http://localhost:3001. Hay que volver a compilar después de cada cambio.

## Cambios en la base de datos

La estructura de la base vive en `supabase/migrations/`: un archivo `.sql` por cambio, con la fecha en el nombre. **Nunca** se cambia la base a mano desde el panel de Supabase: así los dos tenemos siempre la misma.

Para aplicar los cambios se usa la herramienta de Supabase (ya viene instalada con `npm install`):

1. Iniciar sesión, una sola vez por computadora. Lo hace cada uno con su usuario de Supabase. El código que aparece se escribe en la terminal, nunca en un chat:
   ```bash
   npx supabase login
   ```
2. Conectar la carpeta al proyecto, una sola vez:
   ```bash
   npx supabase link --project-ref knorezwlweqyelilccid
   ```
3. Ver qué cambios faltan aplicar y aplicarlos:
   ```bash
   npx supabase migration list --remote
   ```
   ```bash
   npx supabase db push --remote
   ```

Sin `--remote`, la herramienta busca una base local en Docker, que no usamos.

Para pedirle a Claude un cambio en la base: *"agregá una migración para …"*. Claude crea el archivo, lo aplica con `db push` y lo sube en el mismo pull request.

## Dónde está cada cosa en el código

| Carpeta | Qué hay |
|---|---|
| `src/app/(app)/` | Las pantallas (todas piden sesión iniciada con verificación en dos pasos) |
| `src/app/(app)/proyectos/[id]/` | Ficha del proyecto y sus secciones: `fotos/`, `pagos/` (cliente), `mano-de-obra/` (subs) |
| `src/app/(app)/subs/` | Subcontratistas |
| `src/lib/` | Textos, cálculos y tipos compartidos (por ejemplo `cobros.ts`, `mano-de-obra.ts`) |
| `src/components/` | Piezas que se usan en varias pantallas (encabezado, formulario de pago…) |
| `supabase/migrations/` | Estructura de la base de datos |

Los archivos `acciones.ts` de cada carpeta son los que guardan en la base; siempre comprueban en el servidor que el usuario sea administrador cuando corresponde.

## Usuarios

No hay registro abierto: los usuarios los crea un administrador en Supabase (**Authentication → Users → Add user**). La primera vez que alguien entra, la app le pide activar la verificación en dos pasos con una app como Google Authenticator.

Para que alguien vea montos y datos de impuestos, hay que marcarlo como administrador: Supabase → **Table Editor** → tabla `perfiles` → poner `es_admin` en `true` en su fila. Sin eso, ve proyectos, fotos y contactos, pero no la parte financiera.
