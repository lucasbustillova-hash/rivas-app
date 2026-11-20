# Rivas App

App interna de NAHOMY Pro Construction para manejar proyectos, subcontratistas y pagos. Funciona en la web y se instala en el iPhone.

Tecnología: Next.js + Supabase + Netlify (detalles en [`CLAUDE.md`](CLAUDE.md)).

## Qué hace la app (versión 1)

- **Proyectos:** lista con filtro por estado y ficha de cada proyecto con los datos del cliente.
- **Fotos y videos de obra:** se sacan desde el iPhone con etapa (antes / durante / después), fecha y nota, y se ven en línea de tiempo.
- **Pagos del cliente:** monto del contrato, plan (50/50, 40/30/30 o propio), cada pago recibido y una barra de progreso. Cada pago tiene su recibo (en español e inglés) para imprimir o mandar como PDF; aparece "Ver recibo" apenas se anota el pago.
- **Subcontratistas:** ficha con contacto, datos para la 1099 y lo que se le debe ya en todas las obras. El SSN/EIN se guarda encriptado y el W-9 queda en una carpeta privada.
- **Mano de obra:** subs por día (los días se marcan en un calendario, con medios días) o por contrato (adelantos y pago final). Muestra cuánto se le debe a cada uno, y cada sub tiene un estado de cuenta (en español e inglés) para imprimir o mandar como PDF.
- **Gastos y ganancia:** en cada proyecto se anotan los gastos (materiales, herramientas o alquiler, permisos, dumpster…) con foto del recibo opcional. La ficha muestra la ganancia (contrato − mano de obra − gastos) y la plata en mano hoy (cobrado − pagado a subs − gastos).
- **Pendientes de la obra:** en cada obra, una lista de tareas (comprar materiales, cosas que faltan, pedidos del cliente) que todos ven, agregan y tachan.
- **Calendario:** la semana con qué sub va a qué obra cada día. Se programan uno o varios subs por rango de fechas (sin domingos si se quiere) y avisa si alguien quedó en dos obras el mismo día. Lo ven todos; los administradores marcan desde ahí los días trabajados, que pasan a la cuenta del sub.
- **Reporte 1099:** a quién hay que hacerle la 1099-NEC en el año, qué datos le faltan y una planilla con contraseña para cualquier contador (resumen por sub y detalle de cada pago). Los datos de la empresa como pagador se cargan ahí una sola vez.
- **Buscador:** arriba de la lista de proyectos se busca por cliente, nombre de la obra, dirección, tipo de trabajo o teléfono. No importan los acentos ni las mayúsculas, y se combina con el filtro por estado.
- **Cuentas pendientes:** todas las obras juntas: cuánto se le debe ya a cada sub (con el detalle por obra; los contratos de obras sin terminar van aparte) y cuánto le falta pagar a cada cliente, con su próximo cobro. Los dos totales se ven arriba de la lista de proyectos (solo administradores).
- **Resumen del año:** lo cobrado, lo pagado a subs y los gastos del año, por proyecto, con una planilla para Excel para el contador. Se entra desde el final de la lista de proyectos (solo administradores).
- **Respaldo:** baja un archivo encriptado con todos los datos y archivos de la app, y comprueba que un respaldo se pueda abrir. Avisa si pasaron más de 7 días sin hacer uno. También muestra cuánto espacio se usó del plan gratis de Supabase (fotos y datos) y avisa desde el 80 %.

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

Antes de subir cambios, comprobar que las pruebas pasan y que compila:
```bash
npm test
npm run lint
npm run build
```

`npm test` comprueba solo las cuentas de plata: cuotas del cliente, lo que falta cobrar, días × tarifa (con medios días), contratos con adelantos, lo que se le debe a cada sub, la ganancia de cada proyecto, los totales de la 1099, el resumen del año y las cuentas pendientes (y el buscador de proyectos). Las pruebas están en los archivos `*.test.ts`, al lado del código que prueban. Si se cambia una cuenta, hay que agregar o ajustar su prueba.

Las pantallas se siguen probando a mano en la app, en tamaño de celular y con datos inventados.

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
| `src/app/(app)/proyectos/[id]/` | Ficha del proyecto y sus secciones: `fotos/`, `pagos/` (cliente), `mano-de-obra/` (subs), `gastos/` (gastos y ganancia) |
| `src/app/(app)/calendario/` | Calendario semanal (las fechas se calculan en `src/lib/agenda.ts`) |
| `src/app/(app)/subs/` | Subcontratistas; `reporte-1099/` es el reporte y la planilla para el contador |
| `src/app/(app)/pendientes/` | Cuentas pendientes: lo que se debe a subs y lo que deben los clientes |
| `src/app/(app)/resumen-anual/` | Resumen del año (cobrado, subs y gastos) y su planilla |
| `src/app/(app)/respaldo/` | Descargar y comprobar respaldos (el armado está en `src/lib/respaldo.ts`) |
| `src/lib/` | Textos, cálculos y tipos compartidos (por ejemplo `cobros.ts`, `mano-de-obra.ts`, `gastos.ts`) |
| `src/components/` | Piezas que se usan en varias pantallas (encabezado, formulario de pago…) |
| `supabase/migrations/` | Estructura de la base de datos |

Los archivos `acciones.ts` de cada carpeta son los que guardan en la base; siempre comprueban en el servidor que el usuario sea administrador cuando corresponde.

## Publicar la app (Netlify)

La app se publica en Netlify desde la cuenta de Mario. La configuración está en [`netlify.toml`](netlify.toml): Netlify reconoce Next.js solo, así que no hay que tocar nada de la compilación.

**Primera vez** (unos 10 minutos):

1. En **app.netlify.com** → **Add new project** → **Import an existing project** → **GitHub** → elegir `rivas-app`.
2. Antes de publicar, en **Environment variables** agregar las dos de `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Nunca** la *secret key* ni la *service_role*.
3. **Deploy**. Al terminar da una dirección tipo `algo.netlify.app`; el nombre se cambia en la configuración del proyecto en Netlify (**Project configuration**, en algunas cuentas **Site configuration**), por ejemplo a `nahomy-pro`.
4. En Supabase → **Authentication → URL Configuration**, poner esa dirección como **Site URL**.
5. En el iPhone: abrirla en **Safari** → **Compartir** → **Agregar a pantalla de inicio**.

**Después:** cada pull request que se une a `main` se publica solo en unos minutos. Si una publicación falla, Netlify sigue mostrando la versión anterior; el error está en **Deploys** → la publicación que falló → **Deploy log**.

Si en el paso 1 no aparece `rivas-app`, la cuenta de GitHub de quien publica no tiene acceso al repositorio: hay que darle acceso en GitHub o pasar el repo a una organización de los dos.

## Usuarios

No hay registro abierto: los usuarios los crea un administrador en Supabase (**Authentication → Users → Add user**). La primera vez que alguien entra, la app le pide activar la verificación en dos pasos con una app como Google Authenticator.

Para que alguien vea montos y datos de impuestos, hay que marcarlo como administrador: Supabase → **Table Editor** → tabla `perfiles` → poner `es_admin` en `true` en su fila. Sin eso, ve proyectos, fotos y contactos, pero no la parte financiera.
