#!/usr/bin/env bash
set -euo pipefail

for name in shawty-backend shawty-tunnel shawty-frontend; do
  if [ -f "/tmp/$name.pid" ]; then
    kill "$(cat "/tmp/$name.pid")" 2>/dev/null || true
    rm -f "/tmp/$name.pid"
  fi
done

echo "Stopped Shawty."
