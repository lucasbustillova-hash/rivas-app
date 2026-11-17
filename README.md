# Rivas App

App interna de NAHOMY Pro Construction para manejar proyectos, subcontratistas y pagos. Funciona en la web y se instala en el iPhone.

Tecnología: Next.js + Supabase + Netlify (detalles en [`CLAUDE.md`](CLAUDE.md)).

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

## Usuarios

No hay registro abierto: los usuarios los crea un administrador en Supabase (**Authentication → Users → Add user**). La primera vez que alguien entra, la app le pide activar la verificación en dos pasos con una app como Google Authenticator.
