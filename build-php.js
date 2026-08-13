#!/usr/bin/env node
// =================================================================
// build-php.js — Build script for the PHP/Apache version of GAPI
// =================================================================
// Usage:
//   node build-php.js              — normal build
//   node build-php.js --reset-db   — build + wipe & re-seed the DB
//   node build-php.js --help       — show usage
// =================================================================

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ------------------------------------------------------------------
// CLI argument parsing
// ------------------------------------------------------------------
const args      = process.argv.slice(2);
const RESET_DB  = args.includes('--reset-db') || args.includes('-r');
const SHOW_HELP = args.includes('--help')     || args.includes('-h');

if (SHOW_HELP) {
  console.log(`
PHP Build Script — Garage Sale Finder
======================================
Usage:
  node build-php.js [options]

Options:
  (none)        Build the PHP distributable into dist-php/
  --reset-db    Wipe the Docker database volumes and re-seed on next
                container start (runs: docker compose down -v && up --build)
  -r            Shorthand for --reset-db
  --help, -h    Show this help message

Examples:
  node build-php.js
  node build-php.js --reset-db
  npm run build:php
  npm run build:php:reset
`);
  process.exit(0);
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function exec(command, options = {}) {
  try {
    console.log(`  Running: ${command}`);
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`  ✗ Error executing: ${command}`);
    if (!options.ignoreErrors) throw error;
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Skipping ${src} (not found)`);
    return;
  }
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(srcPath, destPath) : copyFile(srcPath, destPath);
  }
}

function banner(msg) {
  console.log('\n' + '─'.repeat(60));
  console.log(msg);
  console.log('─'.repeat(60));
}

// ------------------------------------------------------------------
// Main build
// ------------------------------------------------------------------
banner('PHP Build — Garage Sale Finder');
console.log(`Mode: ${RESET_DB ? '⚠  BUILD + DATABASE RESET' : 'Normal build'}`);

// Step 1 — Clean output directory
console.log('\n[1/7] Cleaning dist-php/ directory...');
if (fs.existsSync('dist-php')) {
  fs.rmSync('dist-php', { recursive: true, force: true });
  console.log('  Removed dist-php/');
}

// Step 2 — Create directory structure
console.log('\n[2/7] Creating directory structure...');
const dirs = [
  'dist-php/api',
  'dist-php/public/css/themes',
  'dist-php/public/images',
  'dist-php/public/uploads',
];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`  Created ${dir}`);
});

// Step 3 — Copy PHP backend files
console.log('\n[3/7] Copying PHP backend files...');

// PHP API files
const phpApiFiles = [
  'php/api/config.php',
  'php/api/events.php',
  'php/api/sale_types.php',
  'php/api/item_categories.php',
  'php/api/reports.php',
];
phpApiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    copyFile(file, path.join('dist-php', 'api', path.basename(file)));
    console.log(`  Copied ${file}`);
  }
});

// Root PHP files
const phpRootFiles = [
  { src: 'php/.htaccess',        dest: 'dist-php/.htaccess' },
  { src: 'php/initializedb.sql', dest: 'dist-php/initializedb.sql' },
  { src: 'php/README.md',        dest: 'dist-php/README.md' },
  { src: 'php/Dockerfile',       dest: 'dist-php/Dockerfile' },
  { src: 'php/docker-compose.yml',   dest: 'dist-php/docker-compose.yml' },
  { src: 'php/docker-entrypoint.sh', dest: 'dist-php/docker-entrypoint.sh' },
];
phpRootFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    copyFile(src, dest);
    console.log(`  Copied ${src}`);
  }
});

// Optional: LICENSE
if (fs.existsSync('LICENSE')) {
  copyFile('LICENSE', 'dist-php/LICENSE');
  console.log('  Copied LICENSE');
}

// Step 4 — Minify JavaScript
console.log('\n[4/7] Minifying JavaScript files...');
const jsFiles = [
  { src: 'public/client.js',        dest: 'dist-php/public/client.js' },
  { src: 'public/service-worker.js', dest: 'dist-php/public/service-worker.js' },
  { src: 'public/markercluster.js', dest: 'dist-php/public/markercluster.js' },
];
jsFiles.forEach(({ src, dest }) => {
  if (!fs.existsSync(src)) return;
  try {
    exec(`npx terser ${src} -c -m -o ${dest}`);
    console.log(`  Minified ${src}`);
  } catch {
    console.log(`  Could not minify ${src} — copying as-is`);
    copyFile(src, dest);
  }
});

// Step 5 — Minify CSS
console.log('\n[5/7] Minifying CSS files...');
const cssFiles = [
  'public/css/client.css',
  'public/css/admin.css',
  'public/css/shared.css',
  'public/css/mobile.css',
  'public/css/mobile-landscape.css',
  'public/css/logo.css',
  'public/css/themes/glass.css',
  'public/css/themes/standard.css',
];
cssFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const dest = path.join('dist-php', file.replace(/^public\//, 'public/'));
  exec(`npx cleancss -o ${dest} ${file}`, { ignoreErrors: true });
  console.log(`  Minified ${file}`);
});

// Step 6 — Minify HTML
console.log('\n[6/7] Minifying HTML files...');
const htmlFiles = [
  { src: 'public/index.html', dest: 'dist-php/public/index.html' },
  { src: 'public/admin.html', dest: 'dist-php/public/admin.html' },
];
htmlFiles.forEach(({ src, dest }) => {
  if (!fs.existsSync(src)) return;
  exec(
    `npx html-minifier-terser --collapse-whitespace --remove-comments ` +
    `--minify-js true --minify-css true -o ${dest} ${src}`,
    { ignoreErrors: true }
  );
  console.log(`  Minified ${src}`);
});

// Step 7 — Copy remaining assets
console.log('\n[7/7] Copying remaining assets...');

if (fs.existsSync('public/manifest.json')) {
  copyFile('public/manifest.json', 'dist-php/public/manifest.json');
  console.log('  Copied manifest.json');
}
if (fs.existsSync('public/images')) {
  copyDir('public/images', 'dist-php/public/images');
  console.log('  Copied images/');
}
if (fs.existsSync('public/uploads/.gitkeep')) {
  copyFile('public/uploads/.gitkeep', 'dist-php/public/uploads/.gitkeep');
  console.log('  Copied uploads/.gitkeep');
}

// Write a .gitignore for the dist
fs.writeFileSync('dist-php/.gitignore', `# PHP distributable — do not commit credentials
api/config.php
uploads/*
!uploads/.gitkeep
`);
console.log('  Created dist-php/.gitignore');

// ------------------------------------------------------------------
// Database reset (optional)
// ------------------------------------------------------------------
if (RESET_DB) {
  banner('⚠  DATABASE RESET');
  console.log('This will:');
  console.log('  1. Stop and remove all PHP Docker containers');
  console.log('  2. Delete the db_data and uploads_data Docker volumes');
  console.log('  3. Rebuild the images and restart the containers');
  console.log('  4. MySQL will re-run initializedb.sql on first boot\n');

  // Give the user 5 seconds to cancel (Ctrl-C)
  console.log('Starting in 5 seconds… press Ctrl-C to abort.');
  execSync('timeout /t 5 /nobreak >nul 2>&1 || sleep 5', { stdio: 'inherit', shell: true, ignoreErrors: true });

  console.log('\n[DB-1/2] Stopping containers and removing volumes...');
  exec('docker compose -f php/docker-compose.yml down -v', { ignoreErrors: true });

  console.log('\n[DB-2/2] Rebuilding and starting containers...');
  exec('docker compose -f php/docker-compose.yml up --build -d');

  console.log('\n✓ Database reset complete.');
  console.log('  MySQL is initialising — it may take 15–30 seconds before the app responds.');
  console.log('  Visit http://localhost:8080 once the containers are healthy.');
} else {
  // Normal build: just remind the user how to start Docker
  console.log('\n' + '='.repeat(60));
  console.log('✓ PHP build complete!  Distributable files → dist-php/');
  console.log('='.repeat(60));
  console.log('\nTo run with Docker (from the project root):');
  console.log('  docker compose -f php/docker-compose.yml up --build');
  console.log('\nTo reset the database (wipe all data and re-seed):');
  console.log('  node build-php.js --reset-db');
  console.log('  — or —');
  console.log('  npm run build:php:reset');
  console.log('\nTo deploy to shared hosting:');
  console.log('  1. Upload the contents of dist-php/ to your web root');
  console.log('  2. Edit api/config.php with your MySQL credentials');
  console.log('  3. Import initializedb.sql via phpMyAdmin');
  console.log('  4. Ensure uploads/ is writable (chmod 755 or 777)');
}

console.log('');
