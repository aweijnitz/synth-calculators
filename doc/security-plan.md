# Security hardening plan inspired by the Shai-Hulud npm attack analysis

The Snyk article on the Shai-Hulud attack recommends locking down npm supply-chain risk by:

- Pinning exact dependency versions rather than loose ranges to avoid unexpected transitive changes.
- Enforcing exact-version saves for new installs so future additions stay pinned.
- Running regular security audits to catch newly disclosed vulnerabilities.

## Actions for this repository

- **Dependency pinning:** All direct dependencies are set to exact versions in `package.json` and kept in `package-lock.json` so installs reproduce the known-good tree.
- **Enforce save-exact:** `.npmrc` configures npm to persist exact versions for any new packages and locks the registry to HTTPS.
- **Security auditing:** A `security:audit` npm script runs `npm audit --audit-level=high` to check for high/critical advisories as part of routine maintenance.

Run `npm run security:audit` regularly (for example in CI or before releases) and prefer `npm ci` for reproducible installs based on the lockfile.
