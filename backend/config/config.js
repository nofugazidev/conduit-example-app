const path = require("path");
// Load env vars so Sequelize CLI picks them up when run standalone (outside index.js)
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") }); // root .env
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });    // backend/.env

/** @type {import('sequelize').Options} */
module.exports = {
  development: {
    username: process.env.DEV_DB_USERNAME,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME,
    host: process.env.DEV_DB_HOSTNAME || process.env.DEV_DB_HOST || "127.0.0.1",
    port: process.env.DEV_DB_PORT || 5432,
    dialect: process.env.DEV_DB_DIALECT || "postgres",
    logging: process.env.DEV_DB_LOGGING === "true" || process.env.DEV_DB_LOGGING === true,
  },
  test: {
    username: process.env.TEST_DB_USERNAME,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
    host: process.env.TEST_DB_HOSTNAME || process.env.TEST_DB_HOST || "127.0.0.1",
    port: process.env.TEST_DB_PORT || process.env.DEV_DB_PORT || 5432,
    dialect: process.env.TEST_DB_DIALECT || "postgres",
    logging: process.env.TEST_DB_LOGGING === "true" || process.env.TEST_DB_LOGGING === true,
  },
  production: {
    username: process.env.PROD_DB_USERNAME,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOSTNAME || process.env.PROD_DB_HOST || "127.0.0.1",
    port: process.env.PROD_DB_PORT || 5432,
    dialect: process.env.PROD_DB_DIALECT || "postgres",
    logging: process.env.PROD_DB_LOGGING === "true" || process.env.PROD_DB_LOGGING === true,
  },
};

