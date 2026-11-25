# Estado de Nexus Notes

Actualizado: 25/11/2026. Mantener esta lista al completar mejoras.

## Funciones existentes
- Interfaz personalizada, resumen inicial, gráficos, vista Hoy y pestañas por estado.
- Tareas con prioridades, fechas, avance, pasos y recurrencia.
- Apuntes, privacidad por defecto, compartir y revocar permisos.
- Avisos flotantes de vencimientos.
- Respaldo JSON, importación privada y protección contra repetir la misma importación.
- Sitio publicado con acceso ChatGPT y contraseña adicional; código de emergencia.
- Programación de copias en Sites a las 03:00 America/Lima; copia manual verificada, ejecución del planificador pendiente de confirmar.
- GitHub privado actualizado y verificado el 28/10: commit 6da1ecd0d9b2cc79579b938b53145d9fca83b179, con la versión autónoma, instrucciones y uso compartido automático. Se conservó el historial remoto; no se incluyeron contraseñas, bases de datos ni respaldos personales.

## Avances implementados y probados
- Limpieza de datos personales y credenciales de prueba antes de hacer público el repositorio (25/11/2026): `app/page.tsx` muestra solo `user.displayName` (sin mapeo por correo); `NEXUS-NOTES.md` y `LEEME-TRUENAS.md` usan referencias y marcadores genéricos; `selfhost/mail.mjs` exige `NEXUS_SMTP_USER` explícito y falla con mensaje claro si falta; `selfhost/configure-gmail.ps1` pide el correo y rechaza el marcador de ejemplo; `.openai/hosting.json` usa `PROJECT_ID`; `.npmrc` activa `audit=true` y conserva `fund=false`/`update-notifier=false`. Las contraseñas de `tests/local-api-smoke.mjs`, `tests/selfhost-accounts.mjs`, `tests/selfhost-api.mjs` y `tests/selfhost-email-recovery.mjs` se generan en runtime con `crypto.randomBytes` y se reutiliza cada valor dentro de su prueba; el token ficticio de mantenimiento del smoke queda intacto. Comprobaciones: `npx tsc --noEmit` 0 errores, `npm run lint` 0 errores (11 warnings preexistentes), `npm run build:selfhost` y `npm run build` correctos, `node tests/maintenance-auth.test.mjs` PASS, `node tests/task-logic.test.mjs` 5/5, `node tests/service-status.test.mjs` 2/2, `npm run test:selfhost-storage` PASS, `node tests/selfhost-accounts.mjs` PASS, `node tests/selfhost-email-recovery.mjs` PASS, `node tests/selfhost-api.mjs` PASS y `node tests/local-api-smoke.mjs` PASS con Worker local, D1 migrado (8 migraciones) y token de servicio ficticio. Escaneo del árbol (sin `node_modules`/`dist`): 0 coincidencias para cada uno de los dos patrones de correo personal y del nombre real. Commits locales; push solo en checkpoint. Sin API keys de agentes. Pendiente el escaneo del historial completo antes de publicar.
- Autorización de mantenimiento para audiencia compartida (25/11/2026): nuevo `lib/maintenance-auth.mjs` (con `lib/maintenance-auth.d.ts` para TS) con comparación `timingSafeEqual` sobre bytes UTF-8, bearer en `OAI-Sites-Authorization` y `Authorization`, rechazo con `Origin` y fallo cerrado 503 sin secretos en los mensajes. `app/api/maintenance/route.ts` y `selfhost/maintenance-route.ts` usan el helper (sin `getChatGPTUser()` ni barrera owner-private); `MAINTENANCE.md` y `NEXUS-NOTES.md` reflejan la autenticación de servicio; nuevo `tests/maintenance-auth.test.mjs`; `selfhost/users.tsx` corrige el tipo de `r.json()` con `as Listing`. Comprobaciones: `npx tsc --noEmit` 0 errores, `npm run lint` 0 errores (11 warnings en archivos no tocados), `npm run build:selfhost` y `npm run build` correctos, `node tests/maintenance-auth.test.mjs` PASS, `node tests/task-logic.test.mjs` 5/5, `node tests/service-status.test.mjs` 2/2, `npm run test:selfhost-storage` PASS y `node tests/selfhost-api.mjs` PASS. Sin commit ni push.
- Revisión de compuerta local y herramientas de equipo (25/11/2026): corregidos los 8 errores de ESLint (7 en `app/*.tsx` y 1 en `selfhost/users.tsx`) cargando los datos iniciales de forma diferida con guard de desmontaje y llamando a las alertas directamente donde ocurre el hecho; `<a>` sustituido por `<Link>`. Se añadió `dist-selfhost/**` a los ignores de ESLint para que el código generado por el build no contamine el lint. El test de almacenamiento ya deriva el número de migraciones del journal en vez de hardcodearlo (había 8 migraciones y esperaba 7). Comprobaciones: lint 0 errores (12 warnings preexistentes), `build:selfhost` correcto, 5 pruebas de lógica de tareas y 2 de avisos en verde, `selfhost-storage` PASS. Se conservó una copia original sin cambios fuera del repositorio. Equipo de trabajo configurado en `.opencode` (3 programadores, 5 revisores, modos normal y completo); publicación en GitHub solo como checkpoint periódico o al terminar la sesión, no tras cada mejora.
- Revisión focalizada de seguridad local (29/10/2026): corregido rechazo de credenciales de mantenimiento con caracteres multibyte, que antes causaban HTTP 500. Prueba reproduce el fallo antes del arreglo y pasa después: respuesta 401. Integración aislada comprueba respaldo por propietario, rechazo sin sesión y origen ajeno, mantenimiento con secreto y permisos de colaboración. Compilación autónoma correcta.
- Versión 19 publicada el 29/10/2026 (bedd038cf47a0fef3df92903a458292be6ecbe95): botones móviles con área mínima de 44 × 44 px y texto de privacidad de apuntes coherente con compartir automáticamente. Revisión de resumen, lista, formularios sin guardar y Configuración a 390 px; comprobaciones de resumen, lista y Configuración a 320 px sin desbordamiento de página. Las 8 tareas existentes se conservaron.
- Alertas publicadas en la versión 18 y verificadas en Configuración el 29/10/2026: disponibilidad, falta de copias recientes, sesión no verificable y recuperación de conexión. Consulta cada minuto con pestaña visible, reintento manual y datos de respaldo solo de la propia cuenta. Prueba aislada: dos fallos de conexión y resolución al crear copia. Sin avisos externos por decisión del usuario.
- Manual para principiantes: MANUAL-CON-MANZANITAS.md, con mapa del código, diagnóstico, respaldo y recuperación sin sobrescribir datos originales.
- Compartir automáticamente publicado y activado para la cuenta del propietario: destinatarios por cuenta para tareas y apuntes nuevos; configuración persistente en servidor. Pruebas HTTP de aislamiento, edición compartida, desactivación y revocación correctas. Las importaciones siguen siendo privadas.
- Las 7 tareas existentes del propietario fueron compartidas con la destinataria autorizada desde la interfaz; no se guardan aquí datos ni credenciales de colaboradores.
- Corregidos los textos de colaboración de la variante local: ahora se refieren al correo registrado y a cuentas de esta instalación.
- Formularios de tareas/apuntes: controles móviles mayores, campos apilados y barra de guardado fija. Compilación verificada; prueba visual completa pendiente por fallo de conexión del navegador.
- Tareas y apuntes: aviso integrado para seguir editando o descartar. Verificado en navegador con cuenta aislada: conservar texto, guardar y descartar sin modificar el apunte original; persistencia comprobada al actualizar.
- Gmail pospuesto por decisión del usuario; no solicitar credenciales hasta que decida retomarlo.
- Asistente Windows para configurar Gmail con entrada oculta, secreto fuera del repositorio y verificación SMTP sin enviar mensajes. Sintaxis comprobada; ejecución real pendiente de credencial del usuario.
- Recuperación por correo implementada: código temporal de 8 dígitos, intentos/reenvíos limitados, un uso y cierre de sesiones. Pruebas con envío simulado; Gmail real aún sin credenciales.
- Respaldo del 26/10 descargado: 7 tareas, restauración aislada comprobada sin duplicados.
- Configuración en pantalla estrecha: espaciado del panel de usuarios, controles táctiles y texto de recuperación corregidos; botón Nueva tarea retirado de esta sección.
- Administración visual en Configuración: invitaciones, anulación, listado de cuentas, desactivación y reactivación.
- Rol administrador asignado por consola; API protegida, sesiones revocadas y tareas privadas preservadas. Pruebas HTTP con usuarios aislados correctas.
- Variante autónoma Node 24: compilación separada mediante build:selfhost.
- SQLite persistente, migraciones con huella y transacciones atómicas.
- Archivos locales para copias; protección de rutas, escritura atómica y conservación de copias diarias.
- Cuenta propia sin ChatGPT, sesiones HttpOnly y contraseñas con scrypt.
- Invitaciones de 24 horas y un uso, ligadas a correo/nombre por el operador de consola.
- Recuperación mediante usuario y código de emergencia; código de un uso y revocación de sesiones.
- Cambio de contraseña y desactivación por consola con revocación de sesiones.
- Identidad enviada en encabezados OAI ignorada en la variante autónoma.
- Privacidad, compartir y revocar acceso comprobados con dos cuentas de prueba independientes.
- Mantenimiento protegido por secreto; comprobación automática diaria y reintentos.
- Ruta de salud y logs; healthcheck preparado para Docker.
- Restauración real en SQLite autónomo: 6 tareas con contenido/avance equivalentes, privadas y sin duplicados. El archivo real no incluía apuntes; pruebas sintéticas cubren los apuntes.
- Pantalla local de ingreso, invitación y recuperación comprobada en ancho estrecho; corregidos botones ocultos.
- Revisión completa de dependencias del 26/10: cero avisos tras actualizar Zod y Undici.
- Guía de instalación local/TrueNAS, Dockerfile y Compose preparados. Compose validado sintácticamente.

