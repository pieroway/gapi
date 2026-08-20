# Branching and Deployment Strategy

This project uses one GitHub repository with separate staging and production deployments.

## Branch Flow

```text
feature/* or fix/* -> staging -> main
                           |
                           +--> staging.garagesailing.today

main --------------------------> garagesailing.today
```

- `feature/*`: individual changes and experiments.
- `fix/*`: focused bug fixes.
- `staging`: integration branch deployed to the staging site.
- `main`: production-ready code deployed to the live site.

## Normal Workflow

Create a feature branch from the latest `staging` branch:

```bash
git switch staging
git pull origin staging
git switch -c feature/short-description
```

Make and test the change, then commit it with a useful message:

```bash
git add <intended-files>
git commit -m "Describe the change"
git push -u origin feature/short-description
```

Open a pull request into `staging`. Test the deployed staging site before promoting the change.

After approval:

```bash
git switch staging
git pull origin staging
git merge --no-ff feature/short-description
git push origin staging
```

When staging is verified, open a pull request from `staging` into `main`. Merge only approved changes into `main`:

```bash
git switch main
git pull origin main
git merge --no-ff staging
git push origin main
```

GitHub Actions should deploy after pushes to the corresponding branch:

| Branch | Site | Remote directory |
| --- | --- | --- |
| `staging` | `staging.garagesailing.today` | `/home1/alan/staging.garagesailing.today/` |
| `main` | `garagesailing.today` | `/home1/alan/garagesailing.today/` |

## Staging GitHub Action

The workflow at `.github/workflows/deploy-staging.yml` runs for pushes to `staging` and for manual workflow runs. Add these as GitHub repository or `staging` environment secrets:

```text
SFTP_HOST=sh073.asoshared.com
SFTP_PORT=22
SFTP_USERNAME=alan
SFTP_STAGING_DIR=/home1/alan/staging.garagesailing.today/
SFTP_PRIVATE_KEY=<the GitHub Actions private SSH key>
SFTP_KNOWN_HOSTS=<the verified SSH host-key line for sh073.asoshared.com>
```

The staging document root must already exist because the workflow uses SFTP only. Create `/home1/alan/staging.garagesailing.today/` in cPanel or through SFTP before the first run.

The workflow intentionally does not upload `api/config.php` or the `uploads/` directory. Put staging database credentials in the server's `api/config.php` and preserve uploaded files on the host.

## Deployment Layout

The repository stores the frontend and PHP backend separately. Each deployment must assemble them into the hosting document root:

```text
public/*       -> document root
php/.htaccess  -> document root/.htaccess
php/api/*      -> document root/api/
```

Do not deploy `.git/`, `node_modules/`, Docker files, `php/initializedb.sql`, or development-only files. Preserve the server's `uploads/` directory during deployments.

## Environment Separation

Use separate databases and credentials:

```text
Staging:    alan_gapi_stage
Production: alan_gapi_prod
```

Never use staging credentials on production or production credentials on staging. Store credentials and API keys in the hosting environment or deployment secrets, not in Git.

The Google Maps key should be restricted to the correct site origin. A separate staging key is preferred.

## Database Safety

`php/initializedb.sql` is a fresh-install and development seed script. It contains `DROP DATABASE`, so never run it against production or an existing database.

For production schema changes:

1. Create a numbered migration in `migrations/`.
2. Test the migration against staging.
3. Back up production before applying it.
4. Apply the migration to production during the release.
5. Keep the migration in Git for repeatability.

Migrations should alter existing data safely and should not drop or recreate the production database.

## Main Branch Protection

Configure GitHub branch protection for `main`:

- Require pull requests before merging.
- Require at least one approval.
- Require passing status checks once CI checks exist.
- Require branches to be up to date before merging.
- Require conversation resolution.
- Block force pushes and branch deletion.
- Prevent bypassing the rules when practical.

The `staging` branch can also require pull requests, but it should remain easier to update for testing.

## Release Checklist

Before merging `staging` into `main`:

- Test the feature on `staging.garagesailing.today`.
- Verify API responses and database writes.
- Confirm uploads and existing photos still work.
- Confirm the service worker is updated when frontend JavaScript changes.
- Review the files being deployed.
- Confirm production configuration is separate from staging.
- Apply any required database migration safely.
- Merge through the protected pull request.
- Verify `https://garagesailing.today` after deployment.

For an urgent production fix, create `fix/short-description` from `main`, test it on staging, then merge the fix into both `main` and `staging` so the branches do not diverge.
