# Rivas App — instrucciones para Claude

Este archivo lo lee Claude al empezar cada sesión. Lo comparten Lucas y Mario: si cambian una regla, cámbienla acá con un pull request para que los dos Claude trabajen igual.

## El proyecto

- **Qué es:** app interna de proyectos para **NAHOMY Pro Construction** (remodelaciones: cocinas, baños, pisos, paredes exteriores, etc.).
- **Quién la usa:** Mario Rivas y José Esquivel, que administran el negocio. No hay empleados fijos: se subcontrata gente por día o por contrato según el trabajo.
- **Qué resuelve:** saber en todo momento cuánto se le debe a cada subcontratista, cuánto pagó cada cliente, y tener lista la información para las 1099 a fin de año.
- **Plataformas:** app web que también se usa en iPhone (idea inicial: PWA instalable desde Safari). Se usa en obra para subir fotos y marcar días.
- **Equipo de desarrollo:** Lucas y Mario (Mario está en Orlando, Florida). Trabajan de forma asíncrona, en horarios distintos.
- **Tecnología:** _todavía no definida._ Cuando se decida, anotarla en la sección "Tecnología" de abajo.
- **Documento de alcances:** "App de Proyectos – NAHOMY Pro Construction" (Mario, 17/11/2026). Bocetos: https://claude.ai/artifact/PjC9tK46LSV5MCNEXJoSeS

## Alcance

### Versión 1

1. **Proyectos:** datos del cliente (nombre, teléfono, correo, dirección, notas), tipo de trabajo, alcance, fechas y estado (*Estimado, Activo, En pausa, Terminado*). Fotos y videos con fecha y nota opcional, en línea de tiempo y separados en *antes / durante / después*.
2. **Subcontratistas:** base central con nombre y nombre legal, contacto, dirección, oficio, SSN o EIN, tipo (persona o LLC), W-9 firmado, tarifa diaria y notas. Cada sub muestra su historial del año.
3. **Pagos a subs:** por día (días × tarifa) o por contrato (monto fijo con adelantos y pago final). La app muestra cuánto se pagó y cuánto se debe.
4. **Pagos del cliente:** monto del contrato, plan de pagos (50/50, 40/30/30 o propio) y cada pago recibido, con barra de progreso.

### Después (no en la versión 1)

- Reporte anual y exportación para las 1099.
- Gastos de materiales y ganancia real por proyecto.
- Quotes e invoices (hoy se hacen en **Zoho Invoice**; más adelante, evaluar conectarse a su API en vez de rehacerlos).
- Calendario de quién va a qué obra.

## Seguridad y datos sensibles

La app guarda SSN, EIN y datos de pago. Estas reglas valen desde el primer día:

- **El repositorio es público.** Nunca subir datos reales (clientes, subs, SSN, EIN, W-9, montos reales), claves de API ni archivos `.env`. Para pruebas usar solo datos inventados.
- **Nunca** poner SSN, EIN, W-9 ni datos reales de clientes en Slack, issues ni pull requests.
- Login obligatorio, idealmente con verificación en dos pasos.
- SSN y EIN **encriptados** en la base de datos y **ocultos** en pantalla (•••-••-1234) hasta tocar "Mostrar".
- Solo administradores ven la información de impuestos y la financiera.
- Respaldos automáticos de la base de datos y de las fotos.

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
- 2026-11-17 — Quotes e invoices quedan fuera de la versión 1: se siguen haciendo en Zoho Invoice.
- 2026-11-17 — No se cobra sales tax.
- 2026-11-17 — Formas de pago del cliente: efectivo, Zelle y cheque. Tarjeta solo si el cliente lo pide, con Melio.
- 2026-11-17 — El repositorio queda público: ningún dato real ni secreto entra al repo (ver "Seguridad y datos sensibles").

## Pendiente de confirmar con Mario

Propuestas hechas en `#ideas`, todavía sin respuesta:

- App de celular y web con una sola app (PWA).
- Tarifa del sub: una por defecto en su ficha, que se puede cambiar en cada proyecto.
- Medios días: sí.
- Contador: más adelante, con acceso de solo lectura.
- QuickBooks: después; primero exportar a Excel para el contador.
- ¿Se trabaja sin internet en obra? ¿Hacen falta notificaciones?
