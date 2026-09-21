# GAPI — Implementation Plan

This is the living implementation roadmap for the React/PWA modernization. The architecture and non-negotiable engineering rules are defined in `README.md`.

## Working Branch

Recommended modernization branch:

```text
feature/react-pwa-modernization
```

## Rules for Every Phase

- Do not deploy when a mandatory quality gate fails.
- Every meaningful behavioral change gets an appropriate automated test.
- Preserve existing behavior deliberately; do not assume a rewrite is equivalent.
- iPhone 12 Pro / WebKit at approximately 390 × 844 is the primary frontend reference.
- Secondary devices and browsers are tested throughout development, not only at the end.
- Node.js may be used for development/CI but is not required on A Small Orange production hosting.
- GitHub Actions should invoke repository scripts rather than duplicate application-specific commands in YAML.
- Server-managed uploads must remain protected during deployment.

# Phase 0 — Engineering Foundation

The engineering foundation is established before substantial React migration work.

## 0.1 Document and Baseline the Existing Application

- [ ] Document important existing frontend behavior.
- [ ] Identify active PHP API endpoints.
- [ ] Identify important API contracts and validation behavior.
- [ ] Review legacy Node/Express code for useful behavior or edge cases.
- [ ] Identify current deployment assumptions.
- [ ] Establish a load/performance baseline.

## 0.2 Bring Current Code Under Test

- [ ] Add baseline PHP/API tests.
- [ ] Add Playwright tests around critical current vanilla-JS UI behavior.
- [ ] Add integration tests for important PHP/MySQL flows.
- [ ] Capture important behavior before replacing it with React.
- [ ] Confirm existing staging application still passes the baseline suite.

## 0.3 Developer-Friendly Automation

Create a repository script framework. Windows-friendly `.bat` wrappers are required where useful.

Developer-facing commands should include:

```text
setup
build
test
test-unit
test-components
test-api
test-integration
test-e2e
test-iphone
test-devices
test-visual
test-accessibility
test-load
quality-gate
package
verify-deploy
```

- [ ] Create setup command.
- [ ] Create build command.
- [ ] Create normal fast development test command.
- [ ] Create unit-test command.
- [ ] Create component-test command when React testing is introduced.
- [ ] Create API-test command.
- [ ] Create integration-test command.
- [ ] Create E2E command.
- [ ] Create primary iPhone 12 Pro test command.
- [ ] Create cross-device/browser command.
- [ ] Create visual-regression command.
- [ ] Create accessibility-test command.
- [ ] Create safe load-test command.
- [ ] Create authoritative `quality-gate` command.
- [ ] Create deployment packaging command.
- [ ] Create deployment verification command.
- [ ] Provide script help/documentation.

Scripts should be safe to rerun where practical and should provide useful failure messages.

## 0.4 Simplify GitHub Actions

Principle:

> GitHub Actions orchestrates. Repository scripts do the work.

- [ ] Preserve the existing staging trigger behavior.
- [ ] Preserve secure SFTP authentication.
- [ ] Preserve GitHub secret usage.
- [ ] Preserve remote server upload protection.
- [ ] Move application-specific build/test/package logic into repository scripts.
- [ ] Have GitHub Actions call the same quality-gate logic developers run locally.
- [ ] Retain useful failure artifacts such as Playwright traces/screenshots and test/load reports.
- [ ] Verify staging deployment after refactoring the workflow.

Target:

```text
Push to staging
      ↓
Checkout
      ↓
Setup runtime/cache
      ↓
Repository setup
      ↓
quality-gate
      ↓
package
      ↓
verify-deploy
      ↓
SFTP deployment
```

## 0.5 Prove the Foundation

- [ ] Local quality gate passes.
- [ ] CI quality gate passes.
- [ ] Deployment package verification passes.
- [ ] Staging deployment succeeds.
- [ ] Existing staging behavior remains functional.

**Do not begin substantial React migration until this foundation is working.**

# Phase 1 — React Foundation

- [ ] Create `frontend/`.
- [ ] Configure React + TypeScript + Vite.
- [ ] Establish feature-oriented folder structure.
- [ ] Add frontend lint/static checks.
- [ ] Establish React component testing.
- [ ] Create API service layer for the existing PHP API.
- [ ] Establish routing/application shell.
- [ ] Establish theme/design-token system.
- [ ] Implement base responsive layout.
- [ ] Establish iPhone 12 Pro Playwright project.
- [ ] Establish secondary device/browser Playwright projects.
- [ ] Integrate Vite production output with deployment packaging.
- [ ] Verify A Small Orange receives static assets only.

Device validation begins here, not in a later hardening phase.

# Phase 2 — Core UI Migration

Migrate functionality incrementally rather than replacing everything at once.

- [ ] Navigation/application shell.
- [ ] Map.
- [ ] Sale markers.
- [ ] Marker preview.
- [ ] List view.
- [ ] Sale cards.
- [ ] Map/list switching.
- [ ] Search.
- [ ] Filters.
- [ ] Sale details.
- [ ] Photos/display.
- [ ] Sale types/categories.

For each migrated behavior:

1. Understand current behavior.
2. Capture/confirm tests.
3. Implement React behavior.
4. Run primary iPhone tests.
5. Run required secondary-device smoke coverage.
6. Remove old implementation only when replacement behavior is proven.

# Phase 3 — User Features

