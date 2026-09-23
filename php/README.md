# PHP application

The active backend runs on Apache/PHP/MySQL. See [BUILD.md](../BUILD.md) for
Docker Desktop setup, Windows commands, packaging and verification, and
[BRANCHING.md](../BRANCHING.md) for staging/production workflow.

Run scripts\setup.bat then scripts\dev.bat from the repository root.
Configuration reads environment variables or the hosting document-root .user.ini;
startup does not rewrite PHP source. Keep production credentials on the host.

The canonical rewrite file is public/.htaccess. Deploy the verified deploy/
artifact, not this php/ directory. The seed initializedb.sql drops/recreates gapi
and is only for a disposable/new development database. Reconcile numbered
migrations with the actual host schema before applying any to an existing DB.
