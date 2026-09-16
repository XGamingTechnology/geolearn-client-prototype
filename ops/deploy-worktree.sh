#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT=/opt/geolearn
readonly REPOSITORY="$ROOT/repository.git"

case "${1:-}" in
  production)
    readonly BRANCH=production
    readonly WORKTREE="$ROOT/worktrees/production"
    readonly COMPOSE_FILE=compose.production.yml
    readonly ENV_FILE="$ROOT/secrets/production.env"
    ;;
  staging)
    readonly BRANCH=staging
    readonly WORKTREE="$ROOT/worktrees/staging"
    readonly COMPOSE_FILE=compose.staging.yml
    readonly ENV_FILE="$ROOT/secrets/staging.env"
    ;;
  *)
    echo "Usage: $0 <production|staging>" >&2
    exit 64
    ;;
esac

[[ -d "$REPOSITORY" ]] || { echo "Missing bare repository: $REPOSITORY" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Missing environment file: $ENV_FILE" >&2; exit 1; }

git --git-dir="$REPOSITORY" fetch --prune origin   "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"

if [[ ! -e "$WORKTREE/.git" ]]; then
  mkdir -p "$(dirname "$WORKTREE")"
  git --git-dir="$REPOSITORY" worktree add     "$WORKTREE"     -B "$BRANCH"     "refs/remotes/origin/$BRANCH"
fi

git -C "$WORKTREE" reset --hard "refs/remotes/origin/$BRANCH"

compose=(docker compose --env-file "$ENV_FILE" --file "$WORKTREE/deploy/$COMPOSE_FILE")

# Build the runtime and migrator separately. This makes a stale migrator image visible
# instead of letting the deployment appear successful while migrations/scripts lag behind.
"${compose[@]}" build --pull web
"${compose[@]}" build --pull migrate

if ! "${compose[@]}" run --rm --no-deps migrate sh -lc \
  'test -f apps/web/scripts/bootstrap-admin.mjs && grep -q "\"auth:bootstrap-admin\"" apps/web/package.json'; then
  echo "Migrator image verification failed; forcing a clean migrator rebuild." >&2
  "${compose[@]}" build --pull --no-cache migrate
  "${compose[@]}" run --rm --no-deps migrate sh -lc \
    'test -f apps/web/scripts/bootstrap-admin.mjs && grep -q "\"auth:bootstrap-admin\"" apps/web/package.json'
fi

"${compose[@]}" up --detach --remove-orphans