## Por verificar o completar
- Docker: construcción y ejecución pendientes; el motor local no está iniciado.
- TrueNAS: versión, datasets, permisos, instalación real y reinicio/persistencia del contenedor.
- Dominio, proxy y HTTPS; validación de seguridad de la configuración de red.
- Creación por el usuario de su cuenta definitiva y su código de emergencia local.
- Prueba de invitación y compartir con otra persona real; no solo cuentas automáticas.
- Activar Gmail con contraseña de aplicación local y comprobar una entrega real. La recuperación por correo devuelve el usuario después de verificar el código.
- Revisión del panel de administración con tu cuenta definitiva; vista estrecha comprobada con cuenta aislada de prueba.
- Prueba en teléfonos físicos (teclado virtual y Safari/iOS). La revisión de navegador a 320 y 390 px está realizada; no equivale a probar dispositivos reales.
- Confirmar el ciclo real del planificador de Sites con el sitio desplegado y audiencia compartida; hasta entonces conservar las copias manuales. La autorización de servicio ya quedó resuelta el 25/11/2026 (ver avances).
- Confirmar el ciclo de las 03:00 de la instalación autónoma con datos definitivos.
- Copias externas fuera del equipo/NAS. Alertas externas pospuestas: el usuario eligió avisos solo dentro de Nexus.
- Pruebas de carga y revisión integral de seguridad.
- Traslado final de datos y reconfiguración de permisos compartidos al cambiar de servidor.

## Alcance y evidencia
- TypeScript, compilación autónoma y compilación de Sites correctos.
- tests/selfhost-storage.mjs: transacciones, Drizzle, persistencia y rutas.
- tests/selfhost-accounts.mjs: invitaciones caducadas/reemplazadas, recuperación concurrente, revocación y desactivación.
- tests/selfhost-api.mjs: integración HTTP completa y restauración real opcional.
- tests/restore-real-backup.mjs: importador anterior en Worker local aislado.
- npm audit completo: cero vulnerabilidades conocidas en la copia local. No es una auditoría integral ni una garantía permanente.
- Publicada la versión 18 el 28/10/2026: d3d5365b5809cb3d909167232c5860323345ee32. Añade alertas de disponibilidad y respaldos; conserva el uso compartido automático. Comprobación visual del 29/10: servidor responde, última copia del 28/10 y 8 tareas visibles. Variante autónoma conservada en el código; no instalada en TrueNAS.
- Guía: LEEME-TRUENAS.md. No se incluyen contraseñas ni datos personales en los scripts de prueba.
