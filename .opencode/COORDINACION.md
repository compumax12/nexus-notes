# Coordinación del equipo Nexus

Archivo compartido de comunicación entre agentes. **Leer al empezar, escribir al terminar.** No contiene secretos ni datos personales.

## Repositorio público (decisión del usuario vigente)

- El repositorio es público y debe tratarse como tal. Antes de cualquier push hay que pasar un escaneo de secretos/PII sobre **todo el historial**, no solo el árbol actual.
- NINGún agente debe imprimir ni compartir tokens, contraseñas, correos personales completos ni valores de credenciales en respuestas, logs, diffs de documentación ni mensajes de commit. Los hallazgos se reportan enmascarados (`ghp_***`, `c***@dominio`).
- Si aparece un secreto real en el historial: rotarlo primero y advertir que reescribir historial requiere aprobación explícita del usuario. Nunca force push sin esa aprobación.
- Los commits nuevos usan la identidad de no-reply de GitHub para no publicar el correo personal del autor.
- `app de escritorio local-first`, sin API keys de agentes en el producto: se mantiene como regla de producto.

## Política de publicación (decisión del usuario)

- Trabajar **todas las mejoras en local** antes de pasar a producción.
- Cada ciclo verde termina en **commit local**; no push automático.
- Push a GitHub **`de vez en cuando`**: cuando el usuario lo pida (`sube a GitHub`) y siempre al **terminar la sesión** para poder seguir desde casa.
- Antes de cualquier push: `git status --short --branch`, sin divergencia. Nunca force push.

## Contexto del producto (decisión del usuario)

- `nexus-notes` será una **app de escritorio**, de uso local.
- La app **no se usa con API keys de agentes**: ningún agente de IA forma parte del producto ni se le pide credenciales para funcionar.
- Los agentes de OpenCode son **solo herramientas de desarrollo**; no se instalan ni se referencian en la app.
- En revisiones: vigilar que no se añadan dependencias, llamadas ni configuraciones que exijan claves de agentes externos. Privacidad local primero.

## Regla de propiedad

| Agente | Dueño de |
| --- | --- |
| `impl-frontend` | `app/*.tsx`, `app/*.css`, `components/**`, `hooks/**`, `public/**` |
| `impl-backend` | `app/api/**`, `selfhost/**`, `db/**`, `drizzle/**`, `scripts/**`, `build/**`, `lib/**` |
| `impl-tests-docs` | `tests/**`, `examples/**`, `*.md`, `ESTADO.md` |
| `review-*` | Solo lectura del diff completo |

Nadie edita archivos de otro agente. Si lo necesitas, escribe la petición aquí y el agente principal lo reenvía.

## Protocolo por mejora

1. El agente principal elige **una** mejora y reparte tareas por propiedad.
2. Cada programador escribe su bloque: `### <agente> — <mejora> — <estado>` con archivos tocados, decisiones y peticiones a otros.
3. Los 5 revisores corren en paralelo sobre `git diff` con su enfoque.
4. El agente principal consolida hallazgos, devuelve correcciones a quien corresponda y repite hasta que no queden CRÍTICOS/ALTOS.
5. Se ejecuta la compuerta de tests de `nexus-safe-change`. Solo en verde: commit local y avance a la siguiente mejora; push únicamente en checkpoint (cuando el usuario lo pida o al terminar la sesión), previo `git status --short --branch` sin divergencia.

## Registro

### impl-frontend — corrección de errores de lint — completado
Archivos: `app/cloud-backups.tsx`, `app/dashboard.tsx`, `app/notes.tsx`, `app/service-alerts.tsx`. Cargas iniciales diferidas con `queueMicrotask` y guard de desmontaje; avisos `notify` llamados directamente; `<Link>` en vez de `<a>`. Decisiones: no reintroducir effects que hagan `setState`; conservar textos en español y privacidad. Peticiones: reforzar el guard para actualizaciones tras `await` y deduplicar avisos (en curso).

### impl-backend — corrección de error de lint — completado
Archivo: `selfhost/users.tsx`. Carga diferida con guard `active`; se reforzó el guard también para `setListing` tras el `await`. Sin peticiones a otros agentes.

### principal — integración — en curso
`eslint.config.mjs` ignora `dist-selfhost/**`; `tests/selfhost-storage.mjs` deriva el número de migraciones del journal; `ESTADO.md` actualizado. Ciclo cerrado: compuerta completa en verde y commit local. Push solo en checkpoint.

