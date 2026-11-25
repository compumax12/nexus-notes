# Nexus Notes en tu equipo y en TrueNAS

Actualizado: 28/10/2026. La variante autónoma está guardada en GitHub. El sitio de Sites tiene la versión 17 con uso compartido automático; la variante autónoma no está desplegada en TrueNAS. Manual introductorio: MANUAL-CON-MANZANITAS.md.

## Qué está comprobado

La variante autónoma compila y funciona con Node 24, SQLite y archivos locales. No necesita ChatGPT, D1 ni R2. Pasaron pruebas de ingreso, invitaciones de un uso, recuperación, revocación de sesiones, privacidad entre cuentas, edición compartida, respaldos e importación. Se restauraron las 6 tareas del respaldo real del 23/10 sin duplicados y conservando contenido y avance. El respaldo real no incluía apuntes; estos se comprobaron con datos de prueba.

Hay Dockerfile y Compose. Compose pasa validación de sintaxis; **el contenedor no se ha construido ni ejecutado**, porque el motor de Docker local no está iniciado. Tampoco se ha probado todavía en TrueNAS ni configurado dominio/HTTPS. No confundir la prueba de Node con una prueba del contenedor.

## 1. Ejecutar localmente en Windows

Instala Node.js 24 y abre PowerShell en la carpeta del proyecto. No necesitas iniciar el sitio antiguo para usar esta variante.

```powershell
npm ci --ignore-scripts
npm run build:selfhost
$env:NEXUS_DATA_DIR = Join-Path (Get-Location) '.nexus-data'
$env:NEXUS_ORIGIN = 'http://127.0.0.1:3000'
node selfhost/start.mjs
```

Abre http://127.0.0.1:3000. La primera vez no existen cuentas. Déjalo funcionando y abre otra terminal en la misma carpeta con el mismo NEXUS_DATA_DIR.

```powershell
$env:NEXUS_DATA_DIR = Join-Path (Get-Location) '.nexus-data'
node selfhost/manage.mjs invite TU_CORREO "TU NOMBRE"
```

Sustituye TU_CORREO y TU NOMBRE por los tuyos. Copia el código que aparece, entra en **Tengo invitación** y elige tu usuario y contraseña. El código caduca en 24 horas y se consume al crear la cuenta. La contraseña se introduce en la app, nunca como argumento de consola.

Para añadir otra persona, repite `invite` con SU correo y nombre. Entrega su código por un canal privado; permite reclamar la identidad del correo invitado, por lo que debes verificar a quién se lo entregas. No hay envío de correo automático ni registro público. También puedes hacerlo desde Configuración después de habilitar tu cuenta como administradora con el paso siguiente.

Para desactivar una cuenta sin borrar sus datos:

```powershell
node selfhost/manage.mjs disable NOMBRE_DE_USUARIO
```

La desactivación revoca sesiones. La administración visual permite reactivar cuentas no administradoras; no hay borrado de usuarios.

Dentro de Configuración, genera y guarda el código de emergencia. Para recuperar acceso necesitarás ese código y tu nombre de usuario. Un cambio de contraseña invalida las sesiones y el código anterior: genera otro después.

### Habilitar la administración visual de usuarios

Después de crear tu cuenta, ejecuta en otra terminal, desde esta carpeta y con el mismo NEXUS_DATA_DIR:

```powershell
node selfhost/manage.mjs admin TU_USUARIO
```

En Docker, usa `docker compose -f compose.selfhost.yaml exec nexus node selfhost/manage.mjs admin TU_USUARIO`.

Entra en **Configuración → Usuarios y privacidad**. Podrás crear invitaciones, ver y anular las pendientes, consultar cuentas, desactivar accesos y reactivarlos. El código se muestra una sola vez: cópialo antes de salir. Las invitaciones duran 24 horas; generar otra para el mismo correo invalida la anterior. No se envían mensajes automáticamente.

