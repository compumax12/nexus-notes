import { LinkIcon } from "lucide-react";
import { connectorErrorRecovery } from "@/lib/connector-errors.mjs";

/** Render in the affected feature, leaving the rest of the Site usable. */
export function ConnectorError({
  error,
  connectorName,
  reconnectHref,
}: {
  error: { status: string; message: string };
  connectorName: string;
  reconnectHref: string;
}) {
  const recovery = connectorErrorRecovery(error, connectorName, reconnectHref);
  return (
    <div role="alert" className="panel-quiet stack">
      <p>{recovery.message}</p>
      {recovery.action && (
        <a className="action action-quiet" href={recovery.action.href} target="_top">
          <LinkIcon aria-hidden="true" />
          <span>{recovery.action.label}</span>
        </a>
      )}
    </div>
  );
}
