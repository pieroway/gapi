# Coding requirements

Follow README.md for architecture and engineering rules, and
docs/IMPLEMENTATION_PLAN.md for the authorized task scope.

Give progress updates during work so the user knows work is continuing.

Security is a requirement in every phase:

- Assess security implications before implementation.
- Enforce authorization and validation on the server, before reading protected
  data or performing protected actions. Deny access when configuration is missing.
- Protect credentials and user data in logs, responses, browser caches and builds.
- Add regression tests for security-sensitive behavior, including denied access
  and failure paths. Do not treat known vulnerabilities as desired compatibility.
- Known serious vulnerabilities block deployment; resolve them before release.
- Run checks appropriate to the change and report remaining verification gaps.
