import assert from "node:assert/strict";
import { maintenanceAuthFailure } from "../lib/maintenance-auth.mjs";

const endpoint = "https://sites.example/api/maintenance";
const request = (headers = {}) => new Request(endpoint, { headers });

// 32 caracteres, 64 bytes UTF-8: importan los bytes, no el número de caracteres.
const secret = "é".repeat(32);
const failures = [];

const sites = maintenanceAuthFailure(
  request({ "OAI-Sites-Authorization": `Bearer ${secret}` }),
  secret,
);
assert.equal(sites, null, "el bearer de Sites debe autorizar");

const selfhost = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${secret}` }),
  secret,
);
assert.equal(selfhost, null, "el bearer de autocontención debe autorizar");

const exactBytes = "é".repeat(16);
assert.equal(
  maintenanceAuthFailure(
    request({ Authorization: `Bearer ${exactBytes}` }),
    exactBytes,
  ),
  null,
  "un secreto multibyte de 32 bytes debe autorizar",
);

const invalidToken = "x".repeat(secret.length);
const invalid = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${invalidToken}` }),
  secret,
);
assert.equal(invalid.status, 401);
assert.equal(invalid.error, "No autorizado.");
failures.push([invalid, [secret, invalidToken]]);

const missingHeader = maintenanceAuthFailure(request(), secret);
assert.deepEqual(
  missingHeader,
  invalid,
  "un encabezado ausente debe ser indistinguible de uno inválido",
);

const invalidSitesHeader = maintenanceAuthFailure(
  request({ "OAI-Sites-Authorization": `Bearer ${invalidToken}` }),
  secret,
);
assert.deepEqual(
  invalidSitesHeader,
  invalid,
  "un encabezado Sites inválido debe dar el mismo fallo genérico",
);
failures.push([invalidSitesHeader, [secret, invalidToken]]);

const validSecondHeader = maintenanceAuthFailure(
  request({
    "OAI-Sites-Authorization": `Bearer ${invalidToken}`,
    Authorization: `Bearer ${secret}`,
  }),
  secret,
);
assert.equal(
  validSecondHeader,
  null,
  "una credencial válida en el segundo encabezado permitido debe autorizar",
);

const validFirstHeader = maintenanceAuthFailure(
  request({
    "OAI-Sites-Authorization": `Bearer ${secret}`,
    Authorization: `Bearer ${invalidToken}`,
  }),
  secret,
);
assert.equal(
  validFirstHeader,
  null,
  "las comparaciones posteriores no deben revocar una coincidencia anterior",
);

const sameCharacters = "e".repeat(secret.length);
const multibyte = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${sameCharacters}` }),
  secret,
);
assert.equal(multibyte.status, 401);
failures.push([multibyte, [secret, sameCharacters]]);

const sameByteLength = "ë".repeat(secret.length);
const wrongBytes = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${sameByteLength}` }),
  secret,
);
assert.equal(wrongBytes.status, 401);
failures.push([wrongBytes, [secret, sameByteLength]]);

const reversed = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${secret}` }),
  "e".repeat(32),
);
assert.equal(reversed.status, 401);
failures.push([reversed, [secret]]);

for (const missing of [undefined, null, "", "x".repeat(31), "é".repeat(15)]) {
  const closed = maintenanceAuthFailure(
    request({ Authorization: `Bearer ${secret}` }),
    missing,
  );
  assert.equal(closed.status, 503, "un secreto ausente o corto debe fallar cerrado");
  assert.equal(closed.error, "Servicio no disponible.");
  failures.push([closed, missing ? [secret, missing] : [secret]]);
}

const fromBrowser = maintenanceAuthFailure(
  request({
    "OAI-Sites-Authorization": `Bearer ${secret}`,
    Origin: "https://browser.example",
  }),
  secret,
);
assert.equal(fromBrowser.status, 401, "cualquier Origin debe rechazarse");
failures.push([fromBrowser, [secret]]);

const lowercaseScheme = maintenanceAuthFailure(
  request({ Authorization: `bearer ${secret}` }),
  secret,
);
assert.equal(lowercaseScheme.status, 401, "el esquema bearer en minúsculas debe rechazarse");
failures.push([lowercaseScheme, [secret]]);

const doubleSpace = maintenanceAuthFailure(
  request({ Authorization: `Bearer  ${secret}` }),
  secret,
);
assert.equal(doubleSpace.status, 401, "un espacio extra tras Bearer debe rechazarse");
failures.push([doubleSpace, [secret]]);

const duplicateAuthorization = new Headers();
duplicateAuthorization.append("Authorization", `Bearer ${secret}`);
duplicateAuthorization.append("Authorization", `Bearer ${invalidToken}`);
const duplicated = maintenanceAuthFailure(
  new Request(endpoint, { headers: duplicateAuthorization }),
  secret,
);
assert.equal(duplicated.status, 401, "los encabezados Authorization duplicados deben rechazarse");
failures.push([duplicated, [secret, invalidToken]]);

const duplicateSites = new Headers();
duplicateSites.append("OAI-Sites-Authorization", `Bearer ${secret}`);
duplicateSites.append("OAI-Sites-Authorization", `Bearer ${invalidToken}`);
const duplicatedSites = maintenanceAuthFailure(
  new Request(endpoint, { headers: duplicateSites }),
  secret,
);
assert.equal(duplicatedSites.status, 401, "los encabezados Sites duplicados deben rechazarse");
failures.push([duplicatedSites, [secret, invalidToken]]);

const visitorOnly = maintenanceAuthFailure(
  request({
    "oai-authenticated-user-id": "qa_nexus_test",
    "oai-authenticated-user-email": "user@example.test",
  }),
  secret,
);
assert.equal(visitorOnly.status, 401, "solo la identidad del visitante debe rechazarse");
failures.push([visitorOnly, [secret]]);

for (const [failure, sensitive] of failures) {
  for (const value of sensitive) {
    assert.ok(!failure.error.includes(value), "el error no debe repetir credenciales");
  }
}

console.log(
  "PASS: la autenticación de mantenimiento compara todos los encabezados permitidos de forma uniforme, acepta un bearer válido en cualquiera, da el mismo fallo genérico a encabezados ausentes e inválidos, rechaza credenciales malformadas/duplicadas/de visitante y Origin, falla cerrado sin secreto válido y nunca repite credenciales.",
);
