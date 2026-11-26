#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${NEXUS_DESKTOP_URL:-}" ] && [ -f desktop/url.local.txt ]; then
  NEXUS_DESKTOP_URL=$(sed -n '1p' desktop/url.local.txt | tr -d '\r')
  export NEXUS_DESKTOP_URL
fi
exec npm run desktop
