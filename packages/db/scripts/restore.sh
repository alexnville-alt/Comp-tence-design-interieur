#!/usr/bin/env bash
# Restauration d'une sauvegarde produite par backup.sh (M12).
#
# `--clean --if-exists` : supprime les objets existants avant de les
# recréer, pour que la restauration soit idempotente sur une base qui
# contient déjà un schéma (le cas réel d'un exercice de restauration testé
# sur l'infrastructure de production, docs/02 §8) — sans, une deuxième
# restauration échouerait sur des objets déjà présents.
# `--no-owner --no-privileges` : les rôles Postgres diffèrent d'un
# environnement à l'autre (base locale vs. fournisseur hébergé) ; restaurer
# les propriétaires/droits d'origine échouerait sur un rôle qui n'existe pas
# dans l'environnement cible.
#
# Usage : DATABASE_URL=... ./restore.sh <fichier.dump>
set -euo pipefail

DUMP_FILE="${1:?Usage : DATABASE_URL=... ./restore.sh <fichier.dump>}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL est requis." >&2
  exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "Fichier introuvable : $DUMP_FILE" >&2
  exit 1
fi

# Voir la même note dans backup.sh : `?schema=public` n'est pas un paramètre
# de requête libpq valide.
PG_URL="${DATABASE_URL%%\?*}"

pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$PG_URL" "$DUMP_FILE"

echo "Restauration terminée depuis : $DUMP_FILE"
