# Assumptions

## API Behavior

**DummyJSON is a fake/mock API.** Write operations (POST, PUT, PATCH, DELETE) return simulated responses but do not persist data. Tests validate the shape and content of the response, not that a subsequent GET reflects the change.

**The API is stateless from the test suite's perspective.** Each run starts from the same baseline. No test cleanup is required because no data is actually mutated.

**Product, cart, and user IDs used in tests (e.g. `/products/1`, `/carts/1`, `/auth/me`) are stable.** DummyJSON's seed data does not change between runs, so hardcoded IDs in requests are reliable.

**DummyJSON token expiry is 30 minutes.** The `expiresInMins: 30` parameter is set explicitly on all login and refresh calls. The auto-login mechanism handles re-authentication transparently if a token expires mid-run.

---

## Credentials

**Public test credentials (`emilys` / `emilyspass`) are intentionally committed to the repository.** These are DummyJSON's published demo credentials with no real-world sensitivity. For any non-public environment, credentials must be managed via GitHub Secrets and injected at runtime.

**The authenticated user for all tests is `emilys` (userId varies by DummyJSON version).** Tests that assert `body.username` compare against `{{username}}` from the environment, not a hardcoded string, so a credential change does not require test edits.

---

## Schema Contracts

**Schemas in `schemas/` reflect the API shape observed during initial test runs.** If DummyJSON adds, removes, or renames fields, contract tests will surface the change. This is intentional — the contract test is a canary, not a blocker for optional fields.

**Format validators (`date-time`, `email`, `uri`) are defined in the `.json` schema files but omitted from the inline AJV schemas in test scripts.** This avoids inconsistent format validation behavior across Newman versions. The schema files remain the authoritative reference for tooling (editors, linters, documentation generators).

**`additionalProperties: true` is set on all top-level schema objects.** DummyJSON may add fields without notice. The suite validates the presence and type of known fields without rejecting new ones.

---

## Test Design

**Tests are ordered within each folder but the folders are independent.** Running a single folder in isolation works correctly because the collection-level pre-request script handles authentication automatically.

**The four intentional failures (2 security, 2 business risk) are permanent by design.** They document real gaps in the API and will continue to fail until DummyJSON fixes the underlying behavior. Removing them from the allowlist in `scripts/check-results.js` would cause CI to fail — that is the correct behavior if a finding is fixed and no longer needs to be tracked.

**Response time threshold of 2000ms is conservative.** DummyJSON is a public API with variable latency. The threshold is set high enough to avoid flaky failures on slow networks while still catching complete outages.

---

## CI

**The workflow uses `ubuntu-latest`.** No browser, no UI driver, no OS-specific dependencies. Newman is a pure Node.js CLI tool.

**`results.json` is committed to the repo only as a local artifact from manual runs.** The CI workflow generates it fresh each run and uploads it as a GitHub Actions artifact. It is not used as a test fixture.
