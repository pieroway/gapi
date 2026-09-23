# Development, packaging and deployment

Production is Apache/PHP/MySQL plus static frontend assets. Node is a developer
and CI tool only. The legacy Node backend remains reference material.

## Commands

Install Node 20 or newer and Docker Desktop with Linux containers. Start Docker
Desktop before setup/dev. The packaging/API/load scripts use Node built-ins. Browser tests additionally
require `npm ci` and `scripts\setup-browsers.bat`. Existing application dependencies
remain for legacy reference until the React foundation is introduced.

Run from the repository root, or invoke a .bat wrapper from any directory:

| Windows command | Portable equivalent | Purpose |
| --- | --- | --- |
| scripts\setup.bat | npm run setup | Check Docker, validate Compose, build PHP image |
| scripts\dev.bat | npm run dev | Start local Apache/PHP/MySQL and wait for readiness |
| scripts\stop.bat | npm run stop | Stop development services, retain data |
| scripts\test.bat | npm test | Tooling and service-worker security regression tests |
| scripts\test-api.bat | npm run test-api | Isolated HTTP lookup/listing CRUD baseline |
| scripts\setup-browsers.bat | npm run setup-browsers | Install pinned Playwright browser binaries |
| scripts\test-e2e.bat | npm run test-e2e | Full initial browser baseline and secondary smoke |
| scripts\test-iphone.bat | npm run test-iphone | Primary iPhone 12 Pro WebKit baseline |
| scripts\test-devices.bat | npm run test-devices | Android/tablet and desktop handoff smoke |
| scripts\test-load.bat | npm run test-load | Isolated 500-listing performance baseline |
| scripts\test-integration.bat | npm run test-integration | HTTP/MySQL persistence and rollback baseline |
| scripts\test-docker.bat | npm run test-docker | Packaged Apache/PHP smoke check after setup/package |
| scripts\build.bat | npm run build | Assemble and verify current PHP/static application |
| scripts\package.bat | npm run package | Same build, producing deploy/ and deploy-manifest.json |
| scripts\verify-deploy.bat | npm run verify-deploy | Verify exact file set and content against source |
| scripts\help.bat | npm run help | List available commands |

Direct portable invocation: node scripts/gapi.mjs <command>. Commands fail with a
nonzero exit code on errors. Build/package does not start Docker or reset data.
The current frontend is copied unchanged; Vite compilation will be added when
React exists. There are no placeholder passing application test commands.

## Docker Desktop

The development project is gapi-dev, with project-scoped containers and persistent
DB/uploads volumes. This is a new project name: previous php-project volumes are
not imported or deleted. Existing data should be migrated separately if needed.

Visit http://localhost:8080. Bindings are loopback-only; use GAPI_HTTP_PORT and
GAPI_DB_PORT to override defaults 8080 and 3308 if another stack uses them.
GOOGLE_MAPS_API_KEY may be set in your shell or php/.env (Compose's project env
file). Do not commit it. Frontend entries and the API are mounted separately and read-only to avoid
Docker Desktop nested-mount failures; uploads use a writable
volume. PHP reads DB_* from the environment without rewriting source files.
The image uses the official PHP entrypoint. Do not run the destructive seed SQL
against any existing host database. No reset command is provided in this change.

API and integration tests use their own disposable Compose projects and fixtures;
they never reuse gapi-dev volumes. See [tests/README.md](tests/README.md).
Production-like artifact smoke checks also use isolated resources.

## Deployment artifact

Only deploy/ is uploaded. deploy-manifest.json is a local/CI review artifact with
SHA-256 hashes; it is not uploaded. public/.htaccess is the canonical routing file
for Docker and packaging. Explicit public entry points, CSS/images and PHP API
files are included. Uploads, .user.ini, .env, SQL, Docker files, Node modules and
legacy backend files are excluded. Verification rejects extra, missing or changed
files. Never put credentials directly in tracked source.

The staging workflow retains its trigger, secrets, verified SSH host, SFTP upload
and protection of remote uploads. It invokes tooling tests, package and verify
commands rather than duplicating assembly in YAML. No remote files are deleted.

Tooling checks and the initial API/integration baseline are NOT the mandatory
full application quality gate. Broader API, WebKit/device/accessibility and full release load coverage remain outstanding in
Phase 0; this change does not establish deployment readiness or verify staging.
The full gate will be wired before substantial React migration. Do not deploy
when any required gate fails.

Obsolete build.js, php/build.sh and source-rewriting docker-entrypoint.sh have
been retired. merge-to-master.bat is replaced by the PR process in BRANCHING.md.

After setup and package, run `npm run test-docker` for an isolated
Apache/PHP artifact smoke check (no database). It removes its temporary container
on completion and does not touch development volumes. This is not an API suite.

## Admin report authorization

Set ADMIN_TOKEN to a unique, high-entropy secret in php/.env for Docker development,
or in the hosting environment/document-root .user.ini. Use HTTPS on staging and
production. Enter that token into the existing admin login form; the browser sends
an Authorization: Bearer header. Do not put the token in URLs, source or artifacts.
Missing server configuration returns 503; missing/incorrect bearer credentials
return 401. Report listing and dismissal require authorization; submission remains
public and rate-limited. Rotate the token in server configuration when necessary
and restart/recreate the Docker app for environment changes to take effect.

Report responses use private/no-store headers, and service-worker version 6 bypasses
the report cache and removes old caches on activation. Existing installed clients
must accept the service-worker update/reload before relying on the cache fix;
validate that update on staging before release. Admin event editing/deletion API
compatibility remains a separate task. This change does not claim a full security
audit or production readiness.
