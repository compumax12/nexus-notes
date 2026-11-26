import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, session, shell } from 'electron';
import { resolveDesktopUrl } from './url.mjs';

const url = resolveDesktopUrl();
const origenPermitido = new URL(url).origin;
const particion = 'persist:nexus-notes';
const rutaError = path.join(path.dirname(fileURLToPath(import.meta.url)), 'error.html');
const urlError = pathToFileURL(rutaError).toString();

const denegarPermisos = (_webContents, _permission, callback) => {
  if (typeof callback === 'function') {
    callback(false);
    return;
  }
  return false;
};

function origenDe(destino) {
  try {
    return new URL(destino, url).origin;
  } catch {
    return null;
  }
}

function abrirEnSistema(destino) {
  shell.openExternal(destino).catch(() => {});
}

function abrirSiEsExterno(destino) {
  if (origenDe(destino) === origenPermitido) return false;
  try {
    const externa = new URL(destino, url);
    if (externa.protocol === 'http:' || externa.protocol === 'https:') {
      abrirEnSistema(externa.toString());
    } else if (
      externa.protocol === 'mailto:' &&
      /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(externa.href)
    ) {
      abrirEnSistema(externa.href);
    } else if (
      externa.protocol === 'tel:' &&
      /^tel:\+?[0-9()\-\s]{3,20}$/i.test(externa.href)
    ) {
      abrirEnSistema(externa.href);
    }
    // Los demás esquemas se descartan: nunca se abren fuera de la app.
  } catch {
    // Destino no válido: se descarta sin abrir nada.
  }
  return true;
}

function crearVentana() {
  const win = new BrowserWindow({
    title: 'Nexus Notes',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      partition: particion,
    },
  });

  let mostrandoError = false;

  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && !win.isVisible()) win.show();
  });

  win.once('did-fail-load', (_event, _codigo, _descripcion, _destino, esPrincipal) => {
    if (!esPrincipal || win.isDestroyed() || win.isVisible()) return;
    mostrandoError = true;
    win.loadFile(rutaError).catch(() => {});
    win.show();
  });

  function limitarNavegacion(event, destino) {
    if (mostrandoError || destino === url || destino === urlError) return;
    if (abrirSiEsExterno(destino)) event.preventDefault();
  }

  win.webContents.on('will-navigate', limitarNavegacion);
  win.webContents.on('will-redirect', limitarNavegacion);
  win.webContents.on('will-frame-navigate', (event, destino, _enMarco, esPrincipal) => {
    if (esPrincipal) return; // Ya lo cubren will-navigate y will-redirect.
    limitarNavegacion(event, destino);
  });

  win.webContents.setWindowOpenHandler(({ url: destino }) => {
    abrirSiEsExterno(destino);
    return { action: 'deny' };
  });

  win.loadURL(url);
  return win;
}

app.whenReady().then(() => {
  for (const sesion of [session.defaultSession, session.fromPartition(particion)]) {
    sesion.setPermissionRequestHandler(denegarPermisos);
    sesion.setPermissionCheckHandler(() => false);
  }
  crearVentana();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) crearVentana();
});
