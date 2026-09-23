# Technical Design Note: Private Article Collections

## 1. System Overview & Problem Statement

The "Private Article Collections" feature introduces personal, user-curated reading lists into the Conduit RealWorld platform. Users can create custom collections (e.g., "System Design", "DevOps Guides"), organize articles into them, and manage them privately.

### Core Architectural Invariants
1. **Strict Privacy & Isolation**: Collections are private to their creator. There are no public collections.
2. **Zero Information Leakage**: Any cross-user unauthorized access attempts (read, update, delete, or add/remove article) must return `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration attacks.
3. **Membership Idempotency & Uniqueness**: An article cannot be added twice to the same collection (enforced via database composite unique index `(collectionId, articleId)`, returning `422 Unprocessable Entity`).
4. **Safe Cascade Deletion**: Deleting a collection cascades to junction table records (`CollectionArticles`) while leaving parent `Articles` rows completely intact.
5. **N+1 Prevention**: Listing collections and viewing articles inside a collection must execute in bounded, constant query counts regardless of collection size.

---

## 2. Database Schema & Indexing Strategy

```
  ┌─────────────────┐       1:N       ┌────────────────────────┐
  │      Users      ├─────────────────┤      Collections       │
  │─────────────────│                 │────────────────────────│
  │ id (PK)         │                 │ id (PK)                │
  │ username        │                 │ userId (FK -> Users)   │
  │ email           │                 │ name                   │
  └─────────────────┘                 │ description            │
                                      │ createdAt / updatedAt  │
                                      └───────────┬────────────┘
                                                  │ 1
                                                  │
                                                  │ N
                                      ┌───────────┴────────────┐
                                      │   CollectionArticles   │ (Junction)
                                      │────────────────────────│
                                      │ collectionId (FK, PK)  │
                                      │ articleId    (FK, PK)  │
                                      │ createdAt / updatedAt  │
                                      └───────────┬────────────┘
                                                  │ N
                                                  │
  ┌─────────────────┐       1:N                   │ 1
  │    Articles     ├─────────────────────────────┘
  │─────────────────│
  │ id (PK)         │
  │ slug (Unique)   │
  │ title           │
  │ body            │
  └─────────────────┘
```

### Indexing Design
- **Composite Unique Index**: `CREATE UNIQUE INDEX idx_collection_articles_unique ON "CollectionArticles" ("collectionId", "articleId");`
  - Enforces duplicate prevention at the engine level — not just application code — eliminating TOCTOU race conditions.
- **Reverse Lookup Index**: `CREATE INDEX idx_collection_articles_article ON "CollectionArticles" ("articleId");`
  - Optimizes `getArticleCollectionStatus` from O(N) table scan to O(log N) index seek.
- **User Collection Index**: `CREATE INDEX idx_collections_user_id ON "Collections" ("userId");`
  - Ensures index-only sorting when listing a user's collections.

### Scaling to Millions of Records
- **Table Partitioning**: As `CollectionArticles` grows past 50M rows, apply Hash Partitioning on `collectionId` across 16–32 partitions to keep index tree depths shallow.
- **Connection Pooling**: Deploy PgBouncer in transaction-pooling mode with limits tuned to CPU core count.

---

## 3. Query Optimization & Eliminating N+1 Patterns

A naive implementation would fire a `SELECT COUNT(*) FROM CollectionArticles WHERE collectionId = ?` for each collection — N+1 queries. Instead, our controller executes exactly **two** database queries:

1. Fetch all user collections in one query.
2. Single grouped aggregation across extracted collection IDs:
   ```sql
   SELECT "collectionId", COUNT("articleId") AS count
   FROM "CollectionArticles"
   WHERE "collectionId" IN (:ids)
   GROUP BY "collectionId";
   ```
3. Merge counts in application memory using an in-memory `Map` — O(M) time. Total DB queries remain **constant at 2** whether the user has 1 or 500 collections.

---

## 4. Caching Strategy (Redis)

| Key Pattern | TTL | Purpose |
| :--- | :--- | :--- |
| `user:{userId}:collections` | 15 min | Cached collection list with article counts |
| `collection:{id}:detail:p{page}` | 30 min | Paginated articles in a collection |
| `article:{slug}:users:{userId}:status` | 1 hour | Collection membership status for Save modal |

**Invalidation:** Write-through invalidation — any mutation (create/update/delete collection, add/remove article) evicts the relevant keys immediately. XFetch probabilistic early re-computation prevents cache stampedes on hot keys.

---

## 5. Observability & Monitoring

- **Rate & Error Metrics (RED method):** `http_requests_total{handler="collections", status=~"4xx|5xx"}` — a spike in 404s on `/api/collections/:id` indicates ID enumeration probing and should trigger a security alert.
- **Latency:** Track p50/p95/p99 on collection endpoints. Target: p95 ≤ 45ms. Alert if p95 > 250ms for 5 consecutive minutes.
- **Security Anomaly Alert:** `sum(rate(http_requests_total{handler="collections", status="404"}[5m])) > 20/sec` — flags brute-force enumeration.
- **Structured Logging:** Inject `x-request-id` correlation header; log `userId`, `collectionId`, `action`, and `durationMs` per request (never log tokens or passwords).

---

## 6. Key Architectural Trade-Offs & Rationale

### 1. 404 Not Found vs. 403 Forbidden for Cross-User Access
Returning `404` uniformly for both non-existent and foreign collections means an attacker cannot distinguish "this ID doesn't exist" from "this ID exists but belongs to someone else." A `403` would confirm the resource exists, enabling incremental integer scanning to map user activity patterns.

### 2. Relational Junction Table vs. Denormalized JSONB Array
A JSONB array in `Collections.article_ids` avoids JOIN operations on small tables but sacrifices referential integrity. If an article author deletes their article, dangling IDs remain in every user's collection indefinitely. The junction table guarantees foreign key cascading, ACID transactions, and clean bidirectional indexing — the right choice for any data with relational integrity requirements.

### 3. Dual Identifier Resolution (Slug + ID)
The RealWorld spec strips numeric `id` from public article objects (`Article.toJSON()` removes `id`). Supporting slug-based lookup in the backend controller keeps the frontend clean and spec-compliant. Slug resolution is a fallback — if the parameter looks like an integer, `findByPk` fires first (faster); otherwise `findOne({ where: { slug } })` runs.

### Trade-off Made for 3-Day Window
The Redis caching layer is documented but not implemented — all reads hit PostgreSQL directly. For a product with millions of articles and hundreds of thousands of users, implementing cache-aside with key invalidation would be the first performance investment after launch.

### What I'd Improve Next
Add tag-based filtering inside collection detail (`?tag=devops`), introduce soft-deletion for collections (tombstone pattern for potential undo/restore), add collection sharing (read-only public link), and implement the Redis caching layer described above.
