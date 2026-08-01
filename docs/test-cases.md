# Test Cases

54 requests across 5 folders, extracted from `collections/dummyjson-qa.postman_collection.json`.

---

## 01_Authentication

| # | Nombre del request | Qué valida |
|---|---|---|
| 1 | 01 - Login valid credentials | 200, accessToken y refreshToken presentes y no vacíos, campos de usuario (id, username, email, firstName, lastName) |
| 2 | 02 - Login invalid credentials | 400, body contiene message, no incluye accessToken |
| 3 | 03 - Login missing fields | 400 cuando falta el campo password, body contiene message, no incluye accessToken |
| 4 | 04 - Get current user valid token | 200, campos de usuario presentes, accessToken no expuesto en respuesta, contrato AJV contra user.schema.json |
| 5 | 05 - Get current user no token | **SECURITY (fallo intencional):** /auth/me devuelve 200 sin header Authorization — debe devolver 401 |
| 6 | 06 - Refresh token valid | 200, nuevo accessToken y refreshToken no vacíos en body |
| 7 | 07 - Refresh token invalid | 403 (no 401) con token de refresco inválido, body contiene message, no incluye accessToken |
| 8 | 08 - Get current user tampered token | **SECURITY (fallo intencional):** JWT con payload alterado causa 500 en vez de 401 — unhandled exception en el servidor |

---

## 02_Products_CRUD

| # | Nombre del request | Qué valida |
|---|---|---|
| 9 | 01 - Get all products | 200, products es array no vacío, campos de paginación (total, skip, limit), cada producto tiene id/title/price/category |
| 10 | 02 - Get product by ID valid | 200, campos requeridos del producto (id=1, title, price>0, stock, category, thumbnail, images), contrato AJV contra product.schema.json |
| 11 | 03 - Get product by ID not found | 404 para ID inexistente (9999), body contiene message, no contiene campos de producto |
| 12 | 04 - Create product | 201, id asignado en respuesta, campos enviados (title, price, stock, category) reflejados |
| 13 | 05 - Update product full (PUT) | 200, id permanece 1, campos actualizados (title, price) reflejados |
| 14 | 06 - Update product partial (PATCH) | 200, campo parchado actualizado, campos no parchados siguen presentes |
| 15 | 07 - Delete product | 200, isDeleted=true, deletedOn con timestamp, id original preservado |
| 16 | 08 - Create product with negative price | **BUSINESS RISK (fallo intencional):** API acepta price=-10.99 con 201 — sin validación de precio mínimo |
| 17 | 09 - Update product cannot change ID | 404 — DummyJSON usa el campo id del body como clave de ruteo, no la ruta URL |

---

## 03_Search_Filtering_Pagination

| # | Nombre del request | Qué valida |
|---|---|---|
| 18 | 01 - Pagination first page | 200, exactamente 5 productos, skip=0, limit=5, total>5 |
| 19 | 02 - Pagination second page | 200, exactamente 5 productos, skip=5 aplicado, ningún ID se repite de la primera página |
| 20 | 03 - Search results found | 200, al menos 1 resultado, cada producto contiene "phone" en título o descripción |
| 21 | 04 - Search no results | 200 (no 404) para query sin resultados, products array vacío, total=0 |
| 22 | 05 - Filter by category | 200, al menos 1 producto, todos pertenecen a la categoría "smartphones" |
| 23 | 06 - Sort by price ascending | 200, precios en orden ascendente (cada precio ≥ precio anterior) |
| 24 | 07 - Sort by price descending | 200, precios en orden descendente (cada precio ≤ precio anterior) |
| 25 | 08 - Select specific fields | 200, cada producto tiene title y price, no tiene stock/images/description |
| 26 | 09 - Search with injection and special chars | 200 (no 500) con query `'; DROP TABLE-- 💀`, respuesta es JSON válido, products es array |
| 27 | 10 - Filter by non-existent category | 200 o 404, no 500; si 200: products vacío; si 404: error message |
| 28 | 11 - Limit 0 returns all products | 200, products.length === total (limit=0 devuelve todos) |
| 29 | 12 - Skip beyond total returns empty array | 200 (no 500) con skip=99999, products vacío, total sigue reflejando el conteo real |
| 30 | 13 - Invalid limit and skip params | No 500 con limit=-5&skip=abc, JSON válido, respuesta tiene products array o error message |

---

## 04_Cart_Business_Logic

| # | Nombre del request | Qué valida |
|---|---|---|
| 31 | 01 - Get cart by ID | 200, campos requeridos (id, userId, products, total, discountedTotal, totalProducts, totalQuantity), contrato AJV contra cart.schema.json |
| 32 | 02 - Cart total matches line items | 200, total del carrito coincide con la suma de los totales por línea (tolerancia ±0.01) |
| 33 | 03 - Discounted total is less than gross total | 200, discountedTotal < total, discountedTotal > 0 |
| 34 | 04 - totalProducts vs totalQuantity | 200, totalProducts = número de líneas distintas, totalQuantity = suma de todas las quantities |
| 35 | 05 - Get carts by user | 200, carts es array no vacío, todos los carritos pertenecen a userId=5 |
| 36 | 06 - Add cart with valid products | 201, id asignado, products array no vacío, total > 0 |
| 37 | 07 - Update cart | 200, id permanece 1, productos actualizados reflejados, total recalculado |
| 38 | 08 - Delete cart | 200, isDeleted=true, deletedOn con timestamp, id preservado |
| 39 | 09 - Add cart with quantity 0 | 201, quantity=0 normalizado a 1 silenciosamente por la API (comportamiento documentado) |
| 40 | 10 - Add cart with negative quantity | **BUSINESS RISK (fallo intencional):** API acepta quantity=-3 con 201 — total del carrito puede resultar negativo |
| 41 | 11 - Decimal precision in cart total | 200, diferencia entre total reportado y calculado < 0.01, cada línea tiene ≤ 2 decimales |
| 42 | 12 - Add cart with duplicate product ID | 201, documenta si la API fusiona líneas duplicadas o crea entradas separadas para el mismo id |
| 43 | 13 - Add empty cart | No 500 con products=[]; si 201: total=0/totalProducts=0/totalQuantity=0; si 4xx: error message |
| 44 | 14 - Add cart with invalid userId | No 500 con userId=-1, respuesta es JSON válido |

---

## 05_Error_Handling_Resilience

| # | Nombre del request | Qué valida |
|---|---|---|
| 45 | 01 - Wrong HTTP method | 404 o 405 (no 500) al usar POST en endpoint que no lo soporta; respuesta HTML — solo se valida status |
| 46 | 02 - Malformed JSON body | 400, respuesta es JSON válido, body contiene message |
| 47 | 03 - Missing Content-Type header | No 500 sin header Content-Type, respuesta es JSON válido |
| 48 | 04 - Nonexistent endpoint | 404 (no 500) para ruta desconocida; respuesta HTML — solo se valida status |
| 49 | 05 - String where number expected | No 500 con price="abc"; si 400: error message; si 201: se loguea hallazgo de falta de validación de tipo |
| 50 | 06 - Extremely long string field | No 500 con title de 10.000 caracteres, respuesta es JSON válido |
| 51 | 07 - Response has correct Content-Type header | 200, header Content-Type incluye application/json, respuesta parseable como JSON |
| 52 | 08 - SQL injection in path param | 400 o 404 (no 500) con `1' DROP TABLE--` en path, respuesta es JSON válido |
| 53 | 09 - Empty string in required field | No 500 con title=""; si 400: error message; si 201: se loguea hallazgo de falta de validación de campo requerido |
