# Rivas App — instrucciones para Claude

Este archivo lo lee Claude al empezar cada sesión. Lo comparten Lucas y Mario: si cambian una regla, cámbienla acá con un pull request para que los dos Claude trabajen igual.

## El proyecto

- **Qué es:** app interna de proyectos para **NAHOMY Pro Construction** (remodelaciones: cocinas, baños, pisos, paredes exteriores, etc.).
- **Quién la usa:** Mario Rivas y José Esquivel, que administran el negocio. No hay empleados fijos: se subcontrata gente por día o por contrato según el trabajo.
- **Qué resuelve:** saber en todo momento cuánto se le debe a cada subcontratista, cuánto pagó cada cliente, y tener lista la información para las 1099 a fin de año.
- **Plataformas:** una sola app web que también se instala en el iPhone desde Safari (PWA). Se usa en obra para subir fotos y marcar días.
- **Equipo de desarrollo:** Lucas y Mario (Mario está en Orlando, Florida). Trabajan de forma asíncrona, en horarios distintos.
- **Tecnología:** ver la sección "Tecnología".
- **Documento de alcances:** "App de Proyectos – NAHOMY Pro Construction" (Mario, 17/11/2026). Bocetos: https://claude.ai/artifact/PjC9tK46LSV5MCNEXJoSeS

## Alcance

### Versión 1

1. **Proyectos:** datos del cliente (nombre, teléfono, correo, dirección, notas), tipo de trabajo, alcance, fechas y estado (*Estimado, Activo, En pausa, Terminado*). Fotos y videos con fecha y nota opcional, en línea de tiempo y separados en *antes / durante / después*.
2. **Subcontratistas:** base central con nombre y nombre legal, contacto, dirección, oficio, SSN o EIN, tipo (persona o LLC), W-9 firmado, tarifa diaria y notas. Cada sub muestra su historial del año.
3. **Pagos a subs:** por día (días × tarifa) o por contrato (monto fijo con adelantos y pago final). La app muestra cuánto se pagó y cuánto se debe. Se pueden cargar medios días. La tarifa por defecto sale de la ficha del sub y se puede cambiar en cada proyecto.
4. **Pagos del cliente:** monto del contrato, plan de pagos (50/50, 40/30/30 o propio) y cada pago recibido, con barra de progreso.

### Después (no en la versión 1)

- Quotes e invoices (hoy se hacen en **Zoho Invoice**; más adelante, evaluar conectarse a su API en vez de rehacerlos).
- Acceso de solo lectura para un contador.
- Conexión con QuickBooks.

### Fuera de alcance

- Uso sin internet (modo offline): no hace falta.
- Notificaciones en el teléfono: no hacen falta.

## Seguridad y datos sensibles

La app guarda SSN, EIN y datos de pago. Estas reglas valen desde el primer día:

- **El repositorio es público.** Nunca subir datos reales (clientes, subs, SSN, EIN, W-9, montos reales), claves de API ni archivos `.env`. Para pruebas usar solo datos inventados.
- **Nunca** poner SSN, EIN, W-9 ni datos reales de clientes en Slack, issues ni pull requests.
- Login obligatorio, idealmente con verificación en dos pasos.
- SSN y EIN **encriptados** en la base de datos y **ocultos** en pantalla (•••-••-1234) hasta tocar "Mostrar".
- Solo administradores ven la información de impuestos y la financiera.
- Solo administradores pueden borrar obras y subs (borrar una obra borra también sus pagos, contratos, días y gastos).
- Respaldos automáticos de la base de datos y de las fotos.

## Entrega de la app

Lucas arma y prueba la app, pero la app y sus datos son de NAHOMY. Cuando Mario y José decidan que la app tiene lo que necesitan, se hace la entrega y solo ellos dos quedan con acceso:

1. Borrar los datos de prueba (la obra y el sub "PRUEBA").
2. Borrar el usuario de Lucas en la app (`prueba@nahomy.pro`, el que usa para probar). El otro usuario (`info@nahomyconst.com`) es de Mario y queda.
3. Supabase: Mario saca a Lucas de la organización.
4. Netlify: Mario saca a Lucas del equipo, si está.
5. GitHub: sacar a Lucas de la organización `nahomy-pro` (Mario queda como dueño).
6. En la compu de Lucas: cerrar la sesión de Supabase y de GitHub que usa Claude.

Los pasos 1 y 2 los puede hacer el Claude de Lucas antes de que pierda el acceso. Los demás los hace Mario desde su cuenta.

## Tecnología

- **App:** Next.js (React + TypeScript) con Tailwind CSS. Interfaz en español, pensada primero para la pantalla del iPhone.
- **Base de datos, login y archivos:** Supabase (organización de Mario). Login con verificación en dos pasos y permisos por fila en la base de datos.
- **Hosting:** Netlify (cuenta de Mario). Vercel se descartó porque su plan gratis no permite uso comercial.
- **iPhone:** PWA, instalable desde Safari con "Agregar a pantalla de inicio".
- Las claves de Supabase van en `.env.local`, que nunca se sube. `.env.example` lista qué variables hacen falta, sin valores.

