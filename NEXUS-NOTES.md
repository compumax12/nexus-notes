# Nexus Notes

Aplicación personal de tareas, notas dentro de tareas, pasos, porcentajes, prioridades y colaboración opcional. Código privado del propietario.

## Estado actual

- Resumen al entrar; vistas separadas por estado, Hoy y prioridades.
- Recordatorios concretos con tarjetas flotantes y acceso a la tarea.
- Configuración: exportación e importación de respaldos JSON, y cambio de contraseña adicional.
- Cada cuenta tiene tareas privadas por defecto. El creador decide qué correos pueden ver y editar una tarea completa (incluye notas y pasos), y puede retirar permisos.
- La entrada sigue dependiendo de ChatGPT y del acceso permitido por Sites. Añadir un correo a una tarea NO invita a esa persona a Sites automáticamente.
- El repositorio contiene código, migraciones y pruebas. No contiene los datos de la base de producción, contraseñas de usuarios ni tokens.

## Trabajar desde otra computadora

1. Clonar el repositorio privado con Git o GitHub Desktop usando tu cuenta.
2. Instalar Node.js >=22.13.0 y Git.
3. En la carpeta del proyecto ejecutar `npm run install:ci`.
4. Ejecutar `npm run build` para generar la configuración local del Worker.
5. Crear la base local aplicando las migraciones de `drizzle/` en orden, una sola vez en una base vacía:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/NOMBRE_DE_MIGRACION.sql`
6. Ejecutar `npm run dev` y abrir la dirección local que indique. La vista local usa una cuenta ficticia y una base separada de producción.
7. Validar con `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `node --experimental-strip-types --test tests/task-logic.test.mjs` y `npm run build`.
8. Guardar cambios con Git y enviarlos al repositorio privado. Descargar o modificar el código no actualiza automáticamente el sitio publicado.

El README del starter describe el runtime y los perfiles de ejecución. No subir `.env*`, `.wrangler`, copias de bases, `node_modules`, credenciales ni archivos de respaldo personales al repositorio.

## Prueba de privacidad y acceso

`tests/local-api-smoke.mjs` prueba aislamiento entre tres usuarios ficticios, lectura y edición compartida, prohibición de cambiar permisos por un colaborador, retirada de acceso y cambio de contraseña con invalidación de sesiones.

Se ejecuta exclusivamente contra un Worker local en `127.0.0.1:8787`, con las migraciones aplicadas. Usa usuarios desechables `qa_nexus_owner`, `qa_nexus_peer`, `qa_nexus_other`; requiere que estén ausentes antes de cada ejecución. Nunca ejecutar contra producción. El Worker local de pruebas acepta encabezados de identidad simulados: no exponer ese servidor a la red.

## Migración a alojamiento y dominio propios

La migración aún no está hecha. Conectar un dominio no sustituye el hosting ni el acceso con ChatGPT.

1. Elegir alojamiento y base de datos. El runtime actual usa Vinext/Cloudflare Workers y D1 (SQLite) con Drizzle.
2. Sustituir `app/chatgpt-auth.ts` y el acceso del proveedor por autenticación propia; la identidad debe salir de una sesión validada, nunca de encabezados enviados libremente por el cliente.
3. Crear identidades estables propias y mapear cada `owner` de Sites a su nuevo usuario sin mezclar datos. Los ID de Sites son específicos de este sitio.
4. Mantener las autorizaciones de `app/api/tasks/route.ts` y `app/api/notes/route.ts`: propietario o correo verificado incluido en `shared_with`; solo el propietario cambia permisos. Los correos compartidos deben corresponder a correos verificados del nuevo sistema.
5. Exportar e importar la base con todos los propietarios y permisos. El respaldo JSON por usuario permite restaurar copias privadas desde Configuración (hasta 200 tareas, 200 apuntes y 5 MB por archivo); reimportar el mismo contenido omite las copias ya restauradas. NO es un volcado completo multiusuario y no restablece permisos compartidos.
6. Restablecer contraseñas mediante un flujo seguro y revocar sesiones al migrar. No exportar hashes ni sesiones en respaldos descargables.
7. Configurar secretos fuera de Git, HTTPS, dominio, copias de base y recuperación de cuenta.
8. Repetir pruebas de aislamiento, permisos, revocación y restauración antes de cambiar el dominio.

## Próximos pasos pendientes

