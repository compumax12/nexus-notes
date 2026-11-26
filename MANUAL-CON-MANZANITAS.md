# Nexus Notes: tu proyecto explicado con manzanitas

Actualizado: 28 de octubre de 2026. Manual basado en el código de este repositorio.

## 1. Imagina que Nexus es una oficina

- **La pantalla es el mostrador:** ahí escribes una tarea y pulsas Guardar.
- **El servidor es quien atiende:** verifica quién eres, revisa lo que escribiste y decide si puedes hacerlo.
- **La base de datos es el archivador:** conserva tareas, porcentajes, apuntes y permisos.
- **GitHub guarda los planos de la oficina:** guarda el código para reconstruir la aplicación. No contiene automáticamente tus tareas.
- **Un respaldo guarda una copia de los documentos:** sirve para recuperar tu trabajo si falla el archivador.

Por eso necesitas dos respaldos diferentes: **código en GitHub y datos fuera de GitHub**. Tener uno no sustituye al otro.

## 2. Hay dos formas de ejecutar el mismo proyecto

| | Sitio publicado | Versión autónoma |
|---|---|---|
| Dirección | https://mis-pendientes-ti.robustcup18.chatgpt.site | http://127.0.0.1:3000 en tu equipo |
| Dónde funciona | Alojamiento de Sites | Tu computadora; más adelante tu servidor |
| Entrada | ChatGPT y después la contraseña adicional de Nexus | Usuario y contraseña propios de Nexus |
| Tareas y cuentas | Base D1 del sitio | Archivo SQLite del servidor |
| Copias diarias | Almacenamiento R2 del sitio | Carpeta `objects` dentro del directorio de datos |
| Configuración de compilación | `vite.config.ts` | `vite.selfhost.config.ts` |

**Estas dos instalaciones no sincronizan sus datos entre sí.** Que tus tareas estén en el sitio publicado no significa que ya estén en tu computadora. Para trasladarlas, exporta un respaldo e impórtalo en la cuenta correcta de la nueva instalación.

`127.0.0.1` significa «esta misma computadora». Si le envías esa dirección a otra persona, su navegador buscará Nexus en la computadora de ella, no en la tuya. Para acceso externo a la versión autónoma faltan alojamiento, dominio/proxy y HTTPS.

La carpeta de trabajo actual es:

```text
C:\Users\TU_USUARIO\Downloads\JARVIS-LISTO\sites\mis-pendientes-ti
```

El repositorio público es https://github.com/compumax12/nexus-notes. Compartir tus tareas en Nexus no da acceso al código en GitHub.

## 3. Qué hay en cada carpeta

