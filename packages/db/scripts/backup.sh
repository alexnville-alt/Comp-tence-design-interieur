#!/usr/bin/env bash
# Sauvegarde de la base (M12, docs/02 §8 : « quotidiennes, restauration
# testée une fois par mois »). Format personnalisé `pg_dump -Fc` — compressé,
# et seul format compatible avec `pg_restore --jobs` pour paralléliser une
# restauration sur une grosse base, contrairement à un dump SQL brut.
#
# Usage : DATABASE_URL=... ./backup.sh [répertoire-de-sortie]
set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL est requis." >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$OUT_DIR/atelier-$TIMESTAMP.dump"

# `?schema=public` (convention Prisma) n'est pas un paramètre de requête
# libpq reconnu — `pg_dump`/`pg_restore` le rejettent (« invalid URI query
# parameter »). L'application n'utilise qu'un seul schéma (`public`, le
# défaut), donc retirer la chaîne de requête entière est sans effet sur ce
# qui est sauvegardé.
PG_URL="${DATABASE_URL%%\?*}"

pg_dump --format=custom --file="$OUT_FILE" "$PG_URL"

echo "Sauvegarde écrite : $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
