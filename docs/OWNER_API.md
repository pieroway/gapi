# Owner API credential transport

Owner operations use fixed request URLs and an `Authorization: Bearer <edit_guid>`
header. `POST /api/events` still returns the newly generated `edit_guid` once in
its private, non-cacheable response. Store it as a secret; never put it in request
paths, query strings, diagnostics or analytics. Public listing IDs do not authorize
owner operations. The admin token does not substitute for an owner credential.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/events/edit` | None |
| PUT | `/api/events/edit` | JSON listing fields, categories and existingPhotos |
| DELETE | `/api/events/edit` | None (soft delete) |
| POST | `/api/events/edit/undelete` | None |
| POST | `/api/events/edit/photos` | Multipart photo |

All five operations require the header, including reads. Missing or malformed
bearer credentials return 401; unknown UUID credentials return 404. Owner reads
omit `edit_guid`. Responses retain `Cache-Control: private, no-store` and add
`Vary: Authorization`. Apache forwards Authorization for CGI/FastCGI hosting.

The former `/api/events/edit/<credential>` routes return 410 without dispatching
an operation, even if an authorization header is supplied. There is no redirect
or compatibility fallback: requests to those URLs already expose their credential
to intermediary/server logs. Query-string and body credentials are not accepted.

## Client and deployment compatibility

This is an intentional breaking API change. Migrate external consumers to the
fixed endpoints before rollout. The active public app currently creates listings
but does not implement an owner edit-link UI. Its browser regression now exercises
a header-authenticated owner read. Test callers use the new transport throughout.
Admin editing uses public IDs with the admin API contract; the corresponding
admin handlers remain unimplemented and owner credentials are not exposed to
make that separate feature work.

Header transport prevents the updated flow from placing credentials in ordinary
request-line access logs. It cannot remove credentials already recorded by older
clients, old deployments or historical logs. Before release, review existing owner
credentials/log exposure, plan any necessary credential rotation with owner
recovery, and verify host/proxy/APM configuration does not record Authorization
headers or sensitive response bodies. Do not print live credentials during these
checks. TLS and header forwarding must also be verified on staging.

The service worker never caches API requests. Existing admin browser token storage
is unchanged; this change is not a complete authentication/session redesign.

## Regression coverage

- Full owner create/read/update/delete/restore/upload flows use bearer headers.
- All owner operations deny missing, malformed, admin and unknown credentials;
  public IDs, query/body tokens and retired URL routes cannot authorize changes.
- Denials preserve database state and retain private/no-store response headers.
- A fresh synthetic capability is absent from local Apache logs after successful
  owner operations; this verifies the local log format, not remote host settings.
- Browser requests use fixed URLs and owner reads omit the capability.
- Existing upload ownership, rollback, admin authorization and caching tests remain.
