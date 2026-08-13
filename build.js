const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to execute commands
function exec(command, options = {}) {
  try {
    console.log(`  Running: ${command}`);
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`  Error executing: ${command}`);
    if (!options.ignoreErrors) {
      throw error;
    }
  }
}

// Helper function to copy files
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// Helper function to copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Skipping ${src} (not found)`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

console.log('Starting build process...\n');

// Step 1: Clean dist directory
console.log('[1/8] Cleaning dist directory...');
exec('npm run clean', { ignoreErrors: true });

// Step 2: Create directory structure
console.log('\n[2/8] Creating directory structure...');
const dirs = [
  'dist/public/css/themes',
  'dist/public/images',
  'dist/public/uploads',
  'dist/routes',
  'dist/data',
  'dist/migrations'
];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`  Created ${dir}`);
});

// Step 3: Copy backend files
console.log('\n[3/8] Copying backend files...');
const backendFiles = [
  'index.js',
  'db.js',
  'polyfills.js',
  'admin.js',
  'initializedb.sql',
  'package.json',
  'package-lock.json',
  'README.md'
];
backendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    copyFile(file, path.join('dist', file));
    console.log(`  Copied ${file}`);
  }
});

// Try to copy LICENSE if exists
if (fs.existsSync('LICENSE')) {
  copyFile('LICENSE', 'dist/LICENSE');
  console.log('  Copied LICENSE');
}

// Step 4: Copy directories
console.log('\n[4/8] Copying routes, data, and migrations...');
['routes', 'data', 'migrations'].forEach(dir => {
  copyDir(dir, path.join('dist', dir));
  console.log(`  Copied ${dir}/`);
});

// Step 5: Minify JavaScript files
console.log('\n[5/8] Minifying JavaScript files...');
const jsFiles = [
  { src: 'public/client.js', dest: 'dist/public/client.js' },
  { src: 'public/service-worker.js', dest: 'dist/public/service-worker.js' },
  { src: 'public/markercluster.js', dest: 'dist/public/markercluster.js' }
];

jsFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    try {
      exec(`npx terser ${src} -c -m -o ${dest}`);
      console.log(`  Minified ${src}`);
    } catch (error) {
      console.log(`  Failed to minify ${src}, copying instead`);
      copyFile(src, dest);
    }
  }
});

// Step 6: Minify CSS files
console.log('\n[6/8] Minifying CSS files...');
const cssFiles = [
  'public/css/client.css',
  'public/css/admin.css',
  'public/css/shared.css',
  'public/css/mobile.css',
  'public/css/mobile-landscape.css',
  'public/css/logo.css'
];

cssFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join('dist', file);
    exec(`npx cleancss -o ${dest} ${file}`);
    console.log(`  Minified ${file}`);
  }
});

// Minify theme CSS files
const themeFiles = [
  'public/css/themes/glass.css',
  'public/css/themes/standard.css'
];

themeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join('dist', file);
    exec(`npx cleancss -o ${dest} ${file}`, { ignoreErrors: true });
    console.log(`  Minified ${file}`);
  }
});

// Step 7: Minify HTML files
console.log('\n[7/8] Minifying HTML files...');
const htmlFiles = [
  { src: 'public/index.html', dest: 'dist/public/index.html' },
  { src: 'public/admin.html', dest: 'dist/public/admin.html' }
];

htmlFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    exec(`npx html-minifier-terser --collapse-whitespace --remove-comments --minify-js true --minify-css true -o ${dest} ${src}`);
    console.log(`  Minified ${src}`);
  }
});

// Step 8: Copy other assets
console.log('\n[8/8] Copying other assets...');

// Copy manifest.json
if (fs.existsSync('public/manifest.json')) {
  copyFile('public/manifest.json', 'dist/public/manifest.json');
  console.log('  Copied manifest.json');
}

// Copy images directory
if (fs.existsSync('public/images')) {
  copyDir('public/images', 'dist/public/images');
  console.log('  Copied images/');
}

// Copy uploads .gitkeep
if (fs.existsSync('public/uploads/.gitkeep')) {
  copyFile('public/uploads/.gitkeep', 'dist/public/uploads/.gitkeep');
  console.log('  Copied uploads/.gitkeep');
}

// Copy .env.example if exists
if (fs.existsSync('.env.example')) {
  copyFile('.env.example', 'dist/.env.example');
  console.log('  Copied .env.example');
}

// Step 9: Update .gitignore in dist
console.log('\nUpdating dist/.gitignore...');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/.gitignore', `# Environment variables
.env
.env.production
.env.local

# Uploads
uploads/*
!uploads/.gitkeep

# Dependencies (run npm install in dist)
node_modules/
`);
console.log('  Created dist/.gitignore');

console.log('\n' + '='.repeat(60));
console.log('✓ Build complete! Distributable files are in the "dist" directory.');
console.log('='.repeat(60));
console.log('\nTo deploy:');
console.log('1. Copy the "dist" directory to your server');
console.log('2. Run "npm install --production" in the dist directory');
console.log('3. Configure your .env file with database credentials');
console.log('4. Run "npm start" to start the server');
console.log('\nDist directory size:');
exec('dir /s dist 2>nul || du -sh dist 2>/dev/null || echo "  Size calculation not available"', { ignoreErrors: true });
