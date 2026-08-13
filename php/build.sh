#!/usr/bin/env bash
# =================================================================
# php/build.sh — Build script for the PHP/Apache version of GAPI
# =================================================================
# Run from the PROJECT ROOT (c:/gitlab/gapi), not from inside php/.
#
# Usage:
#   bash php/build.sh              — normal build → dist-php/
#   bash php/build.sh --reset-db   — build + wipe & re-seed the DB
#   bash php/build.sh --help       — show this help
# =================================================================

set -euo pipefail

# ------------------------------------------------------------------
# Colour helpers (gracefully degrade if the terminal doesn't support them)
# ------------------------------------------------------------------
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}${*}${RESET}"; }
success() { echo -e "${GREEN}✓ ${*}${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  ${*}${RESET}"; }
error()   { echo -e "${RED}✗ ${*}${RESET}" >&2; }
banner()  { echo -e "\n${BOLD}$(printf '─%.0s' {1..60})${RESET}"; echo -e "${BOLD}${*}${RESET}"; echo -e "${BOLD}$(printf '─%.0s' {1..60})${RESET}"; }

# ------------------------------------------------------------------
# CLI argument parsing
# ------------------------------------------------------------------
RESET_DB=false

for arg in "$@"; do
  case "$arg" in
    --reset-db|-r) RESET_DB=true ;;
    --help|-h)
      echo ""
      echo -e "${BOLD}PHP Build Script — Garage Sale Finder${RESET}"
      echo "======================================"
      echo "Run from the project root (not from inside php/)."
      echo ""
      echo "Usage:"
      echo "  bash php/build.sh [options]"
      echo ""
      echo "Options:"
      echo "  (none)        Build the PHP distributable into dist-php/"
      echo "  --reset-db    Wipe Docker DB volumes and re-seed on next start"
      echo "  -r            Shorthand for --reset-db"
      echo "  --help, -h    Show this help message"
      echo ""
      echo "Examples:"
      echo "  bash php/build.sh"
      echo "  bash php/build.sh --reset-db"
      echo ""
      exit 0
      ;;
    *)
      error "Unknown option: $arg"
      echo "Run 'bash php/build.sh --help' for usage."
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------
# Verify we are running from the project root
# ------------------------------------------------------------------
if [[ ! -f "php/docker-compose.yml" ]]; then
  error "This script must be run from the project root directory."
  error "Example: bash php/build.sh"
  exit 1
fi

# ------------------------------------------------------------------
# Main build
# ------------------------------------------------------------------
banner "PHP Build — Garage Sale Finder"
if $RESET_DB; then
  warn "Mode: BUILD + DATABASE RESET"
else
  info "Mode: Normal build"
fi

# ── Step 1: Clean ─────────────────────────────────────────────────
echo ""
info "[1/7] Cleaning dist-php/ directory..."
rm -rf dist-php
echo "  Removed dist-php/"

# ── Step 2: Directory structure ───────────────────────────────────
echo ""
info "[2/7] Creating directory structure..."
mkdir -p dist-php/api
mkdir -p dist-php/public/css/themes
mkdir -p dist-php/public/images
mkdir -p dist-php/public/uploads
echo "  Created dist-php/{api,public/css/themes,public/images,public/uploads}"

# ── Step 3: Copy PHP backend files ────────────────────────────────
echo ""
info "[3/7] Copying PHP backend files..."

# API PHP files
for f in php/api/config.php php/api/events.php php/api/sale_types.php \
          php/api/item_categories.php php/api/reports.php; do
  if [[ -f "$f" ]]; then
    cp "$f" "dist-php/api/$(basename "$f")"
    echo "  Copied $f"
  fi
done

# Root PHP/config files
declare -A ROOT_FILES=(
  ["php/.htaccess"]="dist-php/.htaccess"
  ["php/initializedb.sql"]="dist-php/initializedb.sql"
  ["php/README.md"]="dist-php/README.md"
  ["php/Dockerfile"]="dist-php/Dockerfile"
  ["php/docker-compose.yml"]="dist-php/docker-compose.yml"
  ["php/docker-entrypoint.sh"]="dist-php/docker-entrypoint.sh"
)
for src in "${!ROOT_FILES[@]}"; do
  dest="${ROOT_FILES[$src]}"
  if [[ -f "$src" ]]; then
    cp "$src" "$dest"
    echo "  Copied $src"
  fi
done

# Make entrypoint executable in the dist
chmod +x dist-php/docker-entrypoint.sh 2>/dev/null || true

# Optional LICENSE
[[ -f LICENSE ]] && cp LICENSE dist-php/LICENSE && echo "  Copied LICENSE"

