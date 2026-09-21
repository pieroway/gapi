# GAPI — React/PWA Modernization Architecture

## Purpose

GAPI is a mobile-first garage-sale discovery application. This modernization preserves proven behavior while moving the frontend to a maintainable React/PWA architecture with strong automated quality gates.

## Production Platform

Production must remain compatible with A Small Orange shared hosting:

- Apache
- PHP
- MySQL
- Static HTML/CSS/JavaScript/assets

Node.js is **not** required in production. Node/npm/Vite/Playwright may be used on developer machines and in CI. React is compiled to static assets before deployment.

Target architecture:

```text
React / TypeScript / Vite / PWA
              ↓
          Static build
              ↓
          PHP REST API
              ↓
             MySQL
```

## Migration Strategy

This is not a wholesale rewrite.

Current architecture:

- Frontend: HTML/CSS/vanilla JavaScript in `public/`
- Active backend: PHP REST API
- Database: MySQL
- Legacy backend: Node/Express retained only as reference

The old Node/Express implementation was not a React frontend. It is not the migration target and must not be restored merely for compatibility.

### Legacy Code Reuse Policy

Inspect the current frontend, current PHP backend, and legacy Node code where relevant. Reuse proven behavior and useful logic such as:

- validation rules
- API contracts
- data transformations
- geographic/map behavior
- filtering
- error handling
- rate limiting
- database/security behavior
- comments, ratings and reporting logic
- tests and known edge cases

If useful legacy Node behavior is missing from PHP, implement it in the active PHP architecture rather than restoring a Node production backend.

> Reuse proven behaviour and good logic; do not preserve obsolete architecture merely for compatibility with old code.

## Frontend Direction

The new frontend will use React + TypeScript + Vite and be organized by feature. Expected areas include:

- app shell/navigation
- map
- sales/listings
- favourites
- filters
- comments
- ratings
- reporting
- notifications
- settings
- themes
- shared components
- API/services
- hooks/models/styles

## Mobile-First UX

Primary application surfaces:

- Map
- List
- Add/Edit Sale
- Favourites
- Settings

Google Maps functionality should include current location, markers, clustering where useful, sale-type markers, search-this-area behavior, preview cards, map/list switching, filtering, distance and directions.

Sale types and categories should be data-driven rather than hard-coded into page structure.

## Listings

Listings may include:

- title
- sale type
- address
- coordinates
- date/time
- description
- categories
- photos
- rating
- comments
- favourite state
- status

Server-managed uploads must remain protected during deployment.

## Comments, Ratings and Reporting

Listings may support comments/reviews and ratings.

Reporting flow:

```text
Sale Details
   ↓
⋯ More
   ↓
Report / Flag Listing
   ↓
Select reason
   ↓
Optional details
   ↓
Submit
   ↓
Confirmation
```

Reasons may include fake listing, inappropriate content, offensive content, incorrect location, duplicate, ended sale, spam, and other. Reports are stored server-side for administrative review.

## Filtering

Filters may include:

- sale type
- date / today / weekend / next 7 days / custom range
- distance
- photos
- favourites
- open now
- rating
- categories

## Notifications

The architecture should support notification preferences such as:

- nearby sales
- favourite updates
- reminders
- new comments
- nearby sales today
- weekly digest
- saved-search alerts

## PWA

The React frontend should support Progressive Web App capabilities where practical:

- installability / Add to Home Screen
- manifest
- icons
- service worker
- caching
- useful offline behavior
- push notifications where supported

Features must degrade gracefully when browser/OS capabilities are unavailable.

## Themes

Theme implementation must use semantic design tokens/CSS custom properties so appearance can change without restructuring the application.

Potential themes:

- GAPI Green
- Clean / Cupertino-inspired
- Material-inspired
- High Contrast

Theme selection is separate from display mode:

- Light
- Dark
- System

Themes may alter colors, typography, radii, shadows, markers and navigation treatment, but should not radically relocate primary controls.

## Accessibility

The application should support:

- semantic HTML
- keyboard navigation
- screen readers
- useful labels
- appropriate touch targets
- sufficient contrast
- reduced motion
- text scaling
- visible focus states

## Primary Reference Device

The **iPhone 12 Pro** is the primary design, development and automated-test reference device, but not the only supported device.

Primary Playwright target:

```text
Device: iPhone 12 Pro
CSS viewport: approximately 390 × 844
Orientation: Portrait
Engine: WebKit
Input: Touch
```

New mobile mockups should default to a 390 × 844 CSS-pixel portrait canvas.

Where appropriate, layouts should respect safe areas:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

Fixed navigation, bottom sheets, dialogs, floating buttons and map controls must not conflict with safe areas.

> Design first for the iPhone 12 Pro, then prove that the design adapts correctly everywhere else.

## Device and Browser Testing

Representative responsive targets include:

