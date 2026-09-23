"use strict";

const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { Collection } = require("../models");

// Middleware to enforce authentication
const requireAuth = (req, res, next) => {
  try {
    if (!req.loggedUser) {
      throw new UnauthorizedError();
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to enforce strict collection ownership
// Returns 404 for non-existent or foreign collections to prevent ID enumeration
const verifyCollectionOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = await Collection.findByPk(id);

    if (!collection || collection.userId !== req.loggedUser.id) {
      throw new NotFoundError("Collection");
    }

    req.collection = collection;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAuth, verifyCollectionOwnership };
