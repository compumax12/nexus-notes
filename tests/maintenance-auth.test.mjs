import assert from "node:assert/strict";
import { maintenanceAuthFailure } from "../lib/maintenance-auth.mjs";

const endpoint = "https://sites.example/api/maintenance";
const request = (headers = {}) => new Request(endpoint, { headers });

// 32 characters, 64 UTF-8 bytes: byte length, not character count, matters.
const secret = "é".repeat(32);
const failures = [];

const sites = maintenanceAuthFailure(
  request({ "OAI-Sites-Authorization": `Bearer ${secret}` }),
  secret,
);
assert.equal(sites, null, "Sites bearer header must authorize");

const selfhost = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${secret}` }),
  secret,
);
assert.equal(selfhost, null, "Authorization bearer header must authorize");

const exactBytes = "é".repeat(16);
assert.equal(
  maintenanceAuthFailure(
    request({ Authorization: `Bearer ${exactBytes}` }),
    exactBytes,
  ),
  null,
  "32-byte multibyte secret must authorize",
);

const invalidToken = "x".repeat(secret.length);
const invalid = maintenanceAuthFailure(
  request({ Authorization: `Bearer ${invalidToken}` }),
  secret,
);
assert.equal(invalid.status, 401);
assert.equal(invalid.error, "No autorizado.");
failures.push([invalid, [secret, invalidToken]]);

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
  assert.equal(closed.status, 503, "missing or short secret must fail closed");
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
assert.equal(fromBrowser.status, 401, "any Origin must be rejected");
failures.push([fromBrowser, [secret]]);

const lowercaseScheme = maintenanceAuthFailure(
  request({ Authorization: `bearer ${secret}` }),
  secret,
);
assert.equal(lowercaseScheme.status, 401, "lowercase bearer scheme must be rejected");
failures.push([lowercaseScheme, [secret]]);

const doubleSpace = maintenanceAuthFailure(
  request({ Authorization: `Bearer  ${secret}` }),
  secret,
);
assert.equal(doubleSpace.status, 401, "extra space after Bearer must be rejected");
failures.push([doubleSpace, [secret]]);

const duplicateAuthorization = new Headers();
duplicateAuthorization.append("Authorization", `Bearer ${secret}`);
duplicateAuthorization.append("Authorization", `Bearer ${invalidToken}`);
const duplicated = maintenanceAuthFailure(
  new Request(endpoint, { headers: duplicateAuthorization }),
  secret,
);
assert.equal(duplicated.status, 401, "duplicate bearer headers must be rejected");
failures.push([duplicated, [secret, invalidToken]]);

const duplicateSites = new Headers();
duplicateSites.append("OAI-Sites-Authorization", `Bearer ${secret}`);
duplicateSites.append("OAI-Sites-Authorization", `Bearer ${invalidToken}`);
const duplicatedSites = maintenanceAuthFailure(
  new Request(endpoint, { headers: duplicateSites }),
  secret,
);
assert.equal(duplicatedSites.status, 401, "duplicate Sites bearer headers must be rejected");
failures.push([duplicatedSites, [secret, invalidToken]]);

const visitorOnly = maintenanceAuthFailure(
  request({
    "oai-authenticated-user-id": "qa_nexus_test",
    "oai-authenticated-user-email": "user@example.test",
  }),
  secret,
);
assert.equal(visitorOnly.status, 401, "visitor identity alone must be rejected");
failures.push([visitorOnly, [secret]]);

for (const [failure, sensitive] of failures) {
  for (const value of sensitive) {
    assert.ok(!failure.error.includes(value), "error must not echo credentials");
  }
}

console.log(
  "PASS: maintenance service auth accepts both bearer headers, rejects malformed/duplicate/visitor-only credentials, invalid and byte-mismatched tokens and Origin, fails closed without a valid secret, and never echoes credentials.",
);