Desactivar una cuenta cierra sus sesiones y conserva sus datos. Reactivarla no recupera sesiones antiguas: la persona debe iniciar sesión otra vez. La interfaz no permite desactivar cuentas administradoras; sus permisos se asignan desde la consola. Ser administrador no permite leer tareas ni apuntes privados de otros usuarios.

## 2. Archivos que debes conservar

- Fuente: esta carpeta, un archivo completo de la versión local o el repositorio público de GitHub actualizado.
- Datos: el directorio NEXUS_DATA_DIR. Incluye `nexus.sqlite`, sus archivos WAL/SHM mientras esté abierto y `objects/` con los respaldos.
- Respaldo de migración: descarga un JSON reciente desde Configuración del sitio antiguo, justo antes del traslado.
- Guarda una copia fuera del NAS y del proveedor actual.

No copies un SQLite abierto como si fuera un único archivo: usa una copia consistente del dataset o detén la app antes de copiar todo el directorio. Para actualizar, respalda primero los datos. Las migraciones SQL se aplican automáticamente y se comprueba que ninguna migración ya aplicada cambie de contenido.

No subir `.nexus-data`, `.wrangler`, `.env`, contraseñas, códigos de invitación/emergencia ni respaldos personales a GitHub. `.gitignore` y `.dockerignore` excluyen las carpetas locales habituales.

## 3. Preparar TrueNAS

Confirma versión, arquitectura y pool. Las versiones de SCALE/Community con Apps basadas en Docker admiten aplicaciones personalizadas mediante Compose. CORE usa otra plataforma; esta guía no es una receta de instalación para CORE.

Crea un dataset dedicado, por ejemplo `/mnt/TU_POOL/apps/nexus-notes/data`. Sustituye TU_POOL. El contenedor usa UID/GID 1000:1000: concede acceso a esa identidad, sin permisos 777. Usa almacenamiento local del NAS para SQLite, no un montaje SMB/NFS. Configura snapshots y una copia externa: un segundo dataset del mismo NAS no es un respaldo contra pérdida del equipo.

## 4. Construir y probar el contenedor antes de instalar

En un equipo con Docker Linux iniciado, desde esta carpeta:

```sh
docker build -f Dockerfile.selfhost -t nexus-notes:local .
```

No se ha ejecutado este comando en la sesión. Si falla, guarda el error y no continúes al despliegue. La imagen contiene las dependencias del servidor Vinext; varias figuran como desarrollo y son necesarias en ejecución, por lo que no deben eliminarse con `npm prune --omit=dev` sin rehacer el empaquetado.

Para Compose local define NEXUS_DATA_PATH como ruta absoluta a una carpeta de datos existente y NEXUS_ORIGIN como `http://127.0.0.1:3000`. Después:

```sh
docker compose -f compose.selfhost.yaml config
docker compose -f compose.selfhost.yaml up -d
docker compose -f compose.selfhost.yaml ps
docker compose -f compose.selfhost.yaml logs --tail=100 nexus
```

El puerto se publica solo en loopback de forma predeterminada. `GET /api/health` comprueba base y almacenamiento sin mostrar datos; Docker consulta esta ruta como healthcheck. Un estado unhealthy no implica por sí solo que Docker reinicie el contenedor: configura una alerta de tu plataforma.

Crea la invitación inicial dentro del contenedor:

```sh
docker compose -f compose.selfhost.yaml exec nexus node selfhost/manage.mjs invite TU_CORREO "TU NOMBRE"
```

Comprueba que puedes registrarte, entrar, crear una tarea y conservarla tras reiniciar el contenedor. Valida también copia, descarga e importación, recuperación y aislamiento con dos cuentas. Estas comprobaciones en Docker/TrueNAS aún están pendientes.

## 5. Llevar la imagen a TrueNAS

Opción sin registro: exporta la imagen construida y llévala al NAS por tu canal privado habitual.

```sh
docker save nexus-notes:local -o nexus-notes-image.tar
```

En una consola con Docker del NAS y con el archivo ya copiado:

```sh
docker load -i /RUTA/nexus-notes-image.tar
```

Alternativamente puedes usar un registro privado con una etiqueta de versión fija. Nunca publiques los datos del dataset dentro de una imagen.

