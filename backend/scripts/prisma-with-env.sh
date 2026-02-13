#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: prisma-with-env.sh <command> [args...]" >&2
  exit 1
fi

db_url="${DATABASE_URL:-}"
direct_url="${DIRECT_DATABASE_URL:-}"

if [ -z "$db_url" ] && [ -z "$direct_url" ]; then
  echo "DATABASE_URL or DIRECT_DATABASE_URL must be set." >&2
  exit 1
fi

if [ -z "$db_url" ]; then
  db_url="$direct_url"
fi

if [ -z "$direct_url" ]; then
  direct_url="$db_url"
fi

export DATABASE_URL="$db_url"
export DIRECT_DATABASE_URL="$direct_url"

exec "$@"
