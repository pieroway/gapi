# PHP API and integration baseline

Run `scripts\test-api.bat` or `scripts\test-integration.bat` on Windows.
Portable equivalents: `npm run test-api` and `npm run test-integration`.
Prerequisites: Node 20+ and Docker Desktop/Engine with Linux containers running.
The first run downloads MySQL and builds the PHP image; no separate setup is needed.

Each command starts a unique `gapi-test-<pid>-<timestamp>` Compose project. It
uses the active PHP/Apache image, MySQL 8.0, a private database network, a random
loopback HTTP port and tmpfs database/uploads. PHP also joins an HTTP network
so Docker Desktop can publish its loopback port; MySQL remains on the private
network only and has no host port. There
are no bind mounts, external volumes or production-target arguments. Developer
Compose settings and database credentials are not used. The included credentials
are disposable local test values only.

The runner extracts table definitions from the active PHP seed SQL, excluding
DROP/CREATE DATABASE and demonstration records, then imports fixtures.sql.
Schema-boundary changes fail explicitly instead of guessing. Fixtures have fixed
IDs, coordinates and dates, two sale types, three categories, an active listing
and a soft-deleted listing. No Google Maps service or external photo is needed.

API tests exercise real HTTP and MySQL through PHP: lookup shapes/methods,
public visibility and credential omission, create/read/update/delete/restore,
malformed/missing input and unknown edit credentials. Integration tests additionally
query the isolated MySQL database to verify persistence, category replacement,
soft deletion/restoration and transaction rollback. Duplicate category errors
currently produce 500; the tests characterize rollback, not endorsement of that
status as the desired validation contract.

Commands return nonzero on startup, seed, test or cleanup failure. Failure output
includes the last container logs. A finally block removes only that run's project
containers/network, with no development volume deletion. Abrupt process termination
or Docker failure can prevent cleanup; use the exact project name printed by the
runner to inspect leftovers before removing them. No global Docker prune is used.

Scope remaining: uploads, comments, ratings, broader reporting behavior, broader
validation/rate limits, browser/device tests, full release load/performance, CI execution and
the full release quality gate. This baseline is not a complete application gate.

Report authorization coverage uses two PHP services against the isolated DB: one
with a test-only admin token and one without configuration. Tests cover public
submission, authorized listing/dismissal, missing/wrong/malformed credentials,
query-string credential rejection, no-store headers, missing-configuration denial
and persistence after denied deletion. npm test also checks service-worker report
cache bypass, offline failure and removal of the previous cache version.

## Load baseline

Run `scripts\test-load.bat` or `npm run test-load`. No arguments or external
targets are accepted. The runner creates the same isolated stack, discards inherited
GAPI_TEST/COMPOSE overrides, discovers its loopback port and rejects redirects.
It seeds 500 active listings, one deleted listing, 500 comments and 500 ratings;
photos are absent. All records are synthetic.

Five scenarios cover collection, detail, lookup, unauthorized report access and
missing detail. Each gets five warmup requests, then 100 measured requests at
concurrency 1, 4 and 8 (1,500 measured requests total). Full response reads and JSON
validation are timed. This is a bounded closed-loop sample, not a sustained
arrival-rate or saturation test. Search/geographic filtering is currently done
in the browser and has no separate PHP endpoint.

JSON reports in ignored `test-results/<project>/load-baseline.json` include runtime
versions, p50/p95/p99/max latency, throughput, status counts, unexpected-response
rate, payload bytes and p95 ratios against serial traffic. Expected 401/404 responses
count as successful checks. Reports omit response bodies and credentials.
Docker resource snapshots after each scenario and final MySQL counters provide
coarse diagnostics, not peak resource measurements or per-request query counts.

The initial local smoke thresholds are zero unexpected responses and p95 at most
2,000 ms in every scenario/concurrency combination. They are provisional guardrails,
not a production SLO. Timeouts are 10 seconds. Failed thresholds return nonzero
and retain the metrics report; startup/warmup failures return nonzero with stack
logs. Cleanup runs on success and failure.

Write/upload throughput, sustained saturation, browser filtering/rendering,
production-like disk data, query profiling and hosting capacity remain outside
this initial baseline. The full release performance gate is still pending.

## Browser baseline

Install dependencies with `npm ci`, then run `scripts\setup-browsers.bat`
(`npm run setup-browsers`). Linux CI also needs Playwright OS dependencies; see
the [official browser setup](https://playwright.dev/docs/browsers).

Run `scripts\test-e2e.bat` for all projects, `scripts\test-iphone.bat` for
the primary suite, or `scripts\test-devices.bat` for secondary smoke. Portable
equivalents are the matching npm scripts. No target arguments are accepted.
Each invocation creates and tears down its own PHP/MySQL stack with two active
listings and one deleted listing. One worker avoids fixture races. Tests that
create records soft-delete them in a finally block; the whole DB is disposable.

The primary project uses iPhone 12 Pro/WebKit (390 x 844, touch). Android Chromium
and landscape tablet Chromium run selected smoke journeys. Non-touch desktop
Chromium and Firefox verify the existing QR handoff screen: the current app hides
its UI on these devices. This is not proof of desktop application compatibility.

Coverage: startup, list/detail and marker callback linkage, combined filters,
map/list consistency, reload persistence, favourites, empty/error states,
required-field validation, real PHP creation and reload, settings persistence,
denied-location browsing and hostile-text/photo/lookup rendering. The Maps double
implements only the external API contract used here; callbacks and autocomplete
selection are injected at that boundary. App DOM, event handlers and PHP/MySQL
remain real. Error-state and hostile-photo tests explicitly override responses.
External browser requests are blocked, except that the Maps script is fulfilled
locally with the test double. No Google key, geocoding, tiles or QR service is used.

Service workers are blocked for deterministic API/error tests. PWA caching and
updates need a separate browser suite; Node tests cover the protected-report
cache bypass and old-cache removal. Unexpected page exceptions fail each test.
Retries are disabled. Failure traces, screenshots, video and an HTML report are
kept under ignored `test-results/<project>/`. Artifacts use synthetic test data;
this harness must not be redirected to live accounts or production.

Remaining: real Maps/Places/clustering/gestures, missing Maps configuration,
physical iPhone/PWA installation and updates, uploads, comments/report UI,
full accessibility/visual coverage, CI and staging. These tests establish an
initial migration baseline, not the full release quality gate.

Owner operations use bearer headers on fixed paths; see
[OWNER_API.md](../docs/OWNER_API.md). Integration coverage verifies denied access,
retired-route rejection and absence of a fresh owner credential in local Apache
logs. Browser creation coverage verifies a header-authenticated owner read without
putting the credential in outgoing URLs.
