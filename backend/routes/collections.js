"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const {
  requireAuth,
  verifyCollectionOwnership,
} = require("../middleware/collectionAuth");
const {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addArticleToCollection,
  removeArticleFromCollection,
  getArticleCollectionStatus,
} = require("../controllers/collections");

// All collection endpoints strictly require authentication
router.use(verifyToken, requireAuth);

// 1. Create a collection
router.post("/", createCollection);

// 2. List user's collections
router.get("/", listCollections);

// 3. Check membership status of an article across user's collections
router.get("/status/:slug", getArticleCollectionStatus);
router.get("/article-status/:articleId", getArticleCollectionStatus);

// 4. Single collection operations (strictly verified for ownership)
router.get("/:id", verifyCollectionOwnership, getCollection);
router.put("/:id", verifyCollectionOwnership, updateCollection);
router.delete("/:id", verifyCollectionOwnership, deleteCollection);

// 5. Membership management (add / remove article)
router.post("/:id/articles", verifyCollectionOwnership, addArticleToCollection);
router.post("/:id/articles/:slug", verifyCollectionOwnership, addArticleToCollection);
router.delete("/:id/articles/:slug", verifyCollectionOwnership, removeArticleFromCollection);

module.exports = router;
