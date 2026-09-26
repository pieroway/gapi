# Local quality gate

Run `make quality-gate`, `npm run quality-gate`, or
`scripts\quality-gate.bat`. Install dependencies with `npm ci`, install browsers
with `make setup-browsers`, and start Docker Desktop (Linux containers).
Linux browser runs also need Playwright OS dependencies.

The gate stops at the first failure, including unavailable tools, missing visual
baselines, dependency-audit failures and container cleanup failures. It never
deploys, updates screenshots, or targets a remote application.

## Ordered checks

1. JavaScript syntax, including inline application scripts.
2. npm dependency audit (high/critical findings block the gate).
3. Tooling/security regressions and unit tests.
4. PHP/API and MySQL integration suites in disposable stacks.
5. Full primary iPhone WebKit suite and secondary device/browser smoke.
6. Accessibility and visual regression suites.
7. Bounded load baseline with its documented thresholds.
8. Production artifact assembly, exact-file verification and isolated Apache/PHP
   artifact smoke, including PHP syntax and upload permissions.

React component tests will join this sequence when React exists. The existing
load suite is a bounded baseline, not hosting-capacity or sustained-load proof.
npm auditing does not assess the PHP/MySQL/Apache images or shared hosting.

## Individual commands

Every command below also has an npm script and Windows wrapper:

| Command | Scope |
| --- | --- |
| `make test` | Tooling, unit and isolated API checks for everyday development |
| `make test-unit` | Shared application listing filters; Node only |
| `make test-static` | JavaScript syntax; Node only |
| `make test-audit` | npm dependency vulnerability audit |
| `make test-visual` | Screenshot comparisons; never writes accepted baselines |
| `make test-visual-update` | Explicitly regenerate visual baselines for review |
| `make test-accessibility` | WCAG A/AA axe checks plus keyboard detail navigation |

## Visual baselines

The suite covers list, detail and settings on iPhone, Android and tablet, plus
the existing desktop mobile-handoff screen in Chromium and Firefox. It uses
synthetic PHP data, a fixed browser date, local Maps doubles, blocked external
requests, and disabled screenshot animations. Comparisons allow no changed
pixels. Baselines live in `tests/e2e/snapshots/<platform>/<project>/`.

Baselines are platform-specific because fonts and rendering differ. Windows
baselines are supplied initially. A different OS must generate and review its
own baselines before its gate can pass; a missing baseline fails closed. Pin
Playwright via package-lock.json. Browser upgrades require explicit review.

For an intentional visual change, run `make test-visual-update`, inspect the
changed PNGs, then run `make test-visual` and commit the reviewed baselines.
Do not use the update command to hide an unexplained failure. Failure screenshots,
diffs, traces and reports remain in ignored `test-results/<project>/`.

## Accessibility scope

Axe checks visible list, details, settings and submission screens on the mobile
and tablet projects, and the desktop handoff. Detailed JSON reports are attached
to Playwright reports using synthetic data. Keyboard checks exercise opening
details, Escape dismissal and focus restoration. Automated checks do not replace
screen-reader or physical-device testing. Live Maps accessibility is outside
the local test double's scope.

## Release boundary

A passing local gate does not clear the documented staging TLS blocker,
historical credential/log review, shared-host verification, physical-device
checks, or live Maps checks. See SECURITY_HARDENING.md, OWNER_API.md and
STAGING_VERIFICATION.md. CI wiring and staging proof remain Phase 0.4/0.5 work.
