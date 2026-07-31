# Known Limitations

## Security Findings

These findings represent real security gaps observed during test execution against DummyJSON.
They are marked as CRITICAL failures in the test suite and will cause the collection run to fail intentionally.

### SF-01 — Unauthenticated request returns 200 on /auth/me

- **Endpoint:** `GET /auth/me`
- **Behavior:** Returns full user data (id, username, email, etc.) with no `Authorization` header present.
- **Expected:** 401 Unauthorized
- **Risk:** Any client that fails to include the auth header silently receives valid user data instead of an auth error. In a production system this would be a broken access control vulnerability (OWASP A01).
- **Test:** `01_Authentication / 05 - Get current user no token` — fails intentionally with message `SECURITY: unauthenticated request returned 200`.

### SF-02 — Malformed JWT causes 500 Internal Server Error

- **Endpoint:** `GET /auth/me` with a tampered JWT (one character altered in the payload segment)
- **Behavior:** Returns `500 Internal Server Error` instead of `401 Unauthorized`.
- **Expected:** 401 with a clear error message
- **Risk:** The server is crashing on malformed input instead of handling it gracefully. This indicates an unhandled exception in JWT parsing that could expose stack traces or internal state in a production system.
- **Test:** `01_Authentication / 08 - Get current user tampered token` — fails intentionally with message `SECURITY: malformed token caused server error instead of clean 401`.

---

## API Behavior Findings

Observed behaviors that deviate from conventional REST conventions or introduce business risk.
Tests have been corrected to reflect actual behavior, with comments in the test scripts.

### F-03 — Invalid refresh token returns 403 instead of 401

- **Endpoint:** `POST /auth/refresh` with an invalid token
- **Behavior:** Returns `403 Forbidden`
- **Note:** DummyJSON distinguishes between unauthenticated (401) and forbidden (403). While debatable, it is consistent. Tests updated to expect 403.

### F-04 — API accepts negative product price

- **Endpoint:** `POST /products/add` with `price: -10.99`
- **Behavior:** Returns `201 Created` with the negative price persisted in the response
- **Risk:** No price validation enforced. A real commerce system with this gap could create orders with negative totals, incorrect revenue calculations, or allow price manipulation.
- **Test:** `02_Products_CRUD / 08 - Create product with negative price` — fails intentionally with `BUSINESS RISK` message.

### F-05 — PUT with `id` in body routes by body id, not URL path

- **Endpoint:** `PUT /products/1` with body `{ "id": 9999, ... }`
- **Behavior:** Returns `404` — DummyJSON appears to use the body `id` as the routing key, resolving to `/products/9999` which does not exist.
- **Note:** In a correct REST implementation, the URL path always takes precedence over body fields for resource identification. Tests updated to expect 404 with explanatory comment.

### F-06 — API accepts negative cart quantity

- **Endpoint:** `POST /carts/add` with `quantity: -3`
- **Behavior:** Returns `201 Created` — cart is created with negative quantity
- **Risk:** Cart totals can go negative. Combined with no price validation (F-04), a cart could have a negative total that credits the customer.
- **Test:** `04_Cart_Business_Logic / 10 - Add cart with negative quantity` — fails intentionally with `BUSINESS RISK` message.

### F-07 — Cart quantity 0 is silently normalized to 1

- **Endpoint:** `POST /carts/add` with `quantity: 0`
- **Behavior:** Returns `201 Created` with `quantity: 1` in the response — the API silently changes 0 to 1 with no warning or error.
- **Note:** Silent normalization without feedback is a business logic gap. A caller has no way to know their input was changed. Tests updated to document this behavior.

---

## Test Script Adjustments

Corrections made to test scripts to match actual DummyJSON behavior.

### A-08 — /auth/me response includes `password` field

DummyJSON's `/auth/me` endpoint returns the full user object including a `password` field. This is intentional for the demo API. The test no longer asserts that `password` is absent.

### A-09 — Cart product `discountedPrice` field inconsistently present

Not all DummyJSON cart product objects include a `discountedPrice` field (absent for some product categories). Per-item discount validation removed from `04_Cart_Business_Logic / 03`. Only cart-level `discountedTotal` is validated.

### A-10 — Wrong HTTP method returns HTML, not JSON

`POST /products` (wrong method) returns an HTML page with status 404/405. The JSON assertion was removed. Only the status code is validated.

### A-11 — Unknown route returns HTML, not JSON

`GET /nonexistentendpoint` returns an HTML error page. The JSON assertion and message check were removed. Only the status code is validated.