| Archivo o carpeta | En palabras sencillas | Cuándo lo revisarías |
|---|---|---|
| `app/page.tsx` | Entrada de la pantalla principal en Sites | Si no aparece el panel |
| `app/dashboard.tsx` | Pestañas, listado y formulario de tareas | Si falla una tarea o su formulario |
| `app/overview.tsx` | Resumen y gráficos | Si un indicador se ve mal |
| `app/notes.tsx` | Lista y edición de apuntes | Si falla un apunte |
| `app/settings.tsx` | Pantalla de Configuración | Para ubicar opciones de cuenta y respaldo |
| `app/automatic-sharing.tsx` | Formulario de compartir automáticamente | Si no guarda un destinatario |
| `app/sharing-defaults.ts` | Lee los destinatarios automáticos de la cuenta | Si las nuevas tareas no se comparten |
| `app/task-logic.ts` | Cálculos de avance y fechas de repetición | Si el porcentaje o la próxima fecha está mal |
| `app/unsaved-changes.tsx` | Aviso para conservar o descartar una edición | Si se cierra un formulario con texto sin guardar |
| `app/api/` | Puertas por donde la pantalla pide guardar o leer | Si Guardar da un error |
| `app/chatgpt-auth.ts`, `app/app-lock.ts` | Identificación y bloqueo en Sites | Si falla el acceso publicado |
| `app/backup.ts`, `app/import-backup.tsx` | Formato del respaldo e importador | Si no acepta un archivo JSON |
| `app/cloud-backup-service.ts` | Creación y conservación de copias diarias | Si no aparece la copia del día |
| `db/schema.ts` | Define las columnas del archivador | Si hay que agregar un dato nuevo |
| `db/index.ts` | Conecta el código con la base | Si falla el acceso a datos |
| `drizzle/` | Instrucciones ordenadas para actualizar la base | Si aparece un error de migración |
| `selfhost/` | Adaptación para trabajar en tu propio servidor | Instalación local, usuarios, correo y almacenamiento |
| `tests/` | Pruebas con datos separados | Antes de publicar cambios importantes |
| `public/` | Iconos y archivos estáticos | Cambios de iconos |
| `components/`, `hooks/`, `lib/` | Piezas y utilidades reutilizables | Cambios de componentes o funciones comunes |
| `app/clean-theme.css`, `workspace.css`, `globals.css`, `noche.css` | Colores, espacios y tamaños | Si algo se ve desordenado |
| `package.json` | Lista de piezas necesarias y comandos | Para instalar, compilar y arrancar |
| `package-lock.json` | Versiones concretas de esas piezas | Para reproducir una instalación |
| `.openai/hosting.json` | Identidad y almacenamiento del sitio publicado | Despliegue en Sites; no cambies su identificador |
| `build/`, `scripts/` | Herramientas de construcción y publicación | Si falla la compilación o el empaquetado |
| `Dockerfile.selfhost`, `compose.selfhost.yaml` | Receta para ejecutar en un contenedor | Futura instalación en TrueNAS |
| `ESTADO.md` | Lista de lo hecho y lo pendiente | Para saber por dónde continuar |

Carpetas que **no debes editar para cambiar el programa**:

- `node_modules`: piezas instaladas. Se regeneran con la instalación de dependencias.
- `dist` y `dist-selfhost`: programa ya compilado. Se regeneran al compilar.
- `.nexus-data`: **datos reales de la instalación autónoma**, salvo que hayas configurado otra ruta. No es una carpeta desechable.
- `.wrangler`: datos y estado de la simulación local de Sites. No es la base publicada.
- `.env.mail.local`: configuración local de correo, fuera de GitHub. Puede señalar un archivo secreto; conserva ambos de forma privada.

## 4. Qué sucede al guardar una tarea

```text
Escribes en el formulario
        ↓
dashboard.tsx envía los datos a /api/tasks
        ↓
El servidor verifica tu sesión y tus permisos
        ↓
Revisa título, fecha, porcentaje y pasos
        ↓
Si es nueva, añade los destinatarios automáticos de TU cuenta
        ↓
Guarda en la base de datos
        ↓
Devuelve la tarea guardada y la pantalla actualiza el resumen
```

Si hay pasos, el porcentaje se calcula según los pasos completados. Por ejemplo: 3 de 4 pasos = 75 %. Si no hay pasos, puedes ajustar el porcentaje manualmente.

Un archivo `.tsx` suele combinar comportamiento y pantalla. Un `.ts` o `.mjs` suele contener funciones. Un `.css` define apariencia. Un `.sql` cambia la estructura de la base. Un `.json` contiene datos o configuración.

Ejemplo simplificado de código:

```ts
const porcentaje = Math.round(completados / total * 100);
```

`const` guarda un valor con un nombre. `completados / total` obtiene la parte realizada. `* 100` lo convierte a porcentaje. `Math.round` redondea. Es una explicación: el código real también debe manejar que no existan pasos.

## 5. Cómo funciona el acceso de tu jefa

1. Su correo tiene permiso para entrar al sitio en Sites.
2. Debe entrar con **su propia cuenta de ChatGPT asociada al correo autorizado**.
3. Al ingresar por primera vez a Nexus, configura su propio usuario y contraseña adicional.
4. Nexus muestra los registros que ella creó y los que le compartieron. No necesita tu contraseña.

