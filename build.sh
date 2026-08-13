#!/bin/bash

# Build script for creating distributable package
echo "Starting build process..."

# Clean dist directory
echo "Cleaning dist directory..."
npm run clean

# Create dist directory structure
echo "Creating directory structure..."
mkdir -p dist/public/css/themes
mkdir -p dist/public/images
mkdir -p dist/public/uploads
mkdir -p dist/routes
mkdir -p dist/data
mkdir -p dist/migrations

# Copy backend files
echo "Copying backend files..."
cp index.js dist/
cp db.js dist/
cp polyfills.js dist/
cp admin.js dist/
cp initializedb.sql dist/
cp package.json dist/
cp package-lock.json dist/
cp README.md dist/
cp LICENSE dist/ 2>/dev/null || echo "No LICENSE file found"

# Copy routes
echo "Copying routes..."
cp routes/*.js dist/routes/

# Copy data files
echo "Copying data files..."
cp data/*.js dist/data/

# Copy migrations
echo "Copying migrations..."
cp migrations/*.sql dist/migrations/

# Minify JavaScript files
echo "Minifying JavaScript files..."
npx terser public/client.js -c -m -o dist/public/client.js
npx terser public/service-worker.js -c -m -o dist/public/service-worker.js
npx terser public/markercluster.js -c -m -o dist/public/markercluster.js 2>/dev/null || cp public/markercluster.js dist/public/

# Minify CSS files
echo "Minifying CSS files..."
npx cleancss -o dist/public/css/client.css public/css/client.css
npx cleancss -o dist/public/css/admin.css public/css/admin.css
npx cleancss -o dist/public/css/shared.css public/css/shared.css
npx cleancss -o dist/public/css/mobile.css public/css/mobile.css
npx cleancss -o dist/public/css/mobile-landscape.css public/css/mobile-landscape.css
npx cleancss -o dist/public/css/logo.css public/css/logo.css

# Minify theme CSS files
echo "Minifying theme CSS files..."
npx cleancss -o dist/public/css/themes/glass.css public/css/themes/glass.css 2>/dev/null || echo "glass.css not found"
npx cleancss -o dist/public/css/themes/standard.css public/css/themes/standard.css 2>/dev/null || echo "standard.css not found"

# Minify HTML files
echo "Minifying HTML files..."
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o dist/public/index.html public/index.html
npx html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o dist/public/admin.html public/admin.html

# Copy other assets
echo "Copying other assets..."
cp public/manifest.json dist/public/
cp public/images/* dist/public/images/ 2>/dev/null || echo "No images found"
cp public/uploads/.gitkeep dist/public/uploads/

# Copy environment template if exists
cp .env.example dist/ 2>/dev/null || echo "No .env.example found"

echo "Build complete! Distributable files are in the 'dist' directory."
echo ""
echo "To deploy:"
echo "1. Copy the 'dist' directory to your server"
echo "2. Run 'npm install --production' in the dist directory"
echo "3. Configure your .env file"
echo "4. Run 'npm start'"
