"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Collection extends Model {
    static associate({ User, Article, CollectionArticle }) {
      // Owner
      this.belongsTo(User, { foreignKey: "userId", as: "owner" });

      // Articles via junction table
      this.belongsToMany(Article, {
        through: CollectionArticle,
        as: "articles",
        foreignKey: "collectionId",
        otherKey: "articleId",
      });

      // Direct junction association
      this.hasMany(CollectionArticle, {
        foreignKey: "collectionId",
        as: "collectionArticles",
        onDelete: "CASCADE",
      });
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.userId; // Do not expose internal userId to client
      return values;
    }
  }

  Collection.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Collection name cannot be empty" },
          len: {
            args: [1, 255],
            msg: "Collection name must be between 1 and 255 characters",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Collection",
      tableName: "Collections",
    },
  );

  return Collection;
};
