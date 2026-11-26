# Cliente de escritorio

Ventana de escritorio para Windows, macOS y Linux (según el sistema) que se conecta a **una sola instancia central** del servidor selfhost de la oficina. Las tareas se comparten entre usuarios con las cuentas y permisos actuales del servidor. **No es** mensajería tipo BeeBEEP ni sincronización entre pares: no descubre otros equipos ni fusiona bases locales. Este ciclo se verificó en Windows; en los demás sistemas se usa el mismo cliente con el lanzador `.sh`.

## Requisitos

- Node.js >=22.13.0.
- Dependencias instaladas en la carpeta del proyecto con `npm ci` (incluye Electron 45.5.0).
- Servidor selfhost accesible desde la red de la oficina.
- Una cuenta creada en ese servidor para cada persona.

## Configuración

La variable `NEXUS_DESKTOP_URL` indica la URL base del servidor.

- Si no se define, usa `http://127.0.0.1:3000` (solo para probar en el mismo equipo).
- Admite solo `http` o `https`: esquema, host y puerto opcional. Sin credenciales incrustadas, sin subrutas, sin consulta (ni vacía) ni fragmento.
- En la oficina usa la URL HTTPS definitiva publicada por el proxy inverso.

### Puesto de oficina (recomendado)

1. Crea un archivo `desktop/url.local.txt` con **una sola línea**: la URL base del servidor, por ejemplo el marcador `https://nexus.oficina.example`. Ese archivo está ignorado por Git: no se sube al repositorio.
2. En Windows, haz doble clic en `desktop/nexus-notes.cmd`. En macOS/Linux, ejecuta `sh desktop/nexus-notes.sh`.
3. Si la variable `NEXUS_DESKTOP_URL` ya está definida en el terminal, ese valor tiene prioridad.

## Arranque manual

Windows (PowerShell):

```powershell
$env:NEXUS_DESKTOP_URL = "https://..."
npm run desktop
```

macOS/Linux:

```sh
export NEXUS_DESKTOP_URL="https://..."
npm run desktop
```

Sustituye `https://...` por la URL base real. La variable afecta solo al terminal donde se ejecuta el comando.

## Instalación en cada puesto

1. Copiar la carpeta de la versión o clonar el repositorio público en el equipo.
2. Ejecutar `npm ci` en esa carpeta.
3. Crear `desktop/url.local.txt` con la URL del servidor, como se indica arriba.
4. Abrir la app con el lanzador de tu sistema (`nexus-notes.cmd` o `sh desktop/nexus-notes.sh`).

Cada persona inicia sesión con su cuenta. La sesión se guarda en el perfil local de Electron de ese puesto; no se comparten archivos de sesión entre equipos ni se copian al repositorio.

## Seguridad

- La ventana no expone Node: sin `nodeIntegration` y con aislamiento de contexto (`contextIsolation`) y entorno limitado (`sandbox`) activados.
- La navegación se limita al origen configurado, incluidas redirecciones y marcos; los enlaces `http`/`https`, `mailto` y `tel` válidos se abren con el programa del sistema y los demás esquemas se descartan.
- Permisos de dispositivo denegados (cámara, micrófono, geolocalización).
- Si el servidor no responde, aparece una pantalla de error local en lugar de una ventana en blanco.
- No guardar contraseñas ni tokens en el repositorio, en `url.local.txt` ni en la URL.
- El cliente no sustituye HTTPS ni el proxy inverso: TLS y la protección perimetral los proporciona el servidor.

## Prueba rápida

1. Crea las cuentas en el servidor con `node selfhost/manage.mjs invite CORREO "NOMBRE"`; la guía completa está en `LEEME-TRUENAS.md`.
2. Dos puestos con cuentas distintas, ambos con la misma URL del servidor.
3. Desde una cuenta, crear una tarea y compartirla con la otra; verificar que la segunda la ve y que se respetan los permisos.
4. Ejecutar `npm run test:desktop-url` para comprobar la validación de la URL en local.

## Limitaciones

- Sigue haciendo falta el servidor central: si se apaga, la app no sincroniza.
- No hay descubrimiento automático; la URL se configura una vez en cada puesto.
- No añade cifrado de extremo a extremo nuevo: la confidencialidad depende del servidor y de HTTPS.
- La ventana se ha verificado en Windows; en macOS y Linux el arranque es el mismo pero no hay prueba de esos sistemas en este ciclo.
