# Build Process Documentation

## Overview

This project now has a complete build process that creates an optimized distributable package with minified frontend assets and organized backend files.

## Quick Start

To build the distributable files:

```bash
npm run build
```

The distributable files will be created in the `dist/` directory.

## What Gets Built

### Frontend Assets (Optimized)
- **JavaScript Files**: Minified using Terser
  - `public/client.js` → `dist/public/client.js` (56 KB minified)
  - `public/service-worker.js` → `dist/public/service-worker.js` (985 bytes)
  - `public/markercluster.js` → `dist/public/markercluster.js` (48 KB)

- **CSS Files**: Minified using clean-css
  - All CSS files in `public/css/`
  - Theme files in `public/css/themes/`

- **HTML Files**: Minified using html-minifier-terser
  - `public/index.html`
  - `public/admin.html`

### Backend Files (Copied)
- Server files: `index.js`, `db.js`, `polyfills.js`, `admin.js`
- Configuration: `package.json`, `package-lock.json`
- Database: `initializedb.sql`
- Routes: `routes/*.js`
- Data: `data/*.js`
- Migrations: `migrations/*.sql`
- Documentation: `README.md`, `LICENSE`

### Assets (Copied)
- Images from `public/images/`
- PWA manifest: `public/manifest.json`
- Upload directory structure

## Build Scripts

### `npm run build`
Runs the complete build process using `build.js` (Node.js script, works on Windows/Mac/Linux)
- Creates production-ready distributable without `.env` file (recommended for deployment)

### `npm run build:local`
Builds and copies your local `.env` file to `dist/` for local testing
- ⚠️ **For local testing only** - Do not deploy this build with your credentials!

### `npm run clean`
Removes the `dist/` directory

### `build.sh` (Optional)
Bash script version for Unix-like systems (Linux/Mac)

## Distribution Directory Structure

```
dist/
├── .gitignore              # Git ignore for dist
├── index.js                # Main server file
├── db.js                   # Database connection
├── package.json            # Dependencies (for production install)
├── package-lock.json       # Lock file
├── README.md              # Documentation
├── LICENSE                # License file
├── initializedb.sql       # Database initialization
├── routes/                # API route handlers
├── data/                  # Data files
├── migrations/            # Database migrations
└── public/                # Optimized frontend assets
    ├── index.html         # Minified main page
    ├── admin.html         # Minified admin page
    ├── client.js          # Minified client code (56 KB)
    ├── service-worker.js  # Minified service worker
    ├── markercluster.js   # Minified marker clustering
    ├── manifest.json      # PWA manifest
    ├── css/               # Minified stylesheets
    │   └── themes/        # Minified theme files
    ├── images/            # Images (logo, etc.)
    └── uploads/           # Upload directory structure
```

## Deployment

1. **Copy the dist directory to your server**
   ```bash
   # Using scp
   scp -r dist/ user@server:/path/to/deployment/
   
   # Or using rsync
   rsync -avz dist/ user@server:/path/to/deployment/
   ```

2. **Install production dependencies**
   ```bash
   cd /path/to/deployment/
   npm install --production
   ```

3. **Configure environment variables**
   - Create a `.env` file in the dist directory
   - Add your database credentials and configuration:
     ```
     DB_HOST=localhost
     DB_USER=your_user
     DB_PASSWORD=your_password
     DB_NAME=garage_sale_db
     PORT=61571
     ```

4. **Initialize database** (first time only)
   ```bash
   # Import the database schema
   mysql -u your_user -p garage_sale_db < initializedb.sql
   ```

5. **Start the application**
   ```bash
   npm start
   ```

   For production, consider using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start index.js --name garage-sale-api
   pm2 save
   pm2 startup
   ```

## Size Optimization Results

The build process significantly reduces file sizes:
- **Client.js**: ~2,654 lines → 56 KB minified
- **Total dist size**: ~1 MB (including all files)
- **CSS files**: Minified and optimized
- **HTML files**: Whitespace removed, inline JS/CSS minified

## Development vs Production

- **Development**: Use `npm run dev` to run with nodemon (auto-restart on changes)
- **Production**: Build with `npm run build`, deploy the `dist/` directory

## Build Dependencies

The following dev dependencies are used for building:
- `terser`: JavaScript minification
- `clean-css-cli`: CSS minification
- `html-minifier-terser`: HTML minification
- `rimraf`: Cross-platform directory removal
- `copyfiles`: File copying utility

These are only needed for building and are not required in production.

## Troubleshooting

### Build fails on Windows
The `build.js` script uses Node.js and should work on Windows. If you're using Git Bash and `build.sh` fails, use `npm run build` instead.

### Missing files in dist
Check the console output during build to see which files were skipped. The build script gracefully handles missing optional files.

### Size concerns
The `dist/` directory is excluded from git (via `.gitignore`). Each build creates a fresh copy.

## Continuous Integration

You can integrate this build process into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build

- name: Deploy
  run: |
    # Your deployment commands here
```
