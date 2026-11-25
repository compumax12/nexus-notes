/** Descriptor genérico devuelto cuando se deniega la autorización de mantenimiento. */
export type MaintenanceAuthFailure = {
  status: 401 | 503;
  error: string;
};

/** Comportamiento según el despliegue para secretos ausentes y encabezados bearer aceptados. */
export type MaintenanceAuthOptions = {
  /** Estado para un secreto ausente o corto; 503 por defecto en Sites. */
  missingSecretStatus?: 401 | 503;
  /** Encabezados bearer aceptados; por defecto Sites y autocontención. */
  allowedHeaders?: string[];
};

/**
 * Devuelve `null` si autoriza o un descriptor genérico de fallo en caso contrario.
 * Cualquier `Origin` se rechaza; los mensajes nunca incluyen credenciales.
 */
export declare function maintenanceAuthFailure(
  request: Request,
  secret: string | null | undefined,
  options?: MaintenanceAuthOptions,
): MaintenanceAuthFailure | null;
