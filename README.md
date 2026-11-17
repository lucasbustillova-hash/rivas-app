# Rivas App

App interna de NAHOMY Pro Construction para manejar proyectos, subcontratistas y pagos. Funciona en la web y se instala en el iPhone.

Tecnología: Next.js + Supabase + Vercel (detalles en [`CLAUDE.md`](CLAUDE.md)).

## Equipo

- Lucas
- Mario

## Cómo empezar a trabajar

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/lucasbustillova-hash/rivas-app.git
   ```
2. Abrir la carpeta con Claude (app de escritorio, pestaña Code, o VS Code con la extensión de Claude).
3. Leer [`CLAUDE.md`](CLAUDE.md): ahí están las reglas de trabajo (ramas, pull requests, commits y bitácora).

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