- small phone: 320–375 CSS px
- iPhone 12 Pro: ~390 CSS px
- large iPhone: ~430 CSS px
- standard Android: ~360–412 CSS px
- large Android: ~430–480 CSS px
- tablet: ~768+ CSS px
- desktop: ~1280+ CSS px

Browser engines:

- WebKit
- Chromium
- Firefox

WebKit testing is mandatory for iPhone/iPad/Safari behavior.

CI should run the comprehensive functional suite on the primary configuration and a carefully selected cross-device/browser smoke suite on secondary configurations. Do not multiply every test by every screen, browser and theme unless the risk justifies it.

Major UI changes should run visual regression across the defined device matrix. Important production releases should include physical-device smoke testing where practical, especially for:

- PWA installation and standalone mode
- location
- push notifications
- camera/photo upload
- touch/map gestures
- safe areas/notches
- virtual keyboard
- file/photo picker
- back navigation
- orientation

## Mandatory Testing

Every meaningful behavioral change must have an appropriate automated test.

Required layers include:

- unit tests for business logic
- React component tests
- PHP/API tests
- integration tests
- Playwright end-to-end tests
- responsive/device tests
- accessibility tests
- visual regression where appropriate
- load/performance tests

Existing code is not exempt. Before replacing legacy UI behavior, capture important current behavior with tests where practical, then require the React implementation to satisfy the equivalent behavior.

Legacy Node code itself does not need new coverage unless code or behavior from it is reused.

### API Testing

API tests should cover success and failure paths including validation, authentication/authorization where applicable, database errors, not-found cases, duplicates, rate limiting, CRUD, photos, sale types, categories, comments, ratings and reporting.

### Integration Testing

Integration coverage should include important boundaries such as:

- React → PHP
- PHP → MySQL
- create listing → database → search/map
- comments
- ratings
- reporting

## Load and Performance Testing

Load testing is a release quality-gate requirement. Important targets include listing/search/map/geographic endpoints, filters, details, comments, ratings, reports and listing creation.

Measure and document:

- response-time degradation
- error rates
- throughput
- database bottlenecks
- PHP resource behavior
- query count where useful
- payload size
- memory/resource pressure
- failure behavior under load

Load tests must use an explicitly safe target and must never accidentally run against production.

## Quality Gate

Deployment requires all mandatory quality gates to pass.

Conceptually:

```text
Static checks
   ↓
Unit tests
   ↓
Component/UI tests
   ↓
API tests
   ↓
Integration tests
   ↓
Primary iPhone 12 Pro Playwright suite
   ↓
Cross-device/browser suite
   ↓
Accessibility / required visual regression
   ↓
Load/performance tests
   ↓
Production build
   ↓
Package verification
   ↓
Deploy
```

There is no normal "tests failed but deploy anyway" path.

## Developer Automation

All common development, testing, build, quality-gate and deployment-preparation operations must be available through simple repository scripts.

Windows development is first-class. Convenient `.bat` entry points should be supplied where appropriate, with portable underlying implementations where CI requires them.

Expected developer-facing commands include:

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

A developer should not need to remember long npm, PHP, Playwright or load-test command lines.

The authoritative full local gate should be available through a command such as:

```text
quality-gate
```

It must return a non-zero exit code if any mandatory gate fails.

## GitHub Actions

> GitHub Actions orchestrates. Repository scripts do the work.

The existing automated staging deployment should be preserved while being simplified.

GitHub Actions should remain responsible for infrastructure-specific concerns such as:

- checkout
- runtime setup
- dependency caching
- secrets
- test artifact retention
- SFTP authentication
- trigger rules
- environment protection

Application-specific build/test/package logic should live in repository scripts so it can be reproduced locally.

A target workflow is conceptually:

```text
Push to staging
      ↓
Checkout / runtime setup
      ↓
Repository setup
      ↓
quality-gate
      ↓
package
      ↓
verify-deploy
      ↓
SFTP deploy artifact
      ↓
A Small Orange staging
```

The existing secure SFTP approach and protection of server-owned uploads should remain unless there is a compelling reason to change them.

## CI Debuggability

When useful, failed CI runs should retain artifacts such as:

- Playwright traces
- failure screenshots
- failure videos
- test reports
- coverage reports
- load-test reports
- build logs
- deployment artifact manifest

## Definition of Done

A change is not complete merely because it works on one machine.

As applicable, Definition of Done includes:

- implementation complete
- code reviewed
- relevant automated tests added/updated
- primary iPhone 12 Pro behavior verified
- required secondary-device/browser coverage passes
- accessibility requirements satisfied
- regression coverage passes
- documentation updated
- performance impact acceptable
- quality gate passes
- production build/package succeeds

## Development Principle

> Anything CI can build or test, a developer should be able to build or test with a simple repository command.

The README is the authoritative high-level architecture and engineering-rules reference. The changing sequence of work is maintained in `docs/IMPLEMENTATION_PLAN.md`.
