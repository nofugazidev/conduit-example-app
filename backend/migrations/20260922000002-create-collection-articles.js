"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CollectionArticles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      collectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Collections",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      articleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Articles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Composite unique constraint: prevent same article appearing twice in same collection
    await queryInterface.addIndex(
      "CollectionArticles",
      ["collectionId", "articleId"],
      {
        unique: true,
        name: "idx_collection_articles_unique",
      },
    );

    // Index on articleId for fast membership queries
    await queryInterface.addIndex("CollectionArticles", ["articleId"], {
      name: "idx_collection_articles_article_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CollectionArticles");
  },
};
