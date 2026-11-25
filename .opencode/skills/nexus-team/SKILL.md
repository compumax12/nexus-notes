---
name: Nexus Team
description: Orquesta el equipo de 3 programadores y 5 revisores de nexus-notes con propiedad separada de archivos, comunicación compartida y compuerta de tests antes de publicar.
---

# Nexus Team

Usar para mejoras medianas o grandes de `nexus-notes`. Para cambios pequeños, usar solo `nexus-safe-change` con un programador y dos revisores.

## Equipo

- Programadores: `impl-frontend`, `impl-backend`, `impl-tests-docs`.
- Revisores (solo lectura): `review-seguridad`, `review-privacidad`, `review-tests`, `review-ui`, `review-docs`.
- Comunicación: `.opencode/COORDINACION.md` (leer al empezar, escribir al terminar) + reenvío de mensajes por el agente principal.
- Integración, tests finales, commit y push: **solo el agente principal**.

## Flujo

1. Leer `ESTADO.md`, `.opencode/COORDINACION.md` y elegir una mejora. Si no está clara, preguntar al usuario.
2. Repartir por propiedad de archivos. Nunca dos agentes editando el mismo archivo.
3. Lanzar los programadores en paralelo (subagentes en background). Esperar sus reportes.
4. Lanzar los 5 revisores en paralelo sobre el diff acumulado.
5. Consolidar hallazgos por severidad. Reenviar cada corrección al dueño del archivo y repetir revisión si hay CRÍTICOS o ALTOS.
6. Aplicar la compuerta completa de `nexus-safe-change`: `lint`, `build:selfhost`, `task-logic`, `service-status`, `test:selfhost-storage` y las pruebas adicionales que correspondan. Repetir hasta todo en verde.
7. Actualizar `.opencode/COORDINACION.md` y `ESTADO.md` con la evidencia.
8. Commit descriptivo **en local**. No pushear en cada mejora: el usuario quiere terminar todas las mejoras antes de producción. Push a GitHub solo cuando lo pida o al terminar la sesión (para seguir desde casa), tras comprobar `git status --short --branch` y ausencia de divergencia.
9. Con el commit local cerrado, pasar a la siguiente mejora.

## Límites

- Los subagentes no pueden publicar ni hacer commits (permisos denegados).
- Un revisor nunca edita: si encuentra un problema, lo reporta.
- Si una tarea cruza varias propiedades, dividirla o hacerla el agente principal.
- No saturar: si la mejora es pequeña, 1 programador + 2 revisores es suficiente.
