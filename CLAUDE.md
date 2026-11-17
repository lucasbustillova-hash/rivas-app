# Rivas App — instrucciones para Claude

Este archivo lo lee Claude al empezar cada sesión. Lo comparten Lucas y Mario: si cambian una regla, cámbienla acá con un pull request para que los dos Claude trabajen igual.

## El proyecto

- **Qué es:** app de gestión de proyectos para el área de construcción.
- **Plataformas:** app web que también se usa en iPhone (idea inicial: PWA instalable desde Safari).
- **Equipo:** Lucas y Mario (Mario está en Orlando, Florida). Trabajan de forma asíncrona, en horarios distintos.
- **Tecnología:** _todavía no definida._ Cuando se decida, anotarla en la sección "Tecnología" de abajo.

## Tecnología

_Pendiente. Completar cuando se elija: framework, base de datos, hosting, cómo correr el proyecto y los tests._

## Cómo trabajamos

### Ramas y pull requests

- **Nunca hacer commits directamente en `main`.** `main` está protegida.
- Al empezar una tarea:
  1. `git switch main && git pull` para traer lo último.
  2. Crear una rama con el formato `tipo/descripcion-corta`, por ejemplo `feature/lista-de-proyectos`, `fix/login-iphone` o `docs/readme`.
- Al terminar: subir la rama y abrir un pull request contra `main` usando la plantilla.
- El otro revisa el pull request antes de unirlo. Si uno de los dos va a estar sin conectarse mucho tiempo, se puede acordar otra cosa en Slack.

### Commits

- Mensajes **en español**, en imperativo y cortos: "Agregar pantalla de proyectos", "Corregir error al subir fotos".
- Un commit por cambio lógico; no mezclar cosas no relacionadas.

### Antes de dar algo por terminado

- Verificar que el proyecto arranca y que lo que se cambió funciona (cuando haya tests, correrlos).
- Revisar que la vista funcione en pantalla de celular, porque la app se usa en iPhone en obra.

## Comunicación (Slack: workspace Rivas-app)

| Canal | Para qué |
|---|---|
| `#bitacora` | Resumen al terminar cada sesión de trabajo |
| `#ideas` | Funciones futuras, diseño e inspiración |
| `#bugs` | Errores: qué pasó, cómo reproducirlo, captura |
| `#github` | Avisos automáticos de commits, PRs e issues (no escribir a mano) |

### Resumen de bitácora

Al terminar una sesión, si te lo piden, escribí el resumen con este formato:

```
✅ Hice: qué quedó terminado
🚧 Pendiente: qué quedó a medias o falta
❓ Necesito de vos: preguntas o decisiones para el otro
```

## Decisiones tomadas

_Anotar acá cada decisión importante con la fecha, para no volver a discutirla._

- 2026-11-17 — Trabajo con ramas + pull requests; `main` protegida.
- 2026-11-17 — Comunicación en Slack (Rivas-app) y avisos de GitHub en `#github`.