En **Configuración → Compartir automáticamente** guardas los destinatarios de tu cuenta. Cada tarea o apunte nuevo añade esos correos cuando se guarda. Los avances posteriores quedan en el mismo registro compartido; la otra persona puede actualizar la lista para verlos. No se promete actualización instantánea sin recargar.

La opción permite **ver y editar**, no solo leer. Los permisos se conservan en el servidor y funcionan desde otros dispositivos. No se envía un correo por cada tarea.

**Alcance exacto:**

- Las 7 tareas que existían al hacer esta mejora ya se compartieron con la destinataria autorizada.
- Las tareas y apuntes nuevos se comparten automáticamente mientras la opción siga activada.
- Cambiar la lista automática no modifica los registros anteriores.
- Quitar un destinatario y guardar detiene las nuevas asignaciones. Para retirar acceso anterior, abre cada tarea/apunte y quita su correo; para impedirle entrar al sitio, revoca también su acceso en Sites.
- Los respaldos importados se restauran **privados**, aunque esté activada esta opción. Hay que compartir esas copias explícitamente.
- Una persona puede conservar una copia que ya haya descargado; revocar acceso no borra esa copia.

## 6. Antes de intentar reparar algo

1. Anota qué estabas haciendo y copia el mensaje de error. No incluyas contraseñas ni códigos secretos.
2. Identifica si falla **el sitio publicado o la versión local**. Sus bases son distintas.
3. Si puedes entrar, descarga un JSON desde Configuración → Descargar respaldo.
4. Antes de cambiar código, conserva un commit o copia de los archivos modificados.
5. Antes de cambiar una base local, detén la aplicación y respalda **toda su carpeta de datos**.
6. Cambia una sola cosa y comprueba el resultado.

No borres la base, no cambies permisos del NAS y no reinstales todo como primer intento. Eso puede convertir un fallo pequeño en pérdida de datos.

## 7. Tabla de problemas y primeros pasos

| Problema | Qué comprobar primero | Qué hacer |
|---|---|---|
| El sitio pide ChatGPT | Es el enlace publicado | Entrar con la cuenta autorizada; el usuario de Nexus no sirve en el formulario de ChatGPT |
| Mi jefa entra pero no ve tareas | Correo exacto, etiqueta Compartida y destinatario | Abrir una tarea y revisar su correo; actualizar su lista. No darle tu sesión |
| No se comparte una tarea nueva | Configuración → Compartir automáticamente | Confirmar destinatario guardado; terminar de guardar la tarea. Un borrador aún no existe en el servidor |
| Una tarea antigua sigue compartida tras desactivar | Es el comportamiento previsto | Quitar acceso en esa tarea; desactivar solo afecta a nuevas creaciones |
| No aparece mi avance | Cuenta, pestaña y filtros | Mostrar Todas las tareas, quitar búsqueda/filtros y actualizar; verificar que Guardar terminó sin error |
| Failed to fetch / no hay conexión | Internet o servidor local detenido | Conservar el texto del formulario; recuperar conexión y actualizar antes de repetir cambios |
| La tarea cambió en otra sesión | Otra persona la editó | Copiar tus cambios a un lugar temporal, actualizar y comparar antes de guardar de nuevo |
| Localhost no abre | Servidor en ejecución y puerto correcto | Iniciar la variante autónoma con los comandos siguientes; revisar la terminal |
| Puerto ocupado / EADDRINUSE | Ya existe una aplicación usando el puerto | No terminar todos los procesos Node. Identificar el proceso y detener solo la instancia propia |
| La aplicación local aparece vacía | Ruta de datos y cuenta usadas | Revisar `NEXUS_DATA_DIR` y la carpeta de arranque. No crear otra base sobre la antigua |
| Cambié un archivo pero no veo cambios | ¿Editaste el código fuente? ¿Compilaste? | Compilar y reiniciar la versión local. Subir a GitHub no publica automáticamente en Sites |
| No llega recuperación por correo | Gmail está pendiente de activación real | No esperar un envío todavía. Usar el código de emergencia si está disponible |
| No aparece la copia diaria | Servidor activo, cuenta y límite de respaldo | Probar copia manual y revisar logs. La versión local debe estar encendida para ejecutar su planificador |
| Archivo JSON rechazado | Formato Nexus, tamaño y límites | No modificarlo a mano; usar una exportación válida. Hasta 5 MB, 200 tareas y 200 apuntes |
| Error de migración | SQL aplicado cambiado o versiones mezcladas | Detener actualización, preservar base y pedir revisión. No editar migraciones aplicadas |
| SQLite corrupta / disk I/O error | Disco, espacio y registros | Detener escrituras y preservar carpeta completa; recuperar en una copia aislada, no improvisar reparación sobre el original |

