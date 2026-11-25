---
name: Nexus Safe Change
description: Implementa UNA mejora de nexus-notes a la vez en local, repite los tests hasta que todos pasen, revisa el diff y solo entonces hace commit/push y pasa a la siguiente mejora.
---

# Nexus Safe Change

Objetivo: avanzar por mejoras pequeñas y verificadas. **Nunca se pushea nada que no haya pasado todas las comprobaciones.**

## Reglas de oro

- Un avance = una mejora. No mezclar mejoras distintas en el mismo ciclo.
- Trabajar siempre en local primero; no tocar la instalación publicada ni datos reales.
- Si una comprobación falla: corregir y volver a ejecutar **el bloque completo** hasta que todo esté en verde. No avanzar al siguiente paso.
- No usar `--no-verify`, `git push --force`, `git reset --hard` ni saltarse tests.
- No guardar contraseñas, tokens, bases de datos ni respaldos personales en el repositorio.
- El push se hace solo cuando el agente revisor no encuentre problemas altos o críticos.
- **Modo de trabajo actual:** completar todas las mejoras en local antes de producción. Cada ciclo termina en commit local; el push a GitHub es un *checkpoint* periódico, no un paso automático de cada mejora.

## Flujo ( repetir por cada mejora )

### 1. Elegir la mejora
Leer `ESTADO.md` y la sección "Por verificar o completar". Si el usuario no indicó cuál, preguntar. Tomar **una sola**.

### 2. Plan sin editar
Usar el agente `plan` (o el subagente `explore`) para localizar los archivos afectados y explicar el cambio propuesto. No modificar archivos en este paso.

### 3. Implementar en local
- Cambio mínimo y enfocado.
- Mantener el estilo del código y la documentación en español.
- Actualizar `ESTADO.md` con lo implementado y la evidencia de las pruebas.

### 4. Bloque de comprobaciones (obligatorio)
Si falta `node_modules`, ejecutar `npm install` antes de empezar.

Ejecutar en orden y anotar el resultado de cada uno:

```sh
npm run lint
npm run build:selfhost
node tests/task-logic.test.mjs
node tests/service-status.test.mjs
npm run test:selfhost-storage
```

Comprobaciones adicionales cuando el cambio lo afecte (si requieren servicios o credenciales no disponibles, documentar el motivo en vez de omitirlas en silencio):

```sh
node tests/selfhost-accounts.mjs
node tests/selfhost-api.mjs
node tests/selfhost-email-recovery.mjs
node tests/restore-real-backup.mjs
node tests/local-api-smoke.mjs
npm audit --omit=dev
```

**Puerta:** si cualquiera falla, volver al paso 3 y repetir el bloque completo. Está prohibido pasar al paso 5 con un fallo pendiente.

### 5. Revisión
Lanzar el subagente `reviewer` (solo lectura) sobre `git diff`. Debe devolver hallazgos ordenados por severidad con `archivo:línea`, con especial atención a:

- Privacidad por propietario y permisos de compartir/revocar.
- Validación del secreto de mantenimiento y copias.
- Manejo de sesiones, recuperación y credenciales.
- Ausencia de secretos o datos personales en el diff.

Si hay hallazgos altos o críticos: corregir y repetir desde el paso 3. Solo "APROBADO" permite continuar.

### 6. Commit local (push solo en checkpoint)
- Mostrar un resumen corto del cambio y las comprobaciones en verde.
- `git add` de los archivos de esta mejora (incluido `ESTADO.md`).
- Commit con mensaje descriptivo en el estilo del historial, p. ej. `Add ...` / `Fix ...`.
- **No pushear automáticamente.** El usuario quiere terminar las mejoras en local antes de producción. Subir a GitHub solo cuando diga `sube a GitHub` / `push`, o al terminar la sesión de trabajo para poder continuar desde casa.
- Antes de cada push: comprobar `git status --short --branch`; si hay divergencia con `origin/main`, integrar primero. Nunca force push.

### 7. Siguiente mejora
Tras el commit local (haya o no push), volver al paso 1 con la siguiente mejora de la lista. Si no quedan mejoras o el usuario quiere publicar, avisar y esperar instrucciones.

## Formato del informe al usuario

Por cada ciclo:

```
Mejora: <nombre>
Cambios: <archivos>
Comprobaciones: lint ✅ | build ✅ | tests ✅ | auditoría ✅/omitida
Revisión: APROBADO / <hallazgos>
Commit local: <hash> — push: pendiente / realizado en checkpoint ✅
Siguiente: <mejora>
```