En TrueNAS entra en Apps → Discover Apps → Install via YAML, según tu versión. Toma `compose.selfhost.yaml` como base:

1. Elimina el bloque `build` si vas a usar la imagen ya cargada o descargada.
2. Usa `image: nexus-notes:local` o el identificador de tu imagen privada.
3. Sustituye la ruta NEXUS_DATA_PATH por la ruta absoluta del dataset del NAS.
4. Sustituye NEXUS_ORIGIN por la URL HTTPS definitiva.
5. Resuelve los marcadores `${...}` antes de pegar el YAML si la pantalla no permite variables de entorno para Compose. No pegues el archivo con marcadores sin definir.
6. Conserva el usuario 1000:1000, el volumen persistente y las restricciones del contenedor.
7. Conecta el proxy inverso al puerto interno 3000. La publicación a 127.0.0.1 funciona solo para servicios del mismo host; un proxy en otro contenedor necesita una red Docker compartida o una dirección de escucha configurada y protegida. No hay proxy preseleccionado en este paquete.

## 6. HTTPS y dominio

Fuera de localhost, la aplicación exige que NEXUS_ORIGIN use HTTPS. El proxy debe terminar TLS, conservar el host esperado y enviar `X-Forwarded-Proto: https`. Solo se acepta como host reenviado el host de NEXUS_ORIGIN. El puerto interno de Node debe ser accesible únicamente desde el proxy/red autorizada, porque se confía en ese proxy para el protocolo.

No publiques el panel de TrueNAS, los archivos SQLite ni herramientas de desarrollo. `npm start` conserva la herramienta Wrangler del sitio anterior; para esta variante usa `npm run start:selfhost` o el Dockerfile provisto.

## 7. Copias y mantenimiento

Con la app en marcha, el proceso comprueba cada cinco minutos si ya son las 03:00 o más en America/Lima y ejecuta la copia del día. Al arrancar después de esa hora recupera la comprobación pendiente del día actual. No genera retroactivamente copias de días en que el servidor estuvo apagado. Conserva una copia por día y las últimas 30 por usuario, con los límites actuales de 200 tareas, 200 apuntes y 5 MB.

Los fallos se escriben en los logs sin datos personales y se reintentan. El mantenimiento HTTP requiere un secreto Bearer; si no lo configuras, se genera internamente al arrancar y no se muestra. Para un monitor externo configura un secreto de al menos 32 caracteres mediante `NEXUS_MAINTENANCE_TOKEN_FILE` (archivo montado de solo lectura), o la variable equivalente fuera del código. Nunca lo incluyas en GitHub ni en una URL. La automatización de Sites no mantiene esta instalación.

La comprobación de salud y los logs están disponibles. Las alertas externas y una política de copia fuera del NAS aún deben configurarse en tu infraestructura.

## 8. Importar y pasar a producción

Crea tu cuenta nueva e importa el JSON del sitio anterior desde Configuración. Compara títulos, avances, pasos, fechas y apuntes. El JSON restaura contenido privado, sin cuentas, contraseñas, sesiones, permisos compartidos ni continuidad de cadenas de recurrencia. Vuelve a compartir explícitamente lo necesario. No importa toda la configuración del servidor.

Antes del cambio final: deja de editar el sitio antiguo, descarga la última copia, importa en el destino y verifica. Mantén el sitio anterior y su respaldo hasta confirmar el resultado. No combines importaciones de distintas versiones del mismo contenido esperando una sincronización: la protección contra duplicados aplica a la misma copia, no es un sistema de actualización entre servidores.

## Pruebas reproducibles

```sh
node tests/selfhost-storage.mjs
npm run build:selfhost
node tests/selfhost-api.mjs
```

Para probar una copia real, añade su ruta absoluta al último comando. Se ejecuta en una carpeta temporal, imprime solo resultados y elimina esa copia de prueba al finalizar. No apunta al sitio publicado ni cambia el archivo original.

