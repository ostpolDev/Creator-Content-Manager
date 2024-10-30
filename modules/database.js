const { Pool } = require('pg');
const { CreateTables } = require('./databaseTableCreator');
const logger = require('./logger');

const CONNECTION_INFO = {
    host: process.env.CREATOR_PGHOST,
    port: process.env.CREATOR_PGPORT || 5432,
    user: process.env.CREATOR_PGUSER,
    password: process.env.CREATOR_PGPASSWORD,
    database: process.env.CREATOR_PGDATABASE
}

const sessionDBAccess = new Pool({
    ...CONNECTION_INFO
});

const knex = require('knex').knex({
    client: "pg",
    connection: {
        ...CONNECTION_INFO
    }
});

async function Create() {
    await CreateTables(knex);
}

module.exports = { sessionDBAccess, knex, Create }
