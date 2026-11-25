/** Duración máxima de vigencia de un código de emergencia (15 minutos). */
export declare const RECOVERY_TTL_MS: number;

/** Desfase de reloj permitido hacia el futuro (1 minuto). */
export declare const RECOVERY_FUTURE_TOLERANCE_MS: number;

/**
 * Devuelve `true` si el código debe rechazarse: fecha inválida, futura más allá
 * de la tolerancia o con más de `RECOVERY_TTL_MS` de antigüedad.
 */
export declare function recoveryCodeExpired(
  createdAt: string | null | undefined,
  now?: number,
): boolean;
