# DummyJSON QA Suite

API test automation suite for [DummyJSON](https://dummyjson.com) using Postman + Newman + GitHub Actions.

The goal wasn't just to verify that the API returns 200s — it was to stress it deliberately: send tampered tokens, negative prices, malformed payloads, and edge inputs to see where it breaks. Instead of skipping or hiding the failures, the suite is designed to surface them permanently as documented findings and distinguish them from real regressions in CI.

---

## Security & Business Risk Findings

The most important output of this suite isn't the green checks — it's these four failures. They are intentional, permanent, and each one represents a real gap in the API.

| ID | Severity | Endpoint | Finding |
|---|---|---|---|
| SF-01 | CRITICAL SECURITY | `GET /auth/me` | Returns 200 with full user profile when no Authorization header is sent |
| SF-02 | CRITICAL SECURITY | `GET /auth/me` | Returns 500 instead of 401 when a tampered/malformed JWT is sent |
| F-04 | BUSINESS RISK | `POST /products/add` | Accepts negative prices with no validation |
| F-06 | BUSINESS RISK | `POST /carts/add` | Accepts negative quantity; cart total can go negative |

SF-01 and SF-02 represent authentication bypass and error handling failures. F-04 and F-06 represent missing input validation on business-critical fields.

To see these findings yourself — and verify everything else passes — here's how to run the suite.

---

## Running Locally

**Prerequisites:** Node.js, Newman

```bash
npm install -g newman
```

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

# CI mode (exit 1 only on unexpected failures)
newman run collections/dummyjson-qa.postman_collection.json \
  --environment environments/dev.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json \
  --suppress-exit-code
node scripts/check-results.js
```

The reason the CI command works the way it does — suppressing Newman's exit code and evaluating results separately — comes down to a few deliberate design choices.

---

## Architecture Decisions

**Self-healing authentication.** A collection-level pre-request script checks `authToken` before every request. If the token is absent, it calls `POST /auth/login` automatically. A collection-level post-response script clears `authToken` on 401 responses with token-related messages in the body. The suite never needs manual token management.

**Intentional failure allowlist.** The CI build uses `--suppress-exit-code` and a custom `scripts/check-results.js` that separates expected failures (SF-01, SF-02, F-04, F-06) from real regressions. The build fails only when something unexpected breaks. This avoids the common pattern of skipping or deleting tests that expose real issues.

**Inline AJV contract tests.** Three requests run JSON Schema validation using AJV v6 directly in the Newman sandbox. The schemas in `schemas/` are the authoritative reference; the inline versions are the executable check. Schema drift surfaces immediately as a contract test failure rather than a field-level assertion error.

**No data cleanup required.** DummyJSON write operations are simulated — they return realistic responses but do not persist data. Each run starts from the same baseline with no teardown step needed.

---

## Coverage

These design decisions apply across all five test folders:

| Folder | Requests | What is covered |
|---|---|---|
| `01_Authentication` | 8 | Login flows, token lifecycle, tampered JWT, missing/invalid credentials |
| `02_Products_CRUD` | 9 | Full CRUD, negative price, attempt to change immutable ID, contract test |
| `03_Search_Filtering_Pagination` | 13 | Pagination, search, category filter, sort, field select, injection, edge inputs |
| `04_Cart_Business_Logic` | 14 | Cart math, discount integrity, qty edge cases, decimal precision, empty cart, contract test |
| `05_Error_Handling_Resilience` | 9 | Wrong method, malformed JSON, missing Content-Type, SQL injection, type mismatches |

**Total: 54 requests, ~137 assertions, 4 intentional failures**

---

## AI Collaboration

This suite was built collaboratively with Claude (claude-sonnet-4-6) acting as a pair programmer. All test design decisions, findings, and architecture choices are documented in `docs/test-strategy.md` and `docs/assumptions.md`.

The `CLAUDE.md` file in the project root defines the collaboration rules, including how Claude pushes back on decisions it disagrees with and how reasoning authority is handled. All prompts are logged with real UTC timestamps in `prompts.txt`.

---

## Folder Structure

```
.
├── collections/
│   └── dummyjson-qa.postman_collection.json   # Full Postman collection (54 requests)
├── environments/
│   └── dev.postman_environment.json           # Base URL + credentials
├── schemas/
│   ├── product.schema.json                    # JSON Schema draft-07
│   ├── cart.schema.json
│   └── user.schema.json
├── scripts/
│   └── check-results.js                       # CI expected-failure filter
├── docs/
│   ├── test-strategy.md                       # Scope, test types, auth strategy, CI
│   ├── assumptions.md                         # API behavior, credentials, design decisions
│   └── known-limitations.md                   # All findings with full detail
├── .github/
│   └── workflows/
│       └── newman.yml                         # GitHub Actions CI pipeline
├── CLAUDE.md                                  # Collaboration rules
└── prompts.txt                                # Prompt log with UTC timestamps
```
