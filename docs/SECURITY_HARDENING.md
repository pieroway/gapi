# Local Security Hardening - 2026-09-22

This pass hardens the active PHP application while staging waits for a trusted
HTTPS certificate. It is not a complete penetration test or deployment approval.

## Changes

- Removed unused legacy Node runtime dependencies. The retained Node backend is
  reference code; active npm tooling uses Node built-ins and Playwright.
- Added bounded server-side text, coordinate, date, lookup ID, UUID, JSON body,
  rating, comment and report validation. Text limits are UTF-8 byte limits.
  Listing updates accept JSON; photos use the dedicated multipart upload endpoint.
- Serialized rate-limit accounting per IP/action with MySQL advisory locks.
  Cleanup respects each action's window and forwarded headers cannot choose an IP.
- Validated uploaded image content, dimensions, size and extension; generated
  random filenames; limited listings to ten photos; enforced photo ownership.
  Database failures roll back rows and clean up files saved by that request.
- Marked API responses private/no-store and suppressed raw exception messages.
  The service worker now caches only its two explicit public assets. API results,
  admin pages, authorization headers and query strings bypass Cache Storage.
  Activation deletes old app caches. Offline listing data is deferred until an
  intentional public-data cache is designed.
- Escaped stored values in the admin dashboard and repaired its login callback.
- Denied hidden configuration files and executable upload paths in Apache;
  missing uploads return 404. Enabled response security headers in local Apache.

## Verification

Run `npm test`, `npm run test-api`, `npm run test-integration`,
`npm run test-e2e`, `npm audit`, `npm run package` and
`npm run verify-deploy`. API/integration/browser tests use disposable local
PHP/MySQL stacks and synthetic credentials, preserving development data.

Security regressions cover malformed requests, missing/incorrect admin credentials,
photo ownership, invalid uploads, transaction rollback, orphan cleanup, concurrent
rate-limit requests, differing rate windows, protected browser caching and stored
admin XSS. Browser report data is mocked to exercise hostile historical values;
server authorization is checked separately against PHP.

## Remaining release checks and boundaries

- Staging TLS and staging baseline checks remain blocked. Do not bypass certificate
  validation. Re-run the staging preflight after certificate installation.
- Owner API credentials now use bearer headers on fixed URLs; old URL routes
  return 410. See [OWNER_API.md](OWNER_API.md) for the breaking contract change.
  Historical log exposure, credential rotation/recovery and host header/body log
  settings still need review before release.
- Verify shared-host Apache header/rewrite rules and upload execution protection,
  PHP upload limits and MySQL advisory-lock support on staging.
- Existing admin event edit/delete calls lack a matching authorized admin API;
  this pass does not expose edit capabilities to make those controls work.
- Admin token storage retains its existing browser storage design. The active
  public app does not yet provide an owner edit-link UI. A session/authentication redesign, read-request abuse controls,
  flag/vote abuse resistance and broader image decoder testing remain future work.
- The npm audit covers installed JavaScript packages, not PHP/Apache/MySQL image
  vulnerabilities or the shared-host platform. Load and live Google Maps tests
  are not part of this security verification.

Verified locally on 2026-09-22: 12 tooling tests, 6 API tests, 11 integration
tests and 17 browser tests passed. `npm audit` reported zero vulnerabilities;
packaging and deployment-artifact verification passed for 26 files. No remote
deployment was performed. Evidence is in `test-results/security-*.log` (ignored).