Cómo correr el proyecto, probarlo y aplicar cambios en la base: ver el [README](README.md). Los cambios de la base van siempre como migración en `supabase/migrations/` y se aplican con `npx supabase db push --remote`.

## Cómo trabajamos

### Antes de empezar una tarea: no duplicar trabajo

Ninguno de los dos revisa código; lo importante es saber qué hizo y qué está haciendo el otro.

1. Revisar los **issues** abiertos del repositorio y los últimos mensajes de `#bitacora` en Slack.
2. Si la tarea ya está asignada a la otra persona o aparece en la bitácora como "en curso", **avisar y no empezarla**.
3. Si no hay issue para la tarea, crearlo. Asignárselo a quien la va a hacer antes de empezar.

### Ramas y pull requests

- **Nunca hacer commits directamente en `main`.** `main` está protegida.
- Al empezar una tarea:
  1. `git switch main && git pull` para traer lo último.
  2. Crear una rama con el formato `tipo/descripcion-corta`, por ejemplo `feature/lista-de-proyectos`, `fix/login-iphone` o `docs/readme`.
- Al terminar: subir la rama y abrir un pull request contra `main` usando la plantilla.
- **El PR no necesita revisión: quien lo abre lo une** en cuanto verificó que funciona.
- La descripción del PR explica **en lenguaje simple, sin términos técnicos**, qué cambió en la app y qué se puede hacer ahora. Es lo que el otro va a leer para enterarse.
- Si el PR completa un issue, escribir `Closes #número` en la descripción para que se cierre solo. Tiene que ir en inglés: GitHub no entiende "Cierra".

### Commits

- Mensajes **en español**, en imperativo y cortos: "Agregar pantalla de proyectos", "Corregir error al subir fotos".
- Un commit por cambio lógico; no mezclar cosas no relacionadas.

### Antes de dar algo por terminado

- Verificar que el proyecto arranca y que lo que se cambió funciona. Correr `npm test` (pruebas de las cuentas de plata); si se cambió una cuenta, agregar o ajustar su prueba.
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
- 2026-11-17 — Los PR no se revisan: quien lo abre lo une. Las tareas se reparten con issues asignados.
- 2026-11-17 — Comunicación en Slack (Rivas-app) y avisos de GitHub en `#github`.
- 2026-11-17 — Quotes e invoices quedan fuera de la versión 1: se siguen haciendo en Zoho Invoice.
- 2026-11-17 — No se cobra sales tax.
- 2026-11-17 — Formas de pago del cliente: efectivo, Zelle y cheque. Tarjeta solo si el cliente lo pide, con Melio.
- 2026-11-20 — Se agregó "Transferencia" (bancaria) como forma de pago, como pedía el documento de alcances.
- 2026-11-17 — El repositorio queda público: ningún dato real ni secreto entra al repo (ver "Seguridad y datos sensibles").
- 2026-11-17 — Tecnología: Next.js + Supabase, como PWA (una sola app para celular y web).
- 2026-11-17 — Hosting en Netlify (plan gratis, permite uso comercial). El proyecto de Supabase queda por ahora en Oregon (us-west-2).
- 2026-11-17 — Tarifa del sub: una por defecto en su ficha, editable en cada proyecto. Se permiten medios días.
- 2026-11-17 — Sin modo offline y sin notificaciones.
- 2026-11-17 — Contador (solo lectura) y QuickBooks quedan para después; primero exportar a Excel.
- 2026-11-19 — Se adelantaron los gastos de materiales y la ganancia real por proyecto (estaban para después). Ganancia = contrato − mano de obra − gastos; "plata en mano" = cobrado − pagado a subs − gastos.
- 2026-11-19 — Se adelantó el calendario de quién va a qué obra. Programar un día no suma plata: cuenta para el pago recién cuando un administrador lo marca como trabajado. El calendario lo ven todos (no tiene montos).
- 2026-11-19 — Resumen del año para el contador (cobrado, pagado a subs y gastos por proyecto, con planilla para Excel). Se cuenta por la fecha de cada pago, como el banco. La planilla no lleva contraseña porque no trae SSN/EIN.
- 2026-11-20 — Cuentas pendientes: el saldo de un contrato con un sub cuenta como deuda recién cuando la obra está Terminada. Mientras tanto se muestra aparte, en "Contratos en curso", y no suma a lo que se debe ya.
- 2026-11-20 — Revisión de permisos: un usuario común podía borrar obras y subs desde la base; ahora solo los administradores. Se comprobó simulando un usuario común, un administrador sin verificación en dos pasos y uno verificado.
- 2026-11-20 — Lista de tareas ("Pendientes de la obra") en cada obra. No tiene montos: la ven, agregan, tachan y borran todos los usuarios verificados.
- 2026-11-20 — "Pagos de la semana" (pestaña propia, solo administradores): lo que se le debe a cada sub por día, de todas las obras, hasta hoy. No tiene día de corte fijo (hoy se paga viernes o sábado): lo trabajado después del pago sale en el pago siguiente. La app no mueve plata: se paga por Zelle o el banco y se anota con "Pagado". Conectar el banco queda descartado por ahora (habría que guardar cuentas bancarias de los subs).
- 2026-11-18 — En los PR se escribe `Closes #número` (en inglés): con "Cierra" GitHub no cierra el issue.
