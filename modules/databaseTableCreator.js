const {Knex} = require('knex');
const logger = require('./logger.js');
const { VERSION } = require('./data.js');

/**
 * 
 * @param {Knex} knex 
 */
async function CreateTables(knex) {
    logger.info("Checking for table changes");
    let start = Date.now();

    let hasSystemInfo = await knex.schema.hasTable("system_info");
    if (!hasSystemInfo) {
        logger.info("Creating the system_info table");
        await knex.schema.createTable("system_info", (table) => {
            table.string("key").unique().notNullable().primary();
            table.string("value");
            table.timestamps(true, true);
        })
        logger.info("Created the system_info table;")
    }

    let hasUsers = await knex.schema.hasTable("users");
    if (!hasUsers) {
        logger.info("Creating the users table");
        await knex.schema.createTable("users", (table) => {
            table.increments("id").primary().notNullable();
            table.string("username").notNullable().unique();
            table.string("display_name").notNullable();
            table.string("name");
            table.string("password").notNullable();
            table.tinyint("level").defaultTo(0);
            table.integer("asset_count").unsigned().defaultTo(0);
            table.integer("favorite_count").unsigned().defaultTo(0);
            table.json("preferences").defaultTo({});
            table.string("profile_image_url").defaultTo("/img/defaultUser.webp");
            table.integer("added_by").unsigned();
            table.foreign("added_by").references("users.id");
            table.timestamps(true, true);
        })
        logger.info("Created the users table");
    }

    let hasBatches = await knex.schema.hasTable("batches");
    if (!hasBatches) {
        logger.info("Creating the batches table");
        await knex.schema.createTable("batches", (table) => {
            table.string("id").primary().notNullable().defaultTo(knex.fn.uuid());
            table.string("name");
            table.string("type").index().defaultTo("batch");
            table.string("image_url");
            table.string("original_image_name");
            table.string("artist");
            table.integer("added_by").unsigned().notNullable();
            table.integer("asset_count").unsigned().defaultTo(0);
            table.integer("failed_assets").unsigned().defaultTo(0);
            table.boolean("is_resource_batch").defaultTo(false).index();
            table.integer("size").unsigned().defaultTo(0);
            table.foreign("added_by").references("users.id");
            table.timestamps(true, true);
        })
        logger.info("Created the batches table");
    }

    let hasAssets = await knex.schema.hasTable("assets");
    if (!hasAssets) {
        logger.info("Creating the assets table");
        await knex.schema.createTable("assets", (table) => {
            table.string("id").primary().notNullable().defaultTo(knex.fn.uuid());
            table.integer("added_by").unsigned().notNullable();
            table.string("name", 512).notNullable();
            table.string("type").notNullable().index();
            table.string("batch").notNullable().index();
            table.string("tags", 512);
            table.string("path").notNullable();
            table.float("price")
            table.integer("size").unsigned().defaultTo(0);
            table.string("extension");
            table.boolean("nsfw").defaultTo(false);
            table.string("resource_id").index();
            table.foreign("added_by").references("users.id");
            table.foreign("batch").references("batches.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the assets table");
    }

    let hasAssetInfos = await knex.schema.hasTable("asset_infos");
    if (!hasAssetInfos) {
        logger.info("Creating the asset_infos table");
        await knex.schema.createTable("asset_infos", (table) => {
            table.string("id").notNullable().primary();
            table.binary("description");
            table.binary("rendered_description");
            table.binary("legal_information");
            table.string("compression").defaultTo("none");
            table.string("source", 512);
            table.string("license");
            table.string("mime");
            table.boolean("videos").defaultTo(true);
            table.boolean("streams").defaultTo(true);
            table.integer("favorites").unsigned().defaultTo(0);
            table.integer("downloads").unsigned().defaultTo(0);
            table.string("original_name");
            table.foreign("id").references("assets.id").onDelete("CASCADE");
        })
        logger.info("Created the asset_infos table");
    }

    let hasChannels = await knex.schema.hasTable("channels");
    if (!hasChannels) {
        logger.info("Creating the channels table");
        await knex.schema.createTable("channels", (table) => {
            table.string("id").primary().notNullable();
            table.integer("added_by").unsigned().notNullable();
            table.string("image_url");
            table.string("header_image_url");
            table.string("name");
            table.string("handle");
            table.integer("subscribers").unsigned().defaultTo(0);
            table.integer("views").unsigned().defaultTo(0);
            table.dateTime("channel_creation");
            table.string("tags", 512);
            table.text("description");
            table.string("compression").defaultTo("none");
            table.json("country").defaultTo({});
            table.json("settings").defaultTo({});
            table.foreign("added_by").references("users.id");
            table.timestamps(true, true);
        })
        logger.info("Created the channels table");
    }

    let hasChannelMembers = await knex.schema.hasTable("channel_members");
    if (!hasChannelMembers) {
        logger.info("Creating the channel_members table");
        await knex.schema.createTable("channel_members", (table) => {
            table.string("channel").notNullable();
            table.integer("user").unsigned();
            table.primary(["channel", "user"]);
            table.tinyint("access").unsigned().defaultTo(0);
            table.foreign("channel").references("channels.id").onDelete("CASCADE");
            table.foreign("user").references("users.id").onDelete("CASCADE");
        })
        logger.info("Created the channel_members table");
    }

    let hasVideos = await knex.schema.hasTable("videos");
    if (!hasVideos) {
        logger.info("Creating the videos table");
        await knex.schema.createTable("videos", (table) => {
            table.string("id").notNullable().primary().defaultTo(knex.fn.uuid());
            table.string("channel").notNullable().index();
            table.string("youtube_id");
            table.integer("added_by").unsigned().notNullable();
            table.string("title");
            table.string("thumbnail_url").defaultTo("https://placehold.co/1280x720");
            table.binary("description");
            table.binary("rendered_description");
            table.dateTime("uploaded_at");
            table.string("compression").defaultTo("none");
            table.foreign("added_by").references("users.id");
            table.foreign("channel").references("channels.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the videos table");
    }

    let hasVideoInfo = await knex.schema.hasTable("video_infos");
    if (!hasVideoInfo) {
        logger.info("Creating the video_infos table");
        await knex.schema.createTable("video_infos", (table) => {
            table.string("id").primary().notNullable();
            table.integer("views").unsigned().defaultTo(0);
            table.integer("likes").unsigned().defaultTo(0);
            table.integer("dislikes").unsigned().defaultTo(0);
            table.integer("comments").unsigned().defaultTo(0);
            table.string("tags", 512);
            table.json("properties").defaultTo({props: []});
            table.foreign("id").references("videos.id").onDelete("CASCADE");
        })
        logger.info("Created the video_infos table");
    }

    let hasVideoMembers = await knex.schema.hasTable("video_members");
    if (!hasVideoMembers) {
        logger.info("Creating the video_members table");
        await knex.schema.createTable("video_members", (table) => {
            table.integer("user").unsigned().notNullable();
            table.string("video").notNullable();
            table.primary(["user", "video"]);
            table.boolean("starring").defaultTo(false);
            table.boolean("editor").defaultTo(false);
            table.foreign("user").references("users.id").onDelete("CASCADE");
            table.foreign("video").references("videos.id").onDelete("CASCADE");
        })
        logger.info("Created the video_members table");
    }

    let hasVideoAssets = await knex.schema.hasTable("video_assets");
    if (!hasVideoAssets) {
        logger.info("Creating the video_assets table");
        await knex.schema.createTable("video_assets", (table) => {
            table.string("video").notNullable();
            table.string("asset").notNullable();
            table.primary(["video", "asset"]);
            table.foreign("video").references("videos.id").onDelete("CASCADE");
            table.foreign("asset").references("assets.id").onDelete("CASCADE");
        })
        logger.info("Created the video_assets table");
    }

    let hasGames = await knex.schema.hasTable("games");
    if (!hasGames) {
        logger.info("Creating the games table");
        await knex.schema.createTable("games", (table) => {
            table.increments("id").primary().notNullable();
            table.string("name");
            table.text("description");
            table.string("compression");
            table.integer("added_by");
            table.string("image_url");
            table.string("steam_id");
            table.string("website");
            table.string("developer");
            table.string("publisher");
            table.foreign("added_by").references("users.id");
            table.timestamps(true, true);
        })
        logger.info("Created the games table");
    }

    let hasGameInfos = await knex.schema.hasTable("game_infos");
    if (!hasGameInfos) {
        logger.info("Creating the game_infos table");
        await knex.schema.createTable("game_infos", (table) => {
            table.integer("id").unsigned().notNullable().primary();
            table.datetime("published");
            table.string("platforms");
            table.integer("dlc").unsigned().defaultTo(0);
            table.string("tags");
            table.foreign("id").references("games.id").onDelete("CASCADE");
        })
        logger.info("Created the game_infos table");
    }

    let hasVideoGames = await knex.schema.hasTable("video_games");
    if (!hasVideoGames) {
        logger.info("Creating the video_games table");
        await knex.schema.createTable("video_games", (table) => {
            table.string("video").notNullable();
            table.integer("game").unsigned().notNullable();
            table.primary(["video", "game"]);
            table.foreign("video").references("videos.id").onDelete("CASCADE");
            table.foreign("game").references("games.id").onDelete("CASCADE");
        })
        logger.info("Created the video_games table");
    }

    let hasComments = await knex.schema.hasTable("comments");
    if (!hasComments) {
        logger.info("Creating the comments table");
        await knex.schema.createTable("comments", (table) => {
            table.increments("id").primary().notNullable();
            table.string("target").notNullable().index();
            table.integer("parent").unsigned();
            table.integer("added_by").unsigned().notNullable();
            table.integer("likes").unsigned().defaultTo(0);
            table.integer("replies").unsigned().defaultTo(0);
            table.binary("content");
            table.foreign("added_by").references("users.id").onDelete("CASCADE");
            table.foreign("parent").references("comments.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the comments table");
    }

    let hasCommentLikes = await knex.schema.hasTable("comment_likes");
    if (!hasCommentLikes) {
        logger.info("Creating the comment_likes table");
        await knex.schema.createTable("comment_likes", (table) => {
            table.integer("comment").unsigned().notNullable();
            table.integer("user").unsigned().notNullable();
            table.primary(["comment", "user"]);
            table.foreign("comment").references("comments.id").onDelete("CASCADE");
            table.foreign("user").references("users.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the comment_likes table");
    }

    let hasAssetLikes = await knex.schema.hasTable("asset_likes");
    if (!hasAssetLikes) {
        logger.info("Creating the asset_likes table");
        await knex.schema.createTable("asset_likes", (table) => {
            table.string("asset").notNullable();
            table.integer("user").unsigned().notNullable();
            table.primary(["asset", "user"]);
            table.foreign("asset").references("assets.id").onDelete("CASCADE");
            table.foreign("user").references("users.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the asset_likes table");
    }

    let hasDownloads = await knex.schema.hasTable("downloads");
    if (!hasDownloads) {
        logger.info("Creating the downloads table");
        await knex.schema.createTable("downloads", (table) => {
            table.string("asset").notNullable();
            table.integer("user").unsigned().notNullable();
            table.primary(["asset", "user"]);
            table.integer("count").unsigned().defaultTo(0);
            table.foreign("asset").references("assets.id").onDelete("CASCADE");
            table.foreign("user").references("users.id").onDelete("CASCADE");
            table.timestamps(true, true);
        })
        logger.info("Created the downloads table");
    }

    let hasNumberCache = await knex.schema.hasTable("number_cache");
    if (!hasNumberCache) {
        logger.info("Creating the number_cache table");
        await knex.schema.createTable("number_cache", (table) => {
            table.string("key").primary().notNullable();
            table.integer("value").notNullable().defaultTo(0);
            table.timestamps(true, true);
        })
        logger.info("Created the number_cache table");
    }

    let hasAssetLink = await knex.schema.hasTable("asset_references");
    if (!hasAssetLink) {
        logger.info("Creating the asset_references table");
        await knex.schema.createTable("asset_references", (table) => {
            table.string("asset_a").notNullable();
            table.string("asset_b").notNullable();
            table.primary(["asset_a", "asset_b"]);
            table.foreign("asset_a").references("assets.id").onDelete("CASCADE");
            table.foreign("asset_b").references("assets.id").onDelete("CASCADE");
        })
        logger.info("Created the asset_references table");
    }

    logger.info(`Successfully checked for table changes in ${Date.now() - start}ms`);

    await MigrateVersion(knex);
}

/**
 * 
 * @param {Knex} knex 
 */
async function MigrateVersion(knex) {
    let current = await knex("system_info").where({key: "version"}).limit(1);
    if (!current[0]) {
        await knex("system_info").insert({key: "version", value: VERSION});
        return;
    }
    if (current[0].value == VERSION) {
        logger.info("Database is up to date");
        return;
    }

    logger.info(`Checking migration from version ${current[0].value} > ${VERSION}`);

    switch (current[0].value) {
        case "SQL-0.2":
            logger.info("Migration from SQL-0.2");
            await knex.schema.alterTable("assets", (table) => {
                table.string("resource_id").index();
            })
            await knex.schema.alterTable("batches", (table) => {
                table.boolean("is_resource_batch").defaultTo(false).index();
            })
            break;
        case "SQL-0.3":
            logger.info("Migration from SQL-0.3");
            await knex.schema.alterTable("comments", (table) => {
                table.dropColumn("content");
            })
            await knex.schema.alterTable("comments", (table) => {
                table.binary("content");
            })
            break;
        default:
            logger.info(`No migration instructions found`)
            break;
    }

    logger.info("Migration successful");
    await knex("system_info").where({key: "version"}).update({value: VERSION});
}

module.exports = { CreateTables };