### auditoría de seguridad local — 25/11/2026 — completada (solo lectura)
Sin hallazgos CRÍTICOS ni ALTOS. Medios registrados para ciclos posteriores, en este orden:
1. Limitador global de `selfhost/http.ts:2-7` (120 peticiones/minuto compartidas): un cliente ajeno puede bloquear `/api/lock`, `/api/recovery` y `/api/users` para todos. Corregir con límite por IP/cuenta y 429.
2. PII versionada: `app/page.tsx:9`, `selfhost/mail.mjs:4`, `selfhost/configure-gmail.ps1:11-12`, `LEEME-TRUENAS.md:169,178`. Quitar mapeo de correo/nombre reales, exigir `NEXUS_SMTP_USER` explícito y usar marcadores en documentación.
3. Código de emergencia sin TTL en `selfhost/accounts.mjs:90,96-104`: añadir caducidad (7 días) y `expiresAt`, con prueba de vencido/vigente.
4. Enumeración por timing en `selfhost/accounts.mjs:25-29` y `selfhost/email-recovery.mjs:8,11`: reservar límite también para identificadores inexistentes y trabajo dummy de coste constante.
5. Dependencias: `next@16.4.3` afectado (subir a 16.4.6) y 7 avisos de `minimatch@10.2.5` vía ESLint (`npm audit fix`). Repetir `npm audit` y `npm audit --omit=dev` tras el cambio.
Bajos: `audit=false` en `.npmrc`, TOCTOU de symlinks en `selfhost/storage.mjs:58-60`, reenvío que reinicia intentos en `selfhost/email-recovery.mjs:13-17`, `project_id` en `.openai/hosting.json:4`.
Verificado sin hallazgos: cookies HttpOnly/SameSite=Strict/Secure, scrypt N=32768, invitaciones de 24 h de un uso, aislamiento por propietario y rechazo de cabeceras OAI en la variante autónoma.
Nota: todos los ciclos siguen siendo locales; push solo en checkpoint.

### principal — autorización de mantenimiento compartida — completado (commit local incluido)
Archivos: `lib/maintenance-auth.mjs` + `.d.ts`, `app/api/maintenance/route.ts`, `selfhost/maintenance-route.ts`, `MAINTENANCE.md`, `NEXUS-NOTES.md`, `ESTADO.md`, `tests/maintenance-auth.test.mjs`, `selfhost/users.tsx`, `.gitignore`. Decisión: la autorización es por token de servicio con `timingSafeEqual`, no por audiencia owner-private; selfhost conserva 401 y solo `Authorization`; Sites acepta también `OAI-Sites-Authorization`. El `GET` se verifica por `lastRun.ok`/`lastRun.failed`, no solo por el `ok` superior. `tsconfig.tsbuildinfo` deja de versionarse y se ignora. Sin secretos reales en archivos ni respuestas. Commit local incluido en la serie que termina en `527d4e2`; push solo en checkpoint, y antes de hacer público el repo hay que pasar el escaneo de historial.

### limpieza de PII y credenciales de prueba — 25/11/2026 — completado (commit local incluido)
Archivos: `app/page.tsx`, `NEXUS-NOTES.md`, `selfhost/mail.mjs`, `selfhost/configure-gmail.ps1`, `LEEME-TRUENAS.md`, `tests/local-api-smoke.mjs`, `tests/selfhost-accounts.mjs`, `tests/selfhost-api.mjs`, `tests/selfhost-email-recovery.mjs`, `.openai/hosting.json`, `.npmrc`, `ESTADO.md`. Decisiones: identidad mostrada por `user.displayName`; remitente SMTP obligatorio vía `NEXUS_SMTP_USER` con error claro si falta; marcadores genéricos en documentación y asistente; contraseñas de prueba aleatorias en runtime y reutilizadas por prueba; token ficticio de mantenimiento del smoke sin cambios; auditoría de npm activada; identificador de infraestructura reemplazado por placeholder. No se tocaron `lib/maintenance-auth.*`, rutas de mantenimiento, `MAINTENANCE.md` ni la configuración de equipo. Comprobaciones en verde: `npx tsc --noEmit`, `npm run lint` (0 errores, 11 advertencias preexistentes), `npm run build:selfhost`, `npm run build`, `node tests/maintenance-auth.test.mjs`, `node tests/task-logic.test.mjs` (5/5), `node tests/service-status.test.mjs` (2/2), `npm run test:selfhost-storage`, `node tests/selfhost-accounts.mjs`, `node tests/selfhost-email-recovery.mjs`, `node tests/selfhost-api.mjs` y `node tests/local-api-smoke.mjs` (Worker local con 8 migraciones D1 y estado efímero). Escaneo del árbol: 0 coincidencias para cada patrón de PII conocido, sin imprimir valores. Commit local existente en la serie que termina en `527d4e2`; push pendiente de solicitud explícita; antes de publicar queda pendiente el escaneo del historial completo.