## 8. Comandos locales: cuándo usarlos

Abre PowerShell. Estos comandos son para la **versión autónoma**, no reparan por sí solos el sitio publicado.

```powershell
Set-Location 'C:\Users\TU_USUARIO\Downloads\JARVIS-LISTO\sites\mis-pendientes-ti'
node --version
git status --short
```

Usamos Node 24 para las pruebas de la variante autónoma. Para instalar dependencias en una copia nueva:

```powershell
npm ci --ignore-scripts
```

Para verificar y compilar, ejecuta cada comando y continúa **solo si termina correctamente**:

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run build:selfhost
node tests/selfhost-storage.mjs
node tests/selfhost-accounts.mjs
node tests/selfhost-api.mjs
node tests/selfhost-email-recovery.mjs
```

Las pruebas autónomas usan datos temporales. La prueba de API utiliza el puerto 3097; si está ocupado por otra aplicación, resuélvelo antes. El envío de correo de las pruebas es simulado: no confirma que Gmail esté funcionando.

Para iniciar la instalación local, usa siempre la misma ruta de datos:

```powershell
$env:NEXUS_DATA_DIR = 'C:\Users\TU_USUARIO\Downloads\JARVIS-LISTO\sites\mis-pendientes-ti\.nexus-data'
$env:NEXUS_ORIGIN = 'http://127.0.0.1:3000'
$env:PORT = '3000'
node selfhost/start.mjs
```

La terminal queda ocupada mientras sirve la aplicación. En otra terminal puedes consultar:

```powershell
Invoke-RestMethod 'http://127.0.0.1:3000/api/health'
```

Si no responde, revisa la terminal del servidor. Si devuelve error, revisa almacenamiento y logs. Una respuesta correcta no comprueba todos los permisos ni todos los formularios.

Para detener la instancia que iniciaste, pulsa **Ctrl+C en su terminal**. No uses un comando que termine todos los procesos Node del equipo.

## 9. Cómo hacer un cambio pequeño sin perderte

Ejemplo: cambiar un texto del resumen.

1. Descarga un respaldo y comprueba `git status`.
2. Crea una rama de trabajo: `git switch -c mejora-texto-resumen`.
3. Busca el texto en `app/overview.tsx` o `app/dashboard.tsx`.
4. Cambia solo ese texto; no cambies los permisos ni la base.
5. Ejecuta TypeScript y la compilación autónoma.
6. Prueba en una instalación con datos de prueba, no directamente sobre el trabajo diario.
7. Revisa `git diff` antes de guardar.
8. Añade los archivos concretos, crea un commit y sube la rama. Por ejemplo:

```powershell
git add app/overview.tsx
git commit -m 'Aclarar texto del resumen'
git remote -v
```

Si trabajas desde un clon normal de GitHub, normalmente el remoto se llama `origin`. En esta carpeta de trabajo el remoto de GitHub se llama `github`. Usa el nombre que mostró el comando anterior:

```powershell
git push -u github mejora-texto-resumen
```

**No uses `--force`.** La historia de trabajo de Sites y la de GitHub se conservaron por separado. En esta carpeta no debes empujar `main` a ciegas: puede rechazar el envío por historias diferentes. Para trabajar desde casa, resulta más sencillo clonar el repositorio público en una carpeta nueva y continuar su propia historia.

No pegues una contraseña ni token en la URL del repositorio. Inicia sesión en GitHub mediante el mecanismo de autenticación de tu cliente.

## 10. Recuperar el código si un cambio salió mal

Primero conserva tus cambios actuales en otra rama o commit. Consulta:

```powershell
git status --short
git log -8 --oneline
git diff
```

Si un commit concreto causó el problema, un desarrollador puede revertirlo con `git revert HASH_DEL_COMMIT`. Sustituye el marcador por el commit verificado. Eso crea un cambio inverso y conserva el historial. Puede requerir resolver conflictos; no continúes sin entenderlos.

Después vuelve a comprobar y compilar. **Revertir código no deshace automáticamente cambios en la base de datos.** Si hubo una migración, revisa la compatibilidad antes de arrancar una versión anterior. No borres SQL aplicado ni la tabla de migraciones.

Para el sitio publicado, una versión anterior de Sites puede servir para recuperar el programa, pero también hay que revisar compatibilidad con la base. Guardar una versión en GitHub no es publicarla. Las publicaciones de Sites deben hacerse con su flujo de versiones y comprobar que terminen correctamente.

## 11. Recuperar tus tareas desde JSON

1. Conserva también un respaldo del estado actual antes de importar.
2. Entra con la cuenta que debe recibir las tareas.
3. Abre Configuración → Importar respaldo y selecciona el JSON.
4. Revisa la vista previa y confirma la restauración.
5. Comprueba títulos, pasos, porcentajes y apuntes.
6. Reaplica los permisos de las copias que quieras compartir.

El importador crea copias privadas y evita repetir las mismas copias al reimportar el mismo contenido. **No es una máquina del tiempo:** no reemplaza la base, no restaura contraseñas, usuarios ni destinatarios automáticos. Si había un registro dañado con contenido diferente, puede seguir apareciendo junto a la copia restaurada. Revisa antes de eliminar nada.

## 12. Respaldar y recuperar toda la instalación autónoma

Un JSON recupera contenido. Una copia consistente de **todo `NEXUS_DATA_DIR`** conserva también cuentas, sesiones, permisos y preferencias almacenados en la base, además de los archivos de respaldo.

Antes de copiar en Windows:

1. Detén Nexus y comprueba que ninguna otra instancia use esa misma base.
2. Copia la carpeta de datos completa a una ubicación nueva y protegida. No copies solamente `nexus.sqlite` mientras está abierto: SQLite puede tener información pendiente en `nexus.sqlite-wal`.
3. Guarda el commit/versión del código y la configuración del servidor junto a una nota de la fecha. Los secretos se guardan aparte y en privado.
4. Conserva otra copia fuera del equipo o NAS.

Para probar una recuperación, usa **una carpeta nueva con la copia completa**, una instancia aislada y el código compatible. No sobrescribas el directorio original. Apunta `NEXUS_DATA_DIR` a la copia, inicia Nexus y comprueba cuentas, contenido y permisos. Solo cambia la instalación real después de comprobar la recuperación.

Si la base está corrupta y no tienes una copia válida, detén las escrituras y conserva todos los archivos. La recuperación avanzada requiere revisar el caso; no hay un comando universal seguro que garantice reparar una base dañada.

## 13. Cuando lo lleves a TrueNAS

Lee [LEEME-TRUENAS.md](LEEME-TRUENAS.md) antes de instalar. El contenedor debe guardar `/data` en un dataset persistente; si queda dentro de una capa temporal, puedes perder datos al reemplazar el contenedor.

El código incluye Compose, pero **la ejecución real en Docker/TrueNAS sigue pendiente de prueba**. No se modificó tu NAS durante este trabajo.

Cuando ya tengas esa instalación validada, estos comandos sirven para diagnosticarla desde su carpeta y con Docker disponible:

```sh
docker compose -f compose.selfhost.yaml ps
docker compose -f compose.selfhost.yaml logs --tail=100 nexus
```

Un reinicio se hace solo sobre el servicio Nexus y después de leer el error; no reinicies todo el NAS como primer intento. No uses `down -v`, no borres datasets y no cambies permisos generales para resolver un fallo de esta aplicación.

## 14. Información útil para pedir ayuda

Envía este resumen sin secretos:

```text
Instalación: publicada / local / TrueNAS
Qué intenté hacer:
Qué esperaba:
Qué ocurrió:
Mensaje de error exacto:
Fecha y hora aproximada:
Último cambio realizado:
Commit o versión:
¿Hay un respaldo reciente?:
¿Le ocurre también a otra persona?:
```

No envíes tu contraseña, código de emergencia, invitaciones, archivos `.env` ni la base completa por un chat público. Una captura del error suele ser suficiente para empezar.

## 15. Estado y rutina de mantenimiento

Consulta [ESTADO.md](ESTADO.md) para la lista completa actualizada.

- **Hecho:** compartir las 7 tareas existentes, destinatarios automáticos para tareas/apuntes nuevos, pruebas de permisos, publicación de la versión 17 y respaldo del código en GitHub.
- **Pendiente con personas reales:** comprobar el primer ingreso de la destinataria y que vea los registros desde su propia cuenta.
- **Pendiente técnico:** activar Gmail, completar las pruebas móviles, crear/importar datos en la instalación autónoma definitiva, validar Docker/TrueNAS, dominio/HTTPS y copias externas.

Después de una mejora: prueba el comportamiento, actualiza `ESTADO.md`, guarda el código en GitHub y verifica la publicación si corresponde. Después de trabajo importante: descarga un respaldo de datos. De forma periódica: comprueba que puedes restaurar una copia en un entorno aislado; un archivo que nunca se ha probado no demuestra que la recuperación funcione.

## 16. Alertas de fallos dentro de Nexus

En Configuración aparece Estado de Nexus. Se consulta cada minuto mientras la pestaña esté visible, al volver a ella y al pulsar Comprobar ahora. Si hay un problema aparece un aviso en las demás pestañas.

- Sin Internet: conserva el texto pendiente; no se envía automáticamente al reconectar.
- Sin contacto: se requieren dos comprobaciones fallidas; puede ser un problema de tu conexión o del servidor.
- Fallo del servicio: el servidor respondió con error al consultar base o almacenamiento.
- Sesión no verificable: inicia sesión o desbloquea la app.
- Sin copias: crea una en Configuración → Respaldos.
- Copia atrasada: se avisa cuando la más reciente tiene dos o más días de calendario en Perú; se admite la de ayer por el horario diario.
- Copia no verificable: no se pudo consultar; no significa que se haya borrado.
- Conexión recuperada: actualiza los registros antes de repetir un guardado, para evitar pisar cambios de otra persona.

La consulta no escribe pruebas en tus datos ni garantiza una restauración. No comprueba el correo ni el espacio libre del NAS. No usa Telegram, Gmail, notificaciones del sistema ni monitor externo. Con la app cerrada, o si la página no llega a cargar, no puede mostrar avisos. La última hora correcta mostrada corresponde a la respuesta del servidor, no necesariamente a la última copia.

## 17. Comprobar permisos antes de migrar

El 29/10/2026 se ejecutó la prueba de integración local con dos cuentas ficticias y una base temporal. Comprobó que cada cuenta descarga solo sus copias, que un usuario normal no puede ejecutar mantenimiento y que una credencial malformada se rechaza sin error interno. Esto es una revisión focalizada, no una auditoría completa.

Para repetirla con Node 24 y las dependencias instaladas: ejecuta `npm run build:selfhost` y después `node tests/selfhost-api.mjs` desde la carpeta del proyecto. El puerto 3097 debe estar libre. La prueba crea sus propios datos temporales y los elimina al terminar; no la apuntes a la base real.

**Copias en el sitio compartido:** las instrucciones actuales de mantenimiento exigen que el sitio sea exclusivo del propietario. Como ahora tiene una colaboradora, falta adaptar y verificar ese acceso de servicio. La presencia de copias antiguas no demuestra que el planificador siga funcionando. Por ahora usa Configuración → Respaldos en la nube → Crear copia de hoy y conserva también una descarga fuera del equipo.
