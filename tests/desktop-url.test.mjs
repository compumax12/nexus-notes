import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDesktopUrl } from '../desktop/url.mjs';

function rechaza(valor, mensaje) {
  assert.throws(
    () => resolveDesktopUrl({ NEXUS_DESKTOP_URL: valor }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, mensaje);
      return true;
    },
  );
}

test('usa el servidor local por defecto cuando no hay configuración', () => {
  assert.equal(resolveDesktopUrl({}), 'http://127.0.0.1:3000/');
  assert.equal(resolveDesktopUrl({ NEXUS_DESKTOP_URL: undefined }), 'http://127.0.0.1:3000/');
});

test('considera la variable vacía o con espacios como no configurada', () => {
  assert.equal(resolveDesktopUrl({ NEXUS_DESKTOP_URL: '' }), 'http://127.0.0.1:3000/');
  assert.equal(resolveDesktopUrl({ NEXUS_DESKTOP_URL: '   ' }), 'http://127.0.0.1:3000/');
});

test('acepta una URL HTTPS corporativa en la raíz', () => {
  assert.equal(
    resolveDesktopUrl({ NEXUS_DESKTOP_URL: 'https://nexus.oficina.example' }),
    'https://nexus.oficina.example/',
  );
});

test('rechaza el protocolo file', () => {
  rechaza('file:///tmp/nexus', /protocolos/i);
});

test('rechaza el protocolo javascript', () => {
  rechaza('javascript:alert(1)', /protocolos/i);
});

test('rechaza el protocolo data', () => {
  rechaza('data:text/plain,hola', /protocolos/i);
});

test('rechaza credenciales en el usuario', () => {
  rechaza('https://usuario@nexus.oficina.example', /usuario ni contraseña/i);
});

test('rechaza credenciales en la contraseña', () => {
  rechaza('https://:clave@nexus.oficina.example', /usuario ni contraseña/i);
});

test('rechaza un fragmento hash', () => {
  rechaza('https://nexus.oficina.example/#/notas', /fragmento hash/i);
});

test('rechaza incluso un fragmento hash vacío', () => {
  rechaza('https://nexus.oficina.example/#', /fragmento hash/i);
});

test('rechaza una consulta', () => {
  rechaza('https://nexus.oficina.example/?token=abc', /consulta/i);
});

test('rechaza incluso una consulta vacía', () => {
  rechaza('https://nexus.oficina.example/?', /consulta/i);
});

test('rechaza una subruta', () => {
  rechaza('https://nexus.oficina.example/notas', /raíz/i);
});

test('rechaza barras finales duplicadas', () => {
  rechaza('https://nexus.oficina.example///', /raíz/i);
});

test('rechaza un puerto no numérico', () => {
  rechaza('https://nexus.oficina.example:abc', /válida/i);
});

test('rechaza un puerto fuera de rango', () => {
  rechaza('https://nexus.oficina.example:99999', /válida/i);
  rechaza('https://nexus.oficina.example:0', /puerto no válido/i);
});

test('rechaza una URL sin nombre de host', () => {
  rechaza('https:', /válida|nombre de host/i);
  rechaza('https://', /válida|nombre de host/i);
});

test('normaliza la barra final y el puerto por defecto', () => {
  assert.equal(resolveDesktopUrl({ NEXUS_DESKTOP_URL: 'http://127.0.0.1:3000' }), 'http://127.0.0.1:3000/');
  assert.equal(
    resolveDesktopUrl({ NEXUS_DESKTOP_URL: ' https://NEXUS.oficina.example:443/ ' }),
    'https://nexus.oficina.example/',
  );
});
