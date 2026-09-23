# Staging verification status

Checked 2026-09-22 (America/Toronto). Status: blocked; staging has not passed the
baseline. No deployment, live data writes or database resets were performed.

## Evidence

The homepage and five API paths failed HTTPS verification with
`DEPTH_ZERO_SELF_SIGNED_CERT`. A direct TLS handshake reproduced the failure.
The new preflight stops at its first TLS failure; validation was not bypassed.
Report: `test-results/staging/preflight-1790125156219.json`.

The latest recorded successful staging workflow was
[run 32540777441](https://github.com/pieroway/gapi/actions/runs/32540777441),
created 2026-08-22 for commit `259e8789e20e3b4477553030cce1595648713d16`.
The inspected local feature branch was at `8470b17`. This historical upload
neither establishes current site health nor deploys the current baseline.

## Repeatable preflight

Run `scripts\test-staging.bat` or `npm run test-staging`.
The target is fixed to `https://staging.garagesailing.today`; extra arguments are
rejected. The command sends at most seven sequential GET requests, never follows
redirects, supplies no credentials/cookies and explicitly enforces certificate
validation. Requests have a 15-second timeout and 5 MiB response limit.

Checks cover homepage HTML, configured Maps key, public listing/lookup shapes,
absence of edit credentials/deleted listings, unauthenticated moderation denial
with no-store, and direct configuration-file denial. Missing administration
configuration is a failure. Reports contain only routes, statuses and sanitized
reasons, never response bodies, listing text, moderation records or keys.
Reports are saved in ignored `test-results/staging/`.

This is a read-only preflight, not the full fixture-based browser/API suite.
Destructive and load suites remain restricted to disposable local stacks.

## Required next steps

1. Configure a publicly trusted certificate and full chain for the staging
   hostname in the hosting account, then rerun the preflight.
2. Review any API failures exposed once HTTPS works and verify the deployed revision.
3. Complete staging browser/real-Maps checks and arrange isolated staging write
   tests before checking off Phase 0.2 staging verification.
4. Resolve release security findings and complete the mandatory quality gate
   before deployment. The workflow was not changed or triggered in this check.

The refreshed npm audit reports 15 findings
(12 high, 3 moderate).
See `test-results/staging-preflight-audit.json` and
[browser baseline security notes](BROWSER_BASELINE.md#outstanding-release-work).

## Local validation

All 11 tooling/security tests passed, including target rejection, TLS failure,
redirect failure, moderation denial, missing configuration and report redaction.
The live preflight correctly exits nonzero on the certificate failure.
Full staging verification remains pending.
