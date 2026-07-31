# Test Strategy

## Scope

This suite validates the [DummyJSON](https://dummyjson.com) public REST API across five concern areas:

| Folder | Coverage |
|---|---|
| `01_Authentication` | Login flows, token lifecycle, auth edge cases |
| `02_Products_CRUD` | Full CRUD operations, field validation, business rules |
| `03_Search_Filtering_Pagination` | Query params, sort, filter, edge inputs |
| `04_Cart_Business_Logic` | Cart math, totals, discount integrity, quantity rules |
| `05_Error_Handling_Resilience` | Malformed input, wrong methods, injection, type mismatches |

**Out of scope:** UI testing, load/performance testing, mutation testing, third-party integrations.

---

## Test Types

### Functional tests
Each request validates status code, response structure, and business-relevant field values using Chai assertions via Postman's `pm.test()` API.

### Contract tests
Three requests include AJV-based JSON Schema validation against the shapes defined in `schemas/`:

| Schema | Request |
|---|---|
| `schemas/product.schema.json` | `02_Products_CRUD / 02 - Get product by ID valid` |
| `schemas/cart.schema.json` | `04_Cart_Business_Logic / 01 - Get cart by ID` |
| `schemas/user.schema.json` | `01_Authentication / 04 - Get current user valid token` |

Contract tests catch breaking API changes (field removals, type changes) independently of functional assertions.

### Security tests
Two requests are explicitly designed to expose security gaps and are marked as **intentional failures**:

- `SF-01` — `/auth/me` returns 200 without an Authorization header
- `SF-02` — Malformed JWT causes 500 instead of 401

### Business risk tests
Two requests expose business logic gaps and are also **intentional failures**:

- Negative product price accepted (no validation)
- Negative cart quantity accepted (total can go negative)

---

## Auth Strategy

Authentication is handled by a **collection-level pre-request script** that checks `authToken` before every request. If the token is absent, it calls `POST /auth/login` automatically using `{{username}}` and `{{password}}` from the environment.

A **collection-level post-response script** clears `authToken` when a 401 response includes an expiry/invalid message in the body, allowing the next request to re-authenticate automatically. This makes the suite self-healing against token expiry.

---

## Intentional Failures

Four tests are designed to fail permanently as documented findings. They use `pm.expect.fail()` with explicit `SECURITY:` or `BUSINESS RISK:` prefixes so failures are immediately actionable in any reporter.

The CI pipeline distinguishes these from real regressions via `scripts/check-results.js`, which maintains an allowlist of expected failure names. The build only fails if an **unexpected** assertion fails.

To add a new expected failure, update the `EXPECTED_FAILURES` array in `scripts/check-results.js`.

---

## Running Locally

**Prerequisites:** Node.js, Newman (`npm install -g newman`)

```bash
# Full run
newman run collections/dummyjson-qa.postman_collection.json \
  --environment environments/dev.postman_environment.json \
  --reporters cli

# Single folder
newman run collections/dummyjson-qa.postman_collection.json \
  --environment environments/dev.postman_environment.json \
  --folder "02_Products_CRUD" \
  --reporters cli

# CI mode (exit code reflects only unexpected failures)
newman run collections/dummyjson-qa.postman_collection.json \
  --environment environments/dev.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json \
  --suppress-exit-code
node scripts/check-results.js
```

---

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/newman.yml`) runs on every push and pull request to `main`.

**Steps:**
1. Checkout repo
2. Install Newman
3. Run collection with `--suppress-exit-code` and JSON reporter
4. `scripts/check-results.js` evaluates results and exits 1 only on unexpected failures
5. `results.json` uploaded as artifact on every run (pass or fail)

---

## Environment

Credentials and base URL are managed in `environments/dev.postman_environment.json`. The `authToken` and `refreshToken` fields start empty and are populated at runtime by the auto-login script. Do not commit real credentials for non-public environments — use GitHub Secrets and inject via `--env-var` in the workflow.
