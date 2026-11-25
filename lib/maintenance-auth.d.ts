/** Generic descriptor returned when maintenance service authorization is denied. */
export type MaintenanceAuthFailure = {
  status: 401 | 503;
  error: string;
};

/** Deployment-specific behavior for missing secrets and accepted bearer headers. */
export type MaintenanceAuthOptions = {
  /** Status for an absent or short secret; defaults to 503 for Sites. */
  missingSecretStatus?: 401 | 503;
  /** Bearer headers to accept; defaults to Sites and selfhost headers. */
  allowedHeaders?: string[];
};

/**
 * Returns `null` when authorized, or a generic failure descriptor otherwise.
 * Any `Origin` is rejected; messages never include credentials.
 */
export declare function maintenanceAuthFailure(
  request: Request,
  secret: string | null | undefined,
  options?: MaintenanceAuthOptions,
): MaintenanceAuthFailure | null;
