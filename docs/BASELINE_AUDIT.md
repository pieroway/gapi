# Phase 0.1 baseline audit

Date: 2026-09-21. Inspected revision: `33b7fcf` on
`feature/react-pwa-modernization`. Initial working tree was clean.

This document records source inspection, not verified browser or staging behavior.
No application changes, database resets, deployments or migrations were performed.
README.md remains authoritative.

## Existing behavior inventory

| Surface | Source-observed behavior | Capture in baseline tests |
| --- | --- | --- |
| Startup | index.html/client.js load Maps configuration, events and lookups | Success, missing key, API failure, empty data |
| Map/list | Advanced markers, optional clustering, linked cards/details, location tracking, mobile panels and desktop resizing | Marker/card selection, denied location, gestures, panel transitions |
| Filters | Client-side title/description search, sale type, category, favourites; localStorage persistence | Combined filters, clear/no-results, reload and map/list consistency |
| Favourites | Public IDs in localStorage; card/detail toggles | Toggle, filter and persistence |
| Details | Photos/slider, comments, external Maps link, sharing and calendar export | Loading/failure, image fallback, comments and sharing |
| Add sale | Lookup-driven form, autocomplete, multipart eventData/photos, saved form draft | Required input, coordinates, upload, refresh and draft restore |
| Settings | Glass/standard themes, map type, clustering, zoom/pan and debug preferences | Persistence, responsive and keyboard behavior |
| Moderation | Report form; admin token UI, report filters/pagination, dismissal, editing/deletion | Server authorization and complete admin journeys |
| PWA | Manifest, service worker, update messaging and caching | Updates, stale data and offline failures |

Sources: public/client.js, public/index.html, public/admin.html,
public/service-worker.js and public/manifest.json. Dedicated date/distance/open-now/
rating filters, notification delivery and Light/Dark/System modes were not found
in the inspected client. API support does not establish a complete public edit or
rating UI journey. Preserve the admin surface deliberately during migration.

## PHP API inventory and contracts

Apache rewrites clean URLs to php/api handlers. Responses generally use JSON;
errors contain message. Unhandled errors add request_id and optional debug detail.

| Method and path | Current behavior |
| --- | --- |
| GET /api/config | Public googleMapsApiKey configuration |
| GET /api/sale_types, /api/item_categories | Lookup collections |
| GET /api/events | All non-deleted events, descending start time; no server-side search, geography or pagination |
| GET /api/events/:id | Public ID lookup with photos/categories/comments; 404 if missing/deleted |
| POST /api/events | Multipart eventData JSON plus optional photos; 201 including public_id and secret edit_guid |
| GET /api/events/edit/:guid | Full event row plus photo paths/category IDs, including deleted events |
| PUT /api/events/edit/:guid | Full required fields, categories and existingPhotos; missing/deleted gives 404 |
| DELETE /api/events/edit/:guid | Soft delete; 204, or 404 if unchanged |
| POST /api/events/edit/:guid/undelete | Restore; 200, or 404 if unchanged |
| POST /api/events/edit/:guid/photos | Multipart photo; 201 with filePath |
| POST /api/events/:id/flag-ended | Increment flags; soft-delete at three |
| POST /api/events/:id/ratings | Numeric rating cast to integer; accepted when cast value is 1-5; 201 |
| POST /api/events/:id/comments | Nonblank comment_text and optional caller-supplied user_id; 201 |
| GET /api/reports | Reports with nested event ID/title/description/address |
| POST /api/reports | public_id or event_id, required reason, optional details; 201 |
| DELETE /api/reports/:id | 204 even if missing |

Public event shapes include public_id, title/description/address, numeric
coordinates, dates, sale_type_details, item_category_details, photo-path arrays
and average_rating (zero without ratings). Details add newest-first comments.
Create returns supplied dates while reads return database dates: characterize
normalization and timezone behavior before changing serialization.

Create requires title, description, address, non-null coordinates, start/end,
sale type and a nonempty category array. Comprehensive type, length, coordinate
range and date-order validation is absent. Update has weaker category type checks.
Database constraints enforce some invalid selections; error translation needs tests.

Write limits: 20/15 minutes/IP; uploads: 10/hour/IP; reports: 5/hour/IP.
Photos require JPEG/PNG/GIF MIME and extension, maximum 10 MiB. Multi-photo
create/update skips rejected files; singular photo upload returns 400.
Edit GUID possession grants editing rights. Anonymous local user IDs are not
authentication. Ratings and ended flags are not user-deduplicated.

## Priority findings and reusable legacy behavior

These are source findings; runtime reproduction is pending. Record unsafe behavior
as defects, not compatibility requirements.

1. **Admin authorization gap:** legacy index.js protects report reads/deletes
   with a configured bearer token. PHP reports.php has no equivalent check.
   The admin page sending a token does not enforce server authorization.
2. **Admin contract mismatch:** admin.html calls DELETE /api/admin/events/:id,
   absent from PHP routing, and expects event.edit_guid, absent from PHP reports.
   Any edit credential exposure must remain restricted to authorized admins.
3. **Validation gaps:** Node validates GUID format, event/comment lengths,
   report reason allowlist and details length. PHP lacks equivalent validation
   and Node's general API limiter. Reuse useful rules in PHP with focused tests.
4. **Rate-limit isolation:** cleanup deletes records for all actions using the
   current window. A 15-minute write check can erase still-needed hour-long
   report/upload records. Count/insert is also non-atomic.
