# Initial browser baseline

## Scope and commands

Run `npm ci`, then `scripts\setup-browsers.bat` once. Run
`scripts\test-e2e.bat` for the baseline, `scripts\test-iphone.bat` for primary
coverage, or `scripts\test-devices.bat` for secondary smoke.

The suite uses Playwright 1.63.0 with a fresh isolated Apache/PHP/MySQL stack.
Maps is a deterministic contract double; all external browser traffic is blocked.
Details, filters, creation and persistence use the active PHP API and database.
Explicit response overrides exercise error and hostile-photo/lookup paths.
See [methodology and limitations](../tests/README.md#browser-baseline).

## Behavior captured

- iPhone 12 Pro WebKit at 390 x 844: startup, card/detail and marker callbacks,
  keyboard dismissal, combined filters, map/list agreement, reload persistence,
  favourites, empty and failure states, required creation fields and persisted
  creation, settings, denied geolocation, hostile text and photo/lookup labels.
- Android and landscape tablet Chromium: startup/detail, combined filters and
  hostile photo/lookup smoke tests.
- Non-touch desktop Chromium and Firefox: current mobile QR handoff. The app
  deliberately hides its UI on these devices. The test explicitly supplies zero
  touch points because Windows Chromium can expose the host touchscreen despite
  Playwright hasTouch:false. This is not full desktop application coverage.

## Defects fixed while capturing behavior

Listing title, description, address and lookup labels were inserted directly
into HTML. They now render as text; debug detail JSON is escaped too. Photo URLs
are serialized through the DOM and limited to HTTP(S), preventing attribute
injection and script schemes. Creation payload logging was removed. A browser
regression submits hostile text through PHP and checks both initial rendering
and reload; a separate response test covers photo and lookup injection.

Reopening details now clears aria-hidden. Blocked service-worker registration
no longer dereferences an absent registration. Cache version 6 clears versions
4 and 5 so old static rendering code can be replaced after update activation;
Node regression tests cover this cleanup. Installed clients still need to accept
the update/reload. Actual PWA upgrade behavior needs staging/device validation.

## Outstanding release work

Live Maps/Places, clustering, touch gestures, physical devices, missing Maps
configuration, PWA updates/offline behavior, uploads, comments/report UI,
comprehensive accessibility/visual testing and staging remain unverified.
Known source-audit security findings outside these paths remain tracked in
[BASELINE_AUDIT.md](BASELINE_AUDIT.md); this is not a full security clearance.

The dependency audit during setup reported 15 findings (12 high, 3 moderate) in
existing legacy Node/tooling dependencies, including express, multer, mysql2,
nodemon and transitive packages; none named Playwright. The JSON is retained
locally in `test-results/npm-audit.json`. These dependencies are excluded from
the PHP/static deployment artifact, but remediation/exposure review remains a
release blocker. No deployment was performed.

## Verification (2026-09-22)

The final Windows `scripts\test-e2e.bat` run passed all 16 tests in 54.2 seconds:
eight iPhone WebKit, three Android Chromium, three landscape-tablet Chromium,
and one handoff check each on desktop Chromium and Firefox. Retries: zero.
All project containers and networks were removed successfully.

HTML report: `test-results/gapi-test-17880-1790123010389/browser-report/index.html`.
`npm test` passed eight tooling/security checks. Packaging and exact-file
verification passed for 25 deployable files.