### impl-frontend — claro con titulares serif — 25/11/2026 — completado (commit local incluido)
Archivos: 19 rutas del diff (17 modificadas: 13 TSX de vistas, `app/dashboard.tsx`, `app/layout.tsx`, `components/connector-error.tsx`, `selfhost/login.tsx`, `ESTADO.md`, `.opencode/COORDINACION.md` y `MANUAL-CON-MANZANITAS.md`; `app/bitacora.css` eliminada; `app/noche.css` nueva). Decisiones: se conservó la estructura de «Noche eléctrica» y, por comentario del dueño del producto, se cambió únicamente `app/noche.css` a fondo blanco/gris azulado, texto oscuro, acento menta profundo para acción/avance y rojo oscuro para urgencia; serif de libro (Georgia/Iowan/Palatino) solo en titulares y Aptos/Segoe UI en interfaz; un solo panel protagonista (`.overview-next` en el Resumen y `.lock-card` en acceso); sin papel crema, terracota, eyebrows en mayúsculas ni flechas decorativas. Se conservaron cálculos, `onClick`, props, rutas de API, validaciones, estados, mensajes y accesibilidad; se corrigieron foco en buscador, columnas móviles, targets de 44 px, textos operativos y contraste AA (mínimo 4,57:1 en tokens base y 5,27:1 en etiquetas). Compuerta completa en verde tras las correcciones. Demo regenerada desde `527d4e2` en carpeta externa al repo, con ZIP y .sha256 verificados. Commit local `527d4e2` creado; push pendiente de solicitud explícita.

### ciclo cerrado: estilo catálogo y login original — COMPLETADO
El usuario pidió simplificar la interfaz según el catálogo de demos de WordPress indicado por el usuario (fondo blanco, menú superior sencillo, tarjetas grandes, tipografía sans como la original) y recuperar la interfaz de login del commit original `c522f92`, conservando la seguridad.

Propiedad separada de archivos:
- Estilo: `app/catalogo.css` + `app/layout.tsx`.
- Login: `app/lock-screen.tsx` + `selfhost/login.tsx`.
- Documentación: `ESTADO.md` + `.opencode/COORDINACION.md`.

Revisión: 3 programadores y 5 revisores. Seguridad aprobó sin hallazgos; las correcciones de privacidad, pruebas, interfaz y documentación quedaron aplicadas (referencia sin hostname, encabezados históricos aclarados, enlaces de acceso con 44 px, avisos sin solape, errores/aciertos distinguidos, eyebrows sin punto y estados en acento azul). Comprobaciones en verde: `npx tsc --noEmit`, `npm run lint` (0 errores, 11 advertencias preexistentes), `npm run build:selfhost`, `npm run build`, 9 pruebas automatizadas, smoke con `/api/health`=200 y Worker detenido, `npm audit` y `npm audit --omit=dev` en 0. Commit local al cerrar el ciclo; demo regenerada fuera del repo desde ese commit; push solo si el usuario lo solicita explícitamente.

### app de escritorio Fase 1: cliente Electron del servidor central — COMPLETADO

Ciclo mediano con 3 programadores (A, B y C) y 5 revisores. El usuario aprobó continuar con la Fase 1 el 26/11/2026.

- Objetivo: ventana de escritorio para oficinas que apunta al servidor selfhost central, con tareas compartidas mediante las cuentas y los permisos actuales; no es BeeBEEP ni P2P.
- Propiedad: A = `desktop/*` + `tests/desktop-url.test.mjs`; B = `package.json` + `ESCRITORIO.md` + `NEXUS-NOTES.md` + `LEEME-TRUENAS.md`; C = `AGENTS.md` + `ESTADO.md` + `.opencode/COORDINACION.md` (estos dos documentos).
- Revisión: 5 dictámenes. Seguridad pidió cubrir redirecciones y marcos; pruebas pidió el handler completo de permisos; interfaz pidió tamaño de ventana y fallback de carga; documentación y privacidad aprobaron con matices. Todo aplicado por el agente principal.
- Compuerta en verde: tipos, lint (0 errores, 11 advertencias preexistentes), ambos builds, 10 pruebas (URL de escritorio 18/18), smoke con `/api/health`=200 y Worker detenido, auditorías en 0. Diff limpio y sin secretos, correos reales ni rutas de usuario. Commit local y push en el cierre; demo regenerada desde el commit final.