- Invitar a la persona indicada por el propietario en Sites (falta su correo).
- Recuperación de cuenta cuando también se pierde ChatGPT; requiere autenticación independiente.
- Historial detallado de cambios.
- Autenticación independiente, despliegue y dominio propios.

## Apuntes independientes

La sección Apuntes permite crear y editar textos de hasta 10 000 caracteres, buscarlos por título o contenido y filtrar privados/compartidos. Comienzan privados. El propietario puede compartir por correo verificado y retirar acceso; los colaboradores pueden editar el texto pero no los permisos. La persona también debe tener acceso al sitio en Sites.

El respaldo JSON versión 2 incluye tareas y apuntes. El importador sigue leyendo versión 1 (solo tareas), restaura todo como copias privadas y no duplica la misma importación. No exporta contraseñas ni sesiones. Las pruebas locales cubren aislamiento, edición compartida, revocación, validación y restauración de apuntes.

## Tareas recurrentes

En el formulario, el propietario puede elegir No repetir, Diaria, Semanal o Mensual. Las recurrentes requieren fecha límite. Al pasar a 100% y guardar se crea exactamente una sucesora en la misma transacción: mantiene propietario, permisos, título, solicitante, prioridad y pasos; reinicia avance y pasos y deja las notas en el trabajo anterior. La fecha se calcula desde el vencimiento anterior, por lo que un trabajo atrasado puede generar otro vencido. Las mensuales conservan el día original y lo ajustan al último día de meses cortos (31 de enero → 28 de febrero → 31 de marzo).

La tarea terminada permanece en el historial. Para detener la cadena, seleccionar No repetir en la tarea siguiente pendiente. Editar una terminada no modifica una sucesora que ya existe. Reabrir y completar una misma tarea no genera una segunda sucesora. Los colaboradores pueden completar tareas compartidas, pero no cambiar la frecuencia. Respaldos incluyen la frecuencia; al restaurar se crean copias privadas independientes de la cadena original.

## Recuperación y copias en la nube

Configuración permite generar un código de emergencia con reautenticación por contraseña. Se muestra una sola vez; la base guarda únicamente su hash. Se requiere la misma identidad de ChatGPT para canjearlo; es de un solo uso, comparte el límite de intentos de acceso y revoca sesiones al restablecer. Cada usuario debe generar y guardar su código antes de necesitarlo. No recupera una cuenta de ChatGPT perdida.

Las copias diarias en R2 contienen tareas y apuntes propios, sin hashes de contraseñas, códigos ni sesiones. Se conserva una copia por fecha de Perú y las últimas 30. Límite por usuario: 200 tareas, 200 apuntes y 5 MB. Configuración lista solo las copias del usuario desbloqueado; se descargan y se importan como copias privadas. R2 está separado de D1, pero sigue en el mismo proveedor: aún falta una copia externa para desastres de cuenta/proveedor.

La ruta de mantenimiento usa autenticación de servicio explícita: acepta el bearer de Sites en `OAI-Sites-Authorization` (y `Authorization` en la variante autónoma) y lo compara por bytes con `NEXUS_MAINTENANCE_TOKEN` mediante `timingSafeEqual`. Soporta audiencia compartida; no depende de la audiencia owner-private ni de identidad de visitante. Rechaza cualquier petición con `Origin` y falla cerrado con 503 si el secreto falta o tiene menos de 32 bytes. Ver MAINTENANCE.md.

Revisión de seguridad 23/10/2026: npm audit completo devuelve 0 vulnerabilidades conocidas tras actualizar React/RSC 19.3.1, Vinext 1.3.0, Vite 8.3.5, Cloudflare Vite 1.65.0, Wrangler 4.152.0 y dependencias transitivas. Overrides acotados: @esbuild-kit/core-utils usa esbuild 0.25.12; satori usa fflate 0.7.5. TypeScript, compilación, carga de pantalla de acceso y pruebas completas de API aprobados. drizzle-kit generate confirma que no hay cambios de esquema. El timeout local de respaldos no se reprodujo con esta versión. Esto no sustituye una auditoría independiente ni pruebas de carga. Ver ESTADO.md.

Nota sobre auditorías (25/11/2026): `npm audit` revisa paquetes publicados en el registro, pero no cubre los bundles embebidos en `next/dist/compiled`. Un resultado limpio no es la única señal de seguridad: hay que revisar también el código, la compilación y las pruebas al actualizar dependencias.
