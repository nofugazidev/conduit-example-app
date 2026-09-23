"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CollectionArticle extends Model {
    static associate({ Collection, Article }) {
      this.belongsTo(Collection, { foreignKey: "collectionId", as: "collection" });
      this.belongsTo(Article, { foreignKey: "articleId", as: "article" });
    }
  }

  CollectionArticle.init(
    {
      collectionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      articleId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CollectionArticle",
      tableName: "CollectionArticles",
      timestamps: true,
    },
  );

  return CollectionArticle;
};
