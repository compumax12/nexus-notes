const VARIABLE_URL = 'NEXUS_DESKTOP_URL';
const URL_POR_DEFECTO = 'http://127.0.0.1:3000';

export function resolveDesktopUrl(entorno = process.env) {
  const configurado = entorno?.[VARIABLE_URL];
  const valor = typeof configurado === 'string' ? configurado.trim() : '';
  const destino = valor || URL_POR_DEFECTO;

  if (destino.includes('#')) {
    throw new Error('La URL de escritorio no puede incluir un fragmento hash.');
  }

  if (destino.includes('?')) {
    throw new Error('La URL de escritorio no puede incluir una consulta.');
  }

  let url;
  try {
    url = new URL(destino);
  } catch {
    throw new Error('La URL de escritorio no es válida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('La URL de escritorio debe usar solo los protocolos http o https.');
  }

  if (!url.hostname) {
    throw new Error('La URL de escritorio debe incluir un nombre de host.');
  }

  if (url.username || url.password) {
    throw new Error('La URL de escritorio no puede incluir usuario ni contraseña.');
  }

  if (url.hash) {
    throw new Error('La URL de escritorio no puede incluir un fragmento hash.');
  }

  if (url.search) {
    throw new Error('La URL de escritorio no puede incluir una consulta.');
  }

  if (url.port) {
    const puerto = Number(url.port);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
      throw new Error('La URL de escritorio tiene un puerto no válido.');
    }
  }

  if (url.pathname !== '/') {
    throw new Error('La URL de escritorio debe apuntar a la raíz del servidor.');
  }

  return url.toString();
}
