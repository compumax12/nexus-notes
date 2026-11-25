import { createHash, timingSafeEqual } from "node:crypto";

/**
 * @typedef {{status: 401 | 503, error: string}} MaintenanceAuthFailure
 * @typedef {object} MaintenanceAuthOptions
 * @property {401 | 503} [missingSecretStatus] Estado para un secreto ausente o corto; 503 por defecto.
 * @property {string[]} [allowedHeaders] Encabezados bearer aceptados; por defecto Sites y autocontención.
 */

const MIN_SECRET_BYTES = 32;
const BEARER_HEADERS = ["oai-sites-authorization", "authorization"];
const denied = () => ({ status: 401, error: "No autorizado." });

/**
 * Autorización compartida exclusiva de servicio para los endpoints de mantenimiento.
 * Devuelve `null` si autoriza o un descriptor genérico de fallo en caso contrario.
 * Los encabezados de identidad del visitante se ignoran deliberadamente.
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

  // Falla cerrado antes de mirar credenciales: un secreto ausente o corto es un
  // error de configuración, no un token inválido.
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

  // Compara digests SHA-256 de tamaño fijo para cada encabezado permitido,
  // incluidos los ausentes, para que la ruta no dependa de qué encabezado coincidió.
  const expected = createHash("sha256").update(`Bearer ${secret}`, "utf8").digest();
  let authorized = 0;
  for (const name of allowedHeaders) {
    const presented = request.headers.get(name) ?? "";
    const actual = createHash("sha256").update(presented, "utf8").digest();
    authorized |= timingSafeEqual(actual, expected) ? 1 : 0;
  }

  // Se comprueba solo después de la comparación uniforme de credenciales.
  if (request.headers.has("origin")) return denied();
  return authorized ? null : denied();
}
