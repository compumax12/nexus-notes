import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

/**
 * @typedef {{status: 401 | 503, error: string}} MaintenanceAuthFailure
 * @typedef {object} MaintenanceAuthOptions
 * @property {401 | 503} [missingSecretStatus] Status for an absent or short secret; defaults to 503.
 * @property {string[]} [allowedHeaders] Bearer headers to accept; defaults to Sites and selfhost headers.
 */

const MIN_SECRET_BYTES = 32;
const BEARER_HEADERS = ["oai-sites-authorization", "authorization"];

/**
 * Shared service-only authorization for maintenance endpoints.
 * Returns `null` when authorized, or a generic failure descriptor otherwise.
 * Visitor identity headers are deliberately ignored.
 *
 * @param {Request} request
 * @param {string | null | undefined} secret Configured service secret.
 * @param {MaintenanceAuthOptions} [options]
 * @returns {MaintenanceAuthFailure | null}
 */
export function maintenanceAuthFailure(request, secret, options = {}) {
  const settings = options ?? {};
  const missingSecretStatus = settings.missingSecretStatus === 401 ? 401 : 503;
  const allowedHeaders = Array.isArray(settings.allowedHeaders)
    ? settings.allowedHeaders
    : BEARER_HEADERS;

  // Fail closed before looking at credentials: an absent or short secret is a
  // configuration error, not a bad token.
  if (
    typeof secret !== "string" ||
    Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES
  ) {
    return {
      status: missingSecretStatus,
      error:
        missingSecretStatus === 401
          ? "No autorizado."
          : "Servicio no disponible.",
    };
  }
  if (request.headers.has("origin")) {
    return { status: 401, error: "No autorizado." };
  }

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  let authorized = false;
  for (const name of allowedHeaders) {
    const presented = request.headers.get(name);
    if (presented && equalBytes(presented, expected)) authorized = true;
  }
  return authorized ? null : { status: 401, error: "No autorizado." };
}

/**
 * @param {string} presented
 * @param {Buffer} expected
 */
function equalBytes(presented, expected) {
  const actual = Buffer.from(presented, "utf8");
  // Equal character counts can have different UTF-8 byte lengths.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