# ── Step 4: Minify JavaScript ─────────────────────────────────────
echo ""
info "[4/7] Minifying JavaScript files..."
for entry in \
  "public/client.js:dist-php/public/client.js" \
  "public/service-worker.js:dist-php/public/service-worker.js" \
  "public/markercluster.js:dist-php/public/markercluster.js"; do
  src="${entry%%:*}"
  dest="${entry##*:}"
  if [[ -f "$src" ]]; then
    if npx terser "$src" -c -m -o "$dest" 2>/dev/null; then
      echo "  Minified $src"
    else
      cp "$src" "$dest"
      echo "  Copied (minify failed) $src"
    fi
  fi
done

# ── Step 5: Minify CSS ────────────────────────────────────────────
echo ""
info "[5/7] Minifying CSS files..."
CSS_FILES=(
  "public/css/client.css"
  "public/css/admin.css"
  "public/css/shared.css"
  "public/css/mobile.css"
  "public/css/mobile-landscape.css"
  "public/css/logo.css"
  "public/css/themes/glass.css"
  "public/css/themes/standard.css"
)
for file in "${CSS_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    dest="dist-php/${file#public/}"   # strip leading "public/" → keep relative path
    dest="dist-php/public/${file#public/}"
    mkdir -p "$(dirname "$dest")"
    npx cleancss -o "$dest" "$file" 2>/dev/null && echo "  Minified $file" || \
      { cp "$file" "$dest"; echo "  Copied (minify failed) $file"; }
  fi
done

# ── Step 6: Minify HTML ───────────────────────────────────────────
echo ""
info "[6/7] Minifying HTML files..."
for entry in \
  "public/index.html:dist-php/public/index.html" \
  "public/admin.html:dist-php/public/admin.html"; do
  src="${entry%%:*}"
  dest="${entry##*:}"
  if [[ -f "$src" ]]; then
    npx html-minifier-terser \
      --collapse-whitespace --remove-comments \
      --minify-js true --minify-css true \
      -o "$dest" "$src" 2>/dev/null && echo "  Minified $src" || \
      { cp "$src" "$dest"; echo "  Copied (minify failed) $src"; }
  fi
done

# ── Step 7: Remaining assets ──────────────────────────────────────
echo ""
info "[7/7] Copying remaining assets..."
[[ -f public/manifest.json ]] && cp public/manifest.json dist-php/public/manifest.json && echo "  Copied manifest.json"
[[ -d public/images ]]        && cp -r public/images/. dist-php/public/images/         && echo "  Copied images/"
[[ -f public/uploads/.gitkeep ]] && cp public/uploads/.gitkeep dist-php/public/uploads/.gitkeep && echo "  Copied uploads/.gitkeep"

# .gitignore for the dist
cat > dist-php/.gitignore << 'EOF'
# PHP distributable — do not commit credentials
api/config.php
uploads/*
!uploads/.gitkeep
EOF
echo "  Created dist-php/.gitignore"

# ------------------------------------------------------------------
# Database reset (optional)
# ------------------------------------------------------------------
if $RESET_DB; then
  banner "⚠  DATABASE RESET"
  warn "This will:"
  echo "  1. Stop and remove all PHP Docker containers"
  echo "  2. Delete the db_data and uploads_data Docker volumes"
  echo "  3. Rebuild the images and restart the containers"
  echo "  4. MySQL will re-run initializedb.sql on first boot"
  echo ""
  warn "Starting in 5 seconds… press Ctrl-C to abort."
  sleep 5

  echo ""
  info "[DB-1/2] Stopping containers and removing volumes..."
  docker compose -f php/docker-compose.yml down -v || true

  echo ""
  info "[DB-2/2] Rebuilding and starting containers..."
  docker compose -f php/docker-compose.yml up --build -d

  echo ""
  success "Database reset complete."
  echo "  MySQL is initialising — it may take 15–30 seconds before the app responds."
  echo "  Visit http://localhost:8080 once the containers are healthy."
else
  echo ""
  echo "$(printf '=%.0s' {1..60})"
  success "PHP build complete!  Distributable files → dist-php/"
  echo "$(printf '=%.0s' {1..60})"
  echo ""
  echo "To run with Docker (from the project root):"
  echo "  docker compose -f php/docker-compose.yml up --build"
  echo ""
  echo "To reset the database (wipe all data and re-seed):"
  echo "  bash php/build.sh --reset-db"
  echo ""
  echo "To deploy to shared hosting:"
  echo "  1. Upload the contents of dist-php/ to your web root"
  echo "  2. Edit api/config.php with your MySQL credentials"
  echo "  3. Import initializedb.sql via phpMyAdmin"
  echo "  4. Ensure uploads/ is writable (chmod 755 or 777)"
fi

echo ""
