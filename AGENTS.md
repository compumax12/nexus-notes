# Nexus Notes — instrucciones del proyecto

App de escritorio **local-first**: notas, tareas, recordatorios y copias cifradas. El producto **no contiene API keys de agentes**; los agentes son solo herramientas de desarrollo. El repositorio está publicado y debe tratarse como público: no escribas correos personales, nombres reales ni credenciales en código, docs ni commits.

## Estructura

- `app/` — rutas y UI de Next.js (Sites/Workers).
- `selfhost/` — servidor autocontenido (SQLite/D1, cuentas, correo).
- `lib/` — helpers compartidos (p. ej. `maintenance-auth.mjs`).
- `db/`, `drizzle/` — esquema y migraciones SQL (8 archivos, aplicar en orden).
- `tests/` — pruebas unitarias, de selfhost y smoke de API local.
- `scripts/` — arranque de framework, Variables de Sites y build.
- `.opencode/` — equipo de trabajo, reglas de coordinación y skills.

No edites `dist/`, `dist-selfhost/`, `.next/`, `.sites-runtime/` ni `.wrangler/`: son generados/efímeros y están ignorados.

## Comprobaciones obligatorias antes de cualquier commit

```sh
npx tsc --noEmit
npm run lint
npm run build:selfhost
npm run build
node tests/maintenance-auth.test.mjs
node tests/recovery-ttl.test.mjs
node tests/task-logic.test.mjs
node tests/service-status.test.mjs
node tests/desktop-url.test.mjs
npm run test:selfhost-storage
node tests/selfhost-accounts.mjs
node tests/selfhost-rate-limit.mjs
node tests/selfhost-email-recovery.mjs
node tests/selfhost-api.mjs
node tests/local-api-smoke.mjs
```

Si falla una comprobación, no hagas commit ni push: corrígela y repite la compuerta completa.

## Smoke de API local

El Worker necesita D1 local con las migraciones de `drizzle/*.sql` aplicadas. Arranca con:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 8787 --inspector-port 0 --var NEXUS_MAINTENANCE_TOKEN:<token-ficticio-local>
```

Espera a `GET /api/health` = 200, ejecuta `node tests/local-api-smoke.mjs` y detén el Worker. Sustituye `<token-ficticio-local>` por el valor de prueba definido en `tests/local-api-smoke.mjs`; es ficticio, local y nunca una credencial real.

## Reglas de trabajo

- Cambios pequeños: 1 programador + 2 revisores; mejoras medianas/grandes: 3 programadores + 5 revisores según `.opencode/skills/nexus-team/SKILL.md`. Commit local al cerrar cada ciclo.
- Push a GitHub solo en checkpoint, cuando lo pida el usuario o al terminar la sesión; nunca con la compuerta en rojo.
- Reescritura de historial, force push y cambio de visibilidad: solo con aprobación explícita.
- Sin PII ni secretos en respuestas; reporta hallazgos enmascarados (conteos, no valores).
- Docs, mensajes de error y textos de pruebas en español.
- Antes de cualquier push o cambio de visibilidad: compuerta en verde + escaneo de PII/secretos en árbol e historial.