Referencias oficiales:
- https://apps.truenas.com/managing-apps/installing-custom-apps/
- https://www.truenas.com/docs/scale/apps/installcustomappscreens/


## Recuperación de contraseña por correo (instalación autónoma)

La pantalla **Olvidé mi contraseña** envía un código de 8 dígitos al correo que pertenece a la cuenta (actualmente, el correo de su invitación). El código dura 10 minutos, admite 5 intentos y se consume una sola vez. Los reenvíos requieren un minuto, con máximo 3 por hora y cuenta. Una recuperación correcta cierra las sesiones e invalida el código de emergencia anterior. Se conserva la recuperación de emergencia como alternativa.

El remitente `tu-correo@ejemplo.com` es solo un marcador ilustrativo: sustitúyelo por tu Gmail real. La configuración permanece local y se puede cambiar por otro proveedor SMTP con TLS.

1. En la cuenta remitente, activa la verificación en dos pasos y crea una contraseña de aplicación para Nexus Notes. Introduce esa contraseña únicamente en tu equipo; no uses ni compartas la contraseña normal de Gmail.
2. Guarda la contraseña de aplicación sin espacios en un archivo privado fuera del repositorio, legible solo por tu usuario (en TrueNAS, solo por el usuario del contenedor). No lo incluyas en el archivo del código.
3. En `.env.mail.local` dentro del proyecto, configura:

```dotenv
NEXUS_SMTP_HOST=smtp.gmail.com
NEXUS_SMTP_PORT=465
NEXUS_SMTP_USER=tu-correo@ejemplo.com
NEXUS_SMTP_PASSWORD_FILE=C:/ruta/privada/gmail-app-password.txt
```

4. Reinicia `node selfhost/start.mjs`. El archivo `.env.mail.local` se carga al arrancar y está excluido de Git y Docker. También se aceptan variables de entorno; estas tienen prioridad.
5. Con tu cuenta local ya creada, prueba **Olvidé mi contraseña**, indica su correo registrado y revisa la bandeja de entrada y spam. Una prueba con el correo correcto es necesaria para confirmar la entrega real.

Para Docker/TrueNAS, configura las cuatro variables en el servicio; monta el archivo secreto en modo solo lectura y usa su ruta dentro del contenedor. No copies `.env.mail.local` ni la contraseña dentro de la imagen. Puerto 465 utiliza TLS directo; 587 exige STARTTLS. No se desactiva la validación de certificados.

Sin credenciales, el formulario informa que el envío no está configurado. Las pruebas automatizadas simulan la entrega y no envían mensajes reales. Si falla SMTP, el código emitido se invalida y el servidor registra un aviso sin mostrar contraseñas, direcciones ni códigos. La respuesta pública no revela si el correo existe.

Fuentes: [Contraseñas de aplicación de Google](https://support.google.com/accounts/answer/185833?hl=es), [SMTP de Gmail](https://support.google.com/mail/answer/7104828?hl=es), [TLS de Nodemailer](https://nodemailer.com/smtp).


### Asistente de Gmail para Windows

Desde la raíz del proyecto, en PowerShell, ejecuta:

```powershell
.\selfhost\configure-gmail.ps1
```

Introduce tu correo Gmail real (el marcador de ejemplo no es válido) y la contraseña de aplicación de Google en el campo oculto. El asistente guarda el secreto en `%LOCALAPPDATA%/NexusNotes/secrets/`, con permisos solo para tu usuario de Windows. Comprueba TLS y autenticación sin enviar correo; únicamente si funciona actualiza `.env.mail.local`. Si falla, elimina el archivo nuevo y conserva la configuración anterior. Al cambiar remitente, los archivos secretos anteriores no se eliminan automáticamente: retíralos cuando ya no los uses y revoca las contraseñas antiguas en Google.

Después, reinicia el servidor local y comprueba la recepción usando **Olvidé mi contraseña** con una cuenta registrada. La comprobación SMTP no garantiza entrega en bandeja de entrada. Este asistente es para Windows; en TrueNAS utiliza un secreto montado como se explica arriba.
