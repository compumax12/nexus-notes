/** Duración máxima de vigencia de un código de emergencia (15 minutos). */
export const RECOVERY_TTL_MS = 900000;
/** Desfase de reloj permitido hacia el futuro (1 minuto). */
export const RECOVERY_FUTURE_TOLERANCE_MS = 60000;

/**
 * Indica si un código de emergencia debe rechazarse por su fecha de creación.
 * Devuelve `true` para fechas inválidas, fechas futuras más allá de la tolerancia
 * y códigos con más de `RECOVERY_TTL_MS` de antigüedad.
 *
 * @param {string | null | undefined} createdAt Fecha ISO de creación.
 * @param {number} now Instante actual inyectable para pruebas.
 * @returns {boolean}
 */
export function recoveryCodeExpired(createdAt, now = Date.now()) {
  const created = Date.parse(createdAt ?? "");
  if (!Number.isFinite(created) || !Number.isFinite(now)) return true;
  if (created > now + RECOVERY_FUTURE_TOLERANCE_MS) return true;
  return now - created > RECOVERY_TTL_MS;
}