- [ ] Favourites.
- [ ] Add sale.
- [ ] Edit sale.
- [ ] Photo upload.
- [ ] Comments/reviews.
- [ ] Ratings.
- [ ] Report/flag listing.
- [ ] Settings.
- [ ] Theme selection.
- [ ] Light/Dark/System display modes.
- [ ] Notification preferences/data model.

Reporting flow:

```text
Sale Details
   ↓
⋯ More
   ↓
Report / Flag Listing
   ↓
Reason
   ↓
Optional details
   ↓
Submit
   ↓
Confirmation
```

# Phase 4 — PWA

- [ ] Web app manifest.
- [ ] Application icons.
- [ ] Installability.
- [ ] Add-to-Home-Screen validation.
- [ ] Standalone-mode validation.
- [ ] Service worker.
- [ ] Caching strategy.
- [ ] Defined offline behavior.
- [ ] Push notifications where supported and appropriate.
- [ ] Graceful fallback where browser/OS capability is unavailable.

Physical iPhone 12 Pro testing is especially important here.

# Phase 5 — Cross-Device and UX Hardening

Other devices have already been tested throughout earlier phases. This phase is for hardening, not first exposure.

## Automated Matrix

- [ ] Small iPhone / WebKit.
- [ ] iPhone 12 Pro / WebKit — primary.
- [ ] Large iPhone / WebKit.
- [ ] Android phone / Chromium.
- [ ] Tablet.
- [ ] Desktop / Chromium.
- [ ] Desktop / Firefox.

Representative width targets:

```text
Small phone        320–375
iPhone 12 Pro      ~390
Large iPhone       ~430
Android            ~360–480
Tablet             ~768+
Desktop            ~1280+
```

- [ ] Portrait coverage.
- [ ] Relevant landscape coverage.
- [ ] Minimum supported width around 320 CSS px.
- [ ] Visual regression for stable UI surfaces.
- [ ] Avoid brittle visual assertions against dynamic Google Maps imagery.
- [ ] Theme smoke/visual coverage.
- [ ] Dark mode checks.
- [ ] High-contrast checks.
- [ ] Increased text-size checks.
- [ ] Reduced-motion checks.
- [ ] Keyboard/accessibility checks.

## Physical-Device Smoke Testing

For important releases, validate where practical:

- [ ] Primary physical iPhone 12 Pro.
- [ ] Recent/current iPhone.
- [ ] Older supported iPhone.
- [ ] Representative Android phone.
- [ ] Tablet where appropriate.

Focus on:

- PWA installation
- standalone mode
- location
- camera/photo upload
- photo/file picker
- push notifications
- touch gestures
- Google Maps gestures
- safe areas/notches
- virtual keyboard
- scrolling
- dialogs/bottom sheets
- back navigation
- orientation

# Phase 6 — Production Readiness

- [ ] Review API/database performance.
- [ ] Run required load/performance suite.
- [ ] Confirm documented thresholds.
- [ ] Review error handling and logging.
- [ ] Perform basic security review.
- [ ] Verify no secrets enter frontend/deployment artifacts.
- [ ] Verify no `node_modules` or development-only content is packaged.
- [ ] Verify server uploads are excluded/protected.
- [ ] Run complete quality gate.
- [ ] Run required physical-device smoke tests.
- [ ] Produce production build.
- [ ] Verify deployment artifact.
- [ ] Deploy according to the approved production process.

# Testing Strategy

The full functional suite should run on the primary configuration. Secondary configurations receive a smaller, risk-based cross-device suite covering critical journeys rather than blindly running every test across every permutation.

Critical cross-device journeys include:

- startup
- navigation
- map
- marker interaction
- map/list switching
- search
- filtering
- sale details
- photos
- create/edit sale
- favourites
- comments
- ratings
- reporting
- settings
- themes
- PWA behavior where automatable

# Load Testing

The `test-load` command must use a safe, explicit test target. It must not accidentally target production.

Important areas include:

- listing/search endpoints
- geographic/map searches
- filtering
- details
- comments
- ratings
- reports
- create/update operations

Measure response time, error rate, throughput, database bottlenecks, PHP resource behavior, payload size and failure behavior.

# Definition of Done for an Implementation Task

A task is complete when, as applicable:

- [ ] Implementation is complete.
- [ ] Relevant unit/component/API/integration/E2E tests exist.
- [ ] Existing behavior has not regressed unintentionally.
- [ ] iPhone 12 Pro primary tests pass.
- [ ] Required secondary-device/browser tests pass.
- [ ] Accessibility expectations pass.
- [ ] Documentation is updated.
- [ ] Performance impact is acceptable.
- [ ] Quality gate passes when the change reaches a deployment boundary.

# Developer / Coding-Agent Workflow

Use the repository documentation as the source of truth.

A coding-agent instruction can be as simple as:

```text
Read README.md and docs/IMPLEMENTATION_PLAN.md.
Implement the specified task only.
Follow all architecture, testing and quality-gate requirements.
Run the relevant repository test commands before finishing.
Do not proceed to the next task unless requested.
```

# Guiding Principles

> Reuse proven behavior and good logic; do not preserve obsolete architecture merely for compatibility with old code.

> Anything CI can build or test, a developer should be able to build or test with a simple repository command.

> GitHub Actions should orchestrate GAPI's automation, not contain GAPI's automation.

> Design first for the iPhone 12 Pro, then prove that the design adapts correctly everywhere else.