5. **Photo consistency:** saving uses document-root uploads; update deletion uses
   ../../public relative to the API directory, incompatible with flat packaging.
   File operations do not roll back with database transactions; millisecond
   filenames can collide. Test invalid files, partial failure and cleanup.
6. **Multipart PUT:** the PHP update branch reads POST/FILES without a multipart
   parser. Verify transport on the actual runtime; JSON update and the separate
   photo endpoint provide a clearer initial contract to test.
7. **Schema divergence:** PHP reports use event_public_id; migration 003/current
   Node use internal event_id. Migration 001 repeats a column in the PHP seed;
   migration 002 constrains fields still TEXT in that seed. No migration runner
   or ledger was found. Do not apply these blindly to PHP databases. PHP comments
   saying Node reports are in-memory are stale: current Node uses MySQL.
8. **Rendering/cache review:** client HTML templates interpolate API content;
   add hostile-text tests. The service worker caches all API GETs, including
   edit/report and error responses, without selective invalidation. Static
   caching is also broad. Define intended behavior before preserving it.
9. **PWA metadata:** no manifest icons; start_url is /client.html while the
   tracked page is index.html. SPA fallback may hide this missing path;
   installability and offline launch are unverified.

## Deployment baseline

- deploy-staging.yml runs on staging pushes/manual dispatch, uses the staging
  environment/concurrency control, assembles public files at root plus api and
  php/.htaccess, then uploads by SFTP. Preserve verified-host SSH settings,
  secrets and remote-owned uploads. Assembly excludes uploads; upload uses puts
  without remote deletion. Existing checks verify only basic artifact presence.
- No automated behavioral gate or post-deployment smoke exists in the workflow.
  BRANCHING.md describes staging-to-main promotion; only a staging workflow was
  found. Live host configuration and production automation were not verified.
- Configuration reads environment/INI and document-root .user.ini. Package no
  live credentials. The Maps key is browser-visible, not a server secret.
- Docker uses public/.htaccess, staging php/.htaccess; /api/config termination
  differs (END versus L). A third php/htaccess lacks that route. Establish one
  canonical packaged routing configuration and exercise it in tests.
- npm build targets legacy Node. PHP npm scripts reference missing build-php.js.
  php/build.sh exists but its layout includes development material and differs
  from staging. BUILD.md still describes obsolete production paths.
- php/initializedb.sql drops/recreates gapi; use only in a disposable database,
  never as a migration for an existing host.

## Docker Desktop's role in development

Docker Desktop is the local runtime for Apache/PHP/MySQL, not a production
hosting requirement. The current Compose specifies PHP 8.2/Apache and MySQL 8.0.
Production on A Small Orange continues to receive PHP and compiled static assets.

Use three clearly separated workflows:

1. **Daily development:** persistent local database/uploads, PHP source mounted
   for editing, and later React/Vite with an API proxy to local PHP. Node/Vite may
   run on the host; Docker is not required to serve React in production.
2. **Automated tests:** independent Compose project, disposable database/uploads,
   deterministic fixtures and isolated names/ports. Run PHP/API/integration and
   browser tests against the active stack. Never reuse development data volumes.
3. **Release verification:** serve the assembled static/PHP artifact through
   Apache with test configuration, validating rewrite routes, assets and API
   integration. Run explicitly bounded load tests against this isolated target.

Portable repository scripts should run the same containerized stack in CI using
Docker Engine; CI does not require the Docker Desktop application.

Current blocker: php/docker-entrypoint.sh overwrites api/config.php, which is
bind-mounted from tracked source in the existing Compose. It replaces current
configuration/diagnostics with generated code. Fixed container names and ports
also inhibit isolation. Build the test harness without source rewriting or
shared development volumes before trusting a runtime baseline.

## Verification performed and remaining evidence

- No tracked automated tests/specs, Playwright/PHPUnit setup, load harness or
  quality-gate command found. api.http provides manual request examples.
- Executed npm test: exit 1, Error: no test specified (placeholder script).
- Node v20.9.0 available; Docker daemon reports 29.7.2; PHP CLI not on PATH.
- No containers started, browser/API/staging checks or load run performed.
  Response-time, throughput and resource baselines remain unmeasured.

## Next bounded implementation task

Create the isolated PHP baseline harness (Phase 0.2 plus prerequisite 0.3 scripts):

1. Independent Compose resources, loopback access, deterministic fixtures, flat
   deployment layout and unchanged PHP source configuration.
2. Windows-friendly setup/test-api/test-integration wrappers over portable scripts;
   reject production targets and teardown only test resources.
3. Contract coverage for lookups, list/detail, create/update/delete/restore,
   invalid/missing inputs, uploads, comments, ratings, reports and rate windows.
   Track known defects separately from intended compatibility assertions.
4. Primary iPhone 12 Pro/WebKit baseline journeys for startup, filters, favourites,
   details and creation, with secondary browser smoke. Use deterministic Maps
   test doubles for CI and a separate real-Maps smoke check.
5. Record a safe performance run: fixture size, warmup/duration/concurrency,
   p50/p95/p99, throughput, payload sizes, errors versus intentional 429s, and
   database/PHP resource observations. Derive thresholds from measurements.

Acceptance: reproducible short commands, nonzero failures, isolated teardown,
contract/browser results and a recorded performance report. Admin authorization,
schema reconciliation and photo consistency require focused fixes/tests before
Phase 0 deployment proof. Staging and physical-device verification remain separate.
No substantial React migration until the foundation is proven.
