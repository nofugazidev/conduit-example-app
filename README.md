# ![RealWorld Example App](logo.png)

> **React 19 / Vite + SWC / Express.js 5 / Sequelize / PostgreSQL 16 codebase implementing the RealWorld specification extended with Private Article Collections.**

This repository contains a full-stack, production-grade implementation of Conduit featuring full CRUD operations, authentication, routing, pagination, automated CI pipelines, and a complete **Private Article Collections** feature with unit, integration, and Playwright end-to-end test suites.

---

## 🌟 Feature Spotlight: Private Article Collections

The **Private Article Collections** feature allows users to curate, organize, and safeguard custom collections of articles for personalized reading lists.

### Architectural Invariants & Security
- **Strict Privacy**: Collections are strictly private to their authenticated owner.
- **Zero Information Leakage**: Cross-user unauthorized access attempts return `404 Not Found` (never `403`) to completely eliminate resource and user enumeration vulnerabilities.
- **Composite Uniqueness**: Articles cannot be added twice to the same collection (enforced via database composite unique index `(collectionId, articleId)`, returning `422 Unprocessable Entity`).
- **Safe Cascade Deletion**: Deleting a collection cascades to junction table records (`CollectionArticles`) while leaving parent `Articles` rows completely intact.
- **Zero N+1 Queries**: Collection listing executes in exactly 2 constant queries using grouped batch count aggregation.

For complete scaling, Redis caching, indexing, and observability architecture, see [**`DESIGN_NOTE.md`**](DESIGN_NOTE.md).

---

## 🚀 Getting Started

### Prerequisites
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download/) `v20.x` or `v22.x`
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) (for PostgreSQL)

---

### Installation & Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd conduit-realworld-example-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start PostgreSQL via Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Environment Configuration:**
   Copy and configure the environment file:
   ```bash
   cp backend/.env.example backend/.env
   cp backend/.env.example .env
   ```
   Update `.env` (and `backend/.env`) with your database credentials matching the `docker-compose.yml`.

5. **Create the test database** (required for Supertest backend tests):
   ```bash
   docker exec -it conduit-postgres psql -U postgres -c "CREATE DATABASE database_testing;"
   ```

6. **Run Database Migrations:**
   ```bash
   # Development database
   NODE_ENV=development npm run sqlz -- db:migrate

   # Test database
   NODE_ENV=test npm run sqlz -- db:migrate
   ```

---

### Running the Application Locally

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:3000/](http://localhost:3000)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)

---

## 🧪 Testing

### 1. Unit & Integration Tests (Vitest & Supertest)
```bash
npm run test
# or
npx vitest run
```

### 2. End-to-End Tests (Playwright)
```bash
# Install Chromium (first time only)
npx playwright install chromium

# Run E2E tests
npm run test:e2e
```

---

## 📡 API Reference: Collections Endpoints

All collections endpoints require `Authorization: Token <jwt>`.

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/collections` | Create a new private collection | `201`, `401`, `422` |
| `GET` | `/api/collections` | List all private collections owned by user | `200`, `401` |
| `GET` | `/api/collections/:id` | Get collection details with paginated articles | `200`, `401`, `404` |
| `PUT` | `/api/collections/:id` | Update collection name or description | `200`, `401`, `404`, `422` |
| `DELETE` | `/api/collections/:id` | Delete collection (cascades junction rows safely) | `200`, `401`, `404` |
| `POST` | `/api/collections/:id/articles/:slug` | Add an article to a collection | `201`, `401`, `404`, `422` |
| `DELETE` | `/api/collections/:id/articles/:slug` | Remove an article from a collection | `200`, `401`, `404` |
| `GET` | `/api/collections/status/:slug` | Check article membership across user's collections | `200`, `401`, `404` |

---

## ⚙️ Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR to `main`:
1. Launches PostgreSQL 16 service container.
2. Runs `npm ci` for clean reproducible install.
3. Applies migrations for development and test databases.
4. Runs all Vitest & Supertest tests.
5. Builds the frontend bundle (`vite build`).
6. Runs Playwright E2E tests in headless Chromium.
7. Uploads Playwright report artifact on failure.

---

## ⚠️ Known Limitations

- The Redis caching layer documented in `DESIGN_NOTE.md` is designed but not implemented — all reads hit PostgreSQL directly. This is appropriate for the current data scale but would be the first production investment for high-traffic scenarios.
- Collection names are not enforced as unique per user at the database level (only application validation). A `UNIQUE(userId, name)` index would be a clean follow-up improvement.
- The `Article.toJSON()` method strips the numeric `id` field for RealWorld spec compliance. The backend resolves articles by slug in all collection operations to work around this, which adds one extra DB lookup per membership operation.

---

## 🤖 AI Usage

AI coding assistants (Gemini) were used throughout this assessment as part of the development workflow.

**Where AI was used:**
- Drafting the initial migration schema and Sequelize model associations.
- Generating boilerplate for frontend service functions and React component scaffolding.
- Writing the initial Supertest test suite structure.
- Drafting the `DESIGN_NOTE.md` content.
- Antigravity Gemini code assistant was used and the occasional promptingi of Claude especially at the beginning of the project to go through it and explain

**Validation approach:** All AI-generated code was reviewed, tested, and in several cases corrected before committing. Every file was verified to work against the real database and browser environment.

**One concrete AI correction:**

> **Architectural Oversight on Vitest JSDOM vs. Supertest Express Testing**
>
> During initial implementation of the backend integration test suite, the AI assistant attempted to configure Vitest with a single `environment: 'jsdom'` setting (matching the existing frontend test setup). Supertest's HTTP client collided with jsdom's mock socket layer, causing backend database tests to hang indefinitely or throw stream connection errors rather than making real HTTP calls.
>
> **The correction:** I rejected the unified jsdom approach and re-architected `vitest.config.js` into a multi-project configuration — a dedicated `backend` project with `environment: 'node'` targeting `backend/**/*.test.js`, and an isolated `frontend` project with `environment: 'jsdom'` targeting `frontend/**/*.test.{js,jsx}`. I also refactored `backend/index.js` to guard `app.listen()` behind `if (require.main === module)` and export the raw `app` instance. This separation allowed Supertest to bind ephemeral in-process HTTP listeners in a genuine Node environment, resulting in 100% reliable parallel test execution.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Original project by [TonyMckes](https://github.com/TonyMckes/conduit-realworld-example-app) — all original attribution and license preserved. and the link to my own repo which contains this version is [nofugazidev](https://github.com/nofugazidev/conduit-example-app)
