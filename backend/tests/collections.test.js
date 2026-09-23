"use strict";

const request = require("supertest");
const app = require("../index");
const { jwtSign } = require("../helper/jwt");
const { User, Article, Collection, CollectionArticle, sequelize } = require("../models");

describe("Collections API & Security Test Suite", () => {
  let userA, tokenA;
  let userB, tokenB;
  let testArticle;
  let userACollection;

  beforeAll(async () => {
    // Ensure DB connection and schema
    await sequelize.authenticate();
    await sequelize.sync();

    // Clean up test data
    await CollectionArticle.destroy({ where: {} });
    await Collection.destroy({ where: {} });
    await Article.destroy({ where: { slug: "test-collection-article-slug" } });
    await User.destroy({ where: { email: ["userA_col@test.com", "userB_col@test.com"] } });

    // Create User A (Owner)
    userA = await User.create({
      username: "userA_col",
      email: "userA_col@test.com",
      password: "password123",
    });
    tokenA = await jwtSign({ username: userA.username, email: userA.email });

    // Create User B (Potential Attacker)
    userB = await User.create({
      username: "userB_col",
      email: "userB_col@test.com",
      password: "password123",
    });
    tokenB = await jwtSign({ username: userB.username, email: userB.email });

    // Create Test Article
    testArticle = await Article.create({
      slug: "test-collection-article-slug",
      title: "Test Collection Article",
      description: "A test article for collections",
      body: "Lorem ipsum dolor sit amet",
      userId: userA.id,
    });
  });

  afterAll(async () => {
    // Clean up
    await CollectionArticle.destroy({ where: {} });
    await Collection.destroy({ where: {} });
    if (testArticle) await testArticle.destroy();
    if (userA) await userA.destroy();
    if (userB) await userB.destroy();
  });

  describe("1. Authentication Enforcement (401)", () => {
    test("POST /api/collections rejects unauthenticated request with 401", async () => {
      const res = await request(app)
        .post("/api/collections")
        .send({ collection: { name: "Unauthorized Collection" } });

      expect(res.status).toBe(401);
      expect(res.body.errors.body[0]).toMatch(/login first/i);
    });

    test("GET /api/collections rejects unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/collections");
      expect(res.status).toBe(401);
    });

    test("GET /api/collections/:id rejects unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/collections/1");
      expect(res.status).toBe(401);
    });
  });

  describe("2. Validation Enforcement (422)", () => {
    test("POST /api/collections rejects empty or missing name with 422", async () => {
      const res = await request(app)
        .post("/api/collections")
        .set("Authorization", `Token ${tokenA}`)
        .send({ collection: { name: "   " } });

      expect(res.status).toBe(422);
      expect(res.body.errors.body[0]).toMatch(/required/i);
    });
  });

  describe("3. Collection CRUD (Owner Flow)", () => {
    test("POST /api/collections creates collection successfully (201)", async () => {
      const res = await request(app)
        .post("/api/collections")
        .set("Authorization", `Token ${tokenA}`)
        .send({
          collection: {
            name: "My Reading List",
            description: "Curated tech articles",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.collection).toBeDefined();
      expect(res.body.collection.name).toBe("My Reading List");
      expect(res.body.collection.description).toBe("Curated tech articles");
      expect(res.body.collection.articlesCount).toBe(0);
      expect(res.body.collection.userId).toBeUndefined(); // Never leak internal userId

      userACollection = res.body.collection;
    });

    test("GET /api/collections returns user's collections (200)", async () => {
      const res = await request(app)
        .get("/api/collections")
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeGreaterThanOrEqual(1);
      expect(res.body.collections[0].name).toBe("My Reading List");
    });

    test("PUT /api/collections/:id renames collection (200)", async () => {
      const res = await request(app)
        .put(`/api/collections/${userACollection.id}`)
        .set("Authorization", `Token ${tokenA}`)
        .send({
          collection: {
            name: "Updated Reading List",
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.collection.name).toBe("Updated Reading List");
    });
  });

  describe("4. Ownership Boundary & Security Protection (Zero Info Leakage - 404)", () => {
    test("User B cannot view User A's collection (returns 404 Not Found)", async () => {
      const res = await request(app)
        .get(`/api/collections/${userACollection.id}`)
        .set("Authorization", `Token ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.errors.body[0]).toMatch(/not found/i);
    });

    test("User B cannot rename User A's collection (returns 404 Not Found)", async () => {
      const res = await request(app)
        .put(`/api/collections/${userACollection.id}`)
        .set("Authorization", `Token ${tokenB}`)
        .send({ collection: { name: "Hacked Collection" } });

      expect(res.status).toBe(404);
    });

    test("User B cannot delete User A's collection (returns 404 Not Found)", async () => {
      const res = await request(app)
        .delete(`/api/collections/${userACollection.id}`)
        .set("Authorization", `Token ${tokenB}`);

      expect(res.status).toBe(404);
    });

    test("User B's collection list does not contain User A's collection", async () => {
      const res = await request(app)
        .get("/api/collections")
        .set("Authorization", `Token ${tokenB}`);

      expect(res.status).toBe(200);
      const found = res.body.collections.find((c) => c.id === userACollection.id);
      expect(found).toBeUndefined();
    });
  });

  describe("5. Membership & Duplicate Prevention (422)", () => {
    test("User A adds article to collection (201)", async () => {
      const res = await request(app)
        .post(`/api/collections/${userACollection.id}/articles/${testArticle.slug}`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.message.body[0]).toMatch(/added/i);
    });

    test("Duplicate addition of same article is rejected (422)", async () => {
      const res = await request(app)
        .post(`/api/collections/${userACollection.id}/articles/${testArticle.slug}`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(422);
      expect(res.body.errors.body[0]).toMatch(/already exists/i);
    });

    test("GET /api/collections/:id returns collection with saved articles and pagination (200)", async () => {
      const res = await request(app)
        .get(`/api/collections/${userACollection.id}?limit=10&offset=0`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.collection.articlesCount).toBe(1);
      expect(res.body.collection.articles.length).toBe(1);
      expect(res.body.collection.articles[0].slug).toBe(testArticle.slug);
      expect(res.body.collection.articles[0].author).toBeDefined();
      expect(res.body.collection.articles[0].author.email).toBeUndefined(); // Safe author projection
    });

    test("GET /api/collections/status/:slug returns inCollection: true for User A", async () => {
      const res = await request(app)
        .get(`/api/collections/status/${testArticle.slug}`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(200);
      const status = res.body.collections.find((c) => c.id === userACollection.id);
      expect(status).toBeDefined();
      expect(status.inCollection).toBe(true);
    });

    test("User A removes article from collection (200)", async () => {
      const res = await request(app)
        .delete(`/api/collections/${userACollection.id}/articles/${testArticle.slug}`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.message.body[0]).toMatch(/removed/i);
    });
  });

  describe("6. Safe Deletion Invariant (Articles are NEVER deleted)", () => {
    test("Deleting a collection deletes collection without deleting articles", async () => {
      // Re-add article to verify cascade on collection delete
      await request(app)
        .post(`/api/collections/${userACollection.id}/articles/${testArticle.slug}`)
        .set("Authorization", `Token ${tokenA}`);

      const res = await request(app)
        .delete(`/api/collections/${userACollection.id}`)
        .set("Authorization", `Token ${tokenA}`);

      expect(res.status).toBe(200);

      // Verify Collection is gone
      const deletedCollection = await Collection.findByPk(userACollection.id);
      expect(deletedCollection).toBeNull();

      // Verify Junction record is gone
      const junction = await CollectionArticle.findOne({
        where: { collectionId: userACollection.id },
      });
      expect(junction).toBeNull();

      // CRITICAL INVARIANT: Verify Article still exists!
      const articleStillExists = await Article.findByPk(testArticle.id);
      expect(articleStillExists).not.toBeNull();
      expect(articleStillExists.id).toBe(testArticle.id);
    });
  });
});
