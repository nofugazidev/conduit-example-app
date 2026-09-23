"use strict";

const {
  AlreadyTakenError,
  FieldRequiredError,
  NotFoundError,
  ValidationError,
} = require("../helper/customErrors");
const {
  appendFollowers,
  appendFavorites,
  appendTagList,
} = require("../helper/helpers");
const {
  Collection,
  CollectionArticle,
  Article,
  Tag,
  User,
  sequelize,
} = require("../models");

// Helper to sanitize pagination parameters
const parsePagination = (query, defaultLimit = 10, maxLimit = 50) => {
  const limit = Math.min(
    Math.max(1, parseInt(query.limit, 10) || defaultLimit),
    maxLimit,
  );
  let offset = 0;
  if (query.offset !== undefined) {
    offset = Math.max(0, parseInt(query.offset, 10) || 0);
  } else if (query.page !== undefined) {
    const page = Math.max(0, parseInt(query.page, 10) || 0);
    offset = page * limit;
  }
  return { limit, offset };
};

// 1. Create Collection
const createCollection = async (req, res, next) => {
  try {
    const { name, description } = req.body.collection || {};
    if (!name || !name.trim()) {
      throw new FieldRequiredError("Collection name");
    }

    const collection = await Collection.create({
      name: name.trim(),
      description: description && description.trim() ? description.trim() : null,
      userId: req.loggedUser.id,
    });

    res.status(201).json({
      collection: {
        ...collection.toJSON(),
        articlesCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. List User's Collections (Aggregated article counts in 2 clean queries, no N+1)
const listCollections = async (req, res, next) => {
  try {
    const collections = await Collection.findAll({
      where: { userId: req.loggedUser.id },
      order: [["createdAt", "DESC"]],
    });

    if (collections.length === 0) {
      return res.json({ collections: [], collectionsCount: 0 });
    }

    const collectionIds = collections.map((c) => c.id);
    const counts = await CollectionArticle.findAll({
      where: { collectionId: collectionIds },
      attributes: [
        "collectionId",
        [sequelize.fn("COUNT", sequelize.col("articleId")), "count"],
      ],
      group: ["collectionId"],
      raw: true,
    });

    const countMap = new Map(
      counts.map((r) => [r.collectionId, parseInt(r.count, 10)]),
    );

    const formattedCollections = collections.map((col) => {
      const data = col.toJSON();
      const count = countMap.get(col.id) || 0;
      data.articlesCount = count;
      data.articleCount = count;
      return data;
    });

    res.json({
      collections: formattedCollections,
      collectionsCount: formattedCollections.length,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Collection Detail with Paginated Articles (Single-query eager loading, No N+1)
const getCollection = async (req, res, next) => {
  try {
    const { collection } = req;
    const { limit, offset } = parsePagination(req.query, 10, 50);

    const { count, rows: articles } = await Article.findAndCountAll({
      include: [
        {
          model: Collection,
          as: "collections",
          where: { id: collection.id },
          attributes: [],
          through: { attributes: [] },
        },
        { model: Tag, as: "tagList", attributes: ["name"] },
        {
          model: User,
          as: "author",
          attributes: { exclude: ["email", "password"] },
        },
      ],
      distinct: true,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    for (const article of articles) {
      appendTagList(article.tagList || [], article);
      await appendFollowers(req.loggedUser, article);
      await appendFavorites(req.loggedUser, article);
    }

    res.json({
      collection: {
        ...collection.toJSON(),
        articlesCount: count,
        articles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Collection (Rename / Description)
const updateCollection = async (req, res, next) => {
  try {
    const { collection } = req;
    const { name, description } = req.body.collection || {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new FieldRequiredError("Collection name");
      }
      collection.name = name.trim();
    }

    if (description !== undefined) {
      collection.description =
        description && description.trim() ? description.trim() : null;
    }

    await collection.save();

    const articlesCount = await CollectionArticle.count({
      where: { collectionId: collection.id },
    });

    res.json({
      collection: {
        ...collection.toJSON(),
        articlesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Collection (Cascades junction rows, leaves Articles intact)
const deleteCollection = async (req, res, next) => {
  try {
    const { collection } = req;
    await collection.destroy();

    res.json({
      message: { body: ["Collection deleted successfully"] },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Add Article to Collection
const addArticleToCollection = async (req, res, next) => {
  try {
    const { collection } = req;
    const slugOrId = req.params.slug || req.params.articleId || req.body.slug || req.body.articleId;

    let article;
    if (typeof slugOrId === "number" || /^\d+$/.test(String(slugOrId))) {
      article = await Article.findByPk(slugOrId);
    }
    if (!article && typeof slugOrId === "string") {
      article = await Article.findOne({ where: { slug: slugOrId } });
    }

    if (!article) {
      throw new NotFoundError("Article");
    }

    // Check duplicate membership
    const existing = await CollectionArticle.findOne({
      where: {
        collectionId: collection.id,
        articleId: article.id,
      },
    });

    if (existing) {
      throw new AlreadyTakenError("Article", "in this collection");
    }

    await CollectionArticle.create({
      collectionId: collection.id,
      articleId: article.id,
    });

    res.status(201).json({
      message: { body: ["Article added to collection successfully"] },
    });
  } catch (error) {
    next(error);
  }
};

// 7. Remove Article from Collection
const removeArticleFromCollection = async (req, res, next) => {
  try {
    const { collection } = req;
    const slugOrId = req.params.slug || req.params.articleId;

    let article;
    if (typeof slugOrId === "number" || /^\d+$/.test(String(slugOrId))) {
      article = await Article.findByPk(slugOrId);
    }
    if (!article && typeof slugOrId === "string") {
      article = await Article.findOne({ where: { slug: slugOrId } });
    }

    if (!article) {
      throw new NotFoundError("Article");
    }

    const membership = await CollectionArticle.findOne({
      where: {
        collectionId: collection.id,
        articleId: article.id,
      },
    });

    if (!membership) {
      throw new NotFoundError("Article in collection");
    }

    await membership.destroy();

    res.json({
      message: { body: ["Article removed from collection successfully"] },
    });
  } catch (error) {
    next(error);
  }
};

// 8. Check Membership Status across User's Collections for a specific article
const getArticleCollectionStatus = async (req, res, next) => {
  try {
    const slugOrId = req.params.slug || req.params.articleId;

    let article;
    if (typeof slugOrId === "number" || /^\d+$/.test(String(slugOrId))) {
      article = await Article.findByPk(slugOrId);
    }
    if (!article && typeof slugOrId === "string") {
      article = await Article.findOne({ where: { slug: slugOrId } });
    }

    if (!article) {
      throw new NotFoundError("Article");
    }

    const userCollections = await Collection.findAll({
      where: { userId: req.loggedUser.id },
      order: [["name", "ASC"]],
    });

    if (userCollections.length === 0) {
      return res.json({ collections: [], collectionIds: [] });
    }

    const memberships = await CollectionArticle.findAll({
      where: {
        articleId: article.id,
        collectionId: userCollections.map((c) => c.id),
      },
    });

    const memberIds = new Set(memberships.map((m) => m.collectionId));

    const result = userCollections.map((col) => ({
      id: col.id,
      name: col.name,
      inCollection: memberIds.has(col.id),
    }));

    res.json({ collections: result, collectionIds: Array.from(memberIds) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addArticleToCollection,
  removeArticleFromCollection,
  getArticleCollectionStatus,
};
