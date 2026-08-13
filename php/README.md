# Garage Sale Finder — PHP/MySQL Version

This folder contains a complete PHP conversion of the Node.js/Express backend.
The frontend (HTML/CSS/JS) is **unchanged** — only the server-side code is different.

---

## File Structure

```
php/
├── .htaccess              ← Apache URL routing (replaces Express router)
├── initializedb.sql       ← Database schema + seed data (run this once)
├── README.md              ← This file
└── api/
    ├── config.php         ← DB credentials + shared helpers (replaces .env + db.js)
    ├── events.php         ← All /api/events/* routes
    ├── sale_types.php     ← GET /api/sale_types
    ├── item_categories.php← GET /api/item_categories
    └── reports.php        ← All /api/reports/* routes
```

---

## Deployment Steps

### 1. Upload Files

Upload the **contents** of this `php/` folder to your hosting web root (usually `public_html/`).
Also upload the existing `public/` folder contents (HTML, CSS, JS, images, uploads).

Your final web root should look like:
```
public_html/
├── .htaccess
├── index.html
├── admin.html
├── client.js
├── manifest.json
├── service-worker.js
├── markercluster.js
├── css/
├── images/
├── uploads/          ← must be writable (chmod 755 or 777)
└── api/
    ├── config.php
    ├── events.php
    ├── sale_types.php
    ├── item_categories.php
    └── reports.php
```

### 2. Create the Database

1. Log in to your hosting control panel (cPanel, Plesk, etc.)
2. Open **phpMyAdmin**
3. Create a new database (e.g. `gapi`)
4. Select the database, click the **SQL** tab
5. Paste the contents of `initializedb.sql` and click **Go**

> **Note:** If your host pre-creates the database for you, remove the
> `DROP DATABASE` / `CREATE DATABASE` / `USE` lines at the top of the SQL file
> and just run the `CREATE TABLE` and `INSERT` statements.

### 3. Configure Database Credentials

Edit `api/config.php` and fill in your host's MySQL credentials:

```php
define('DB_HOST', 'localhost');       // Usually 'localhost' on shared hosting
define('DB_PORT', '3306');
define('DB_USER', 'your_db_user');    // From your hosting control panel
define('DB_PASSWORD', 'your_pass');   // From your hosting control panel
define('DB_NAME', 'gapi');            // The database name you created
```

### 4. Set Uploads Folder Permissions

The `uploads/` folder must be writable by the web server:

```bash
chmod 755 public_html/uploads
# or if 755 doesn't work:
chmod 777 public_html/uploads
```

### 5. Verify mod_rewrite is Enabled

The `.htaccess` file requires Apache's `mod_rewrite` module. This is enabled by
default on virtually all shared hosting providers. If you get 404 errors on API
calls, contact your host to confirm `mod_rewrite` is enabled and `AllowOverride All`
is set for your directory.

---

## What Changed vs. Node.js Version

| Feature | Node.js | PHP |
|---|---|---|
| Server | Node.js + Express | PHP 7.4+ (Apache) |
| DB connection | `mysql2` npm package | PDO (built into PHP) |
| Routing | Express Router | `.htaccess` + manual URL parsing |
| UUID generation | `uuid` npm package | `random_bytes()` (built into PHP) |
| File uploads | `multer` npm package | PHP `$_FILES` + `move_uploaded_file()` |
| Rate limiting | `express-rate-limit` | Database-backed (`gapi_rate_limits` table) |
| Reports storage | **In-memory (lost on restart!)** | **Database-backed (persistent ✓)** |
| Environment config | `.env` file | `api/config.php` |

---

## Docker Testing (Local Development)

You can spin up the PHP version locally using Docker — no need to install PHP or MySQL on your machine.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Start the containers

Run this from the **project root** (`c:\gitlab\gapi`), not from inside `php/`:

```bash
docker compose -f php/docker-compose.yml up --build
```

This will:
1. Build the PHP/Apache image with your code baked in
2. Start a MySQL 8.0 container and auto-run `initializedb.sql` to create all tables and seed data
3. Wait for MySQL to be healthy before starting Apache
4. Serve the app at **http://localhost:8080**

### First run note

On the very first `up`, MySQL needs ~15–30 seconds to initialize the database. The `app` container will wait automatically (via `depends_on: condition: service_healthy`). You'll see the app become available once you see:

```
gapi-php  | AH00558: apache2: Could not reliably determine the server's fully qualified domain name
gapi-php  | AH00557: apache2: apr_sockaddr_info_get() failed
```

That's normal — Apache is running fine.

### Stop the containers

```bash
docker compose -f php/docker-compose.yml down
```

### Reset the database (wipe all data and re-seed)

```bash
docker compose -f php/docker-compose.yml down -v
docker compose -f php/docker-compose.yml up --build
```

The `-v` flag removes the named volumes, which forces MySQL to re-run `initializedb.sql` on next startup.

### Live editing during development

The `api/` folder is mounted as a volume in `docker-compose.yml`, so any changes you make to PHP files in `php/api/` are reflected immediately — no rebuild needed.

To also live-edit frontend files, add this to the `app` volumes in `docker-compose.yml`:
```yaml
- ../public:/var/www/html
```

### Connect to MySQL directly (optional)

MySQL is exposed on port **3307** (to avoid conflicts with any local MySQL on 3306):

```
Host:     localhost
Port:     3307
User:     gapi_user
Password: gapi_password
Database: gapi
```

---

## PHP Version Requirement

PHP **7.4 or higher** is required (uses typed return types and `??` null coalescing).
PHP 8.x is fully supported and recommended.

---

## Security Notes

- `api/config.php` is blocked from direct browser access via `.htaccess`
- All database queries use **PDO prepared statements** (SQL injection safe)
- File uploads validate both MIME type and file extension
- Rate limiting is applied to all write operations, uploads, and report submissions
- Directory listing is disabled via `Options -Indexes` in `.htaccess`
