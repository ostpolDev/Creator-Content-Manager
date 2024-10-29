const router = require('express').Router();
const { knex } = require('../../modules/database');
const { body, validationResult } = require('express-validator');
const assetHelpers = require('../../modules/assetHelpers');
const { randomUUID } = require('crypto');
const path = require('path');
const paths = require('../../modules/paths');
const logger = require('../../modules/logger');
const textHelpers = require('../../modules/textHelpers');
const marked = require('../../modules/marked');
const fs = require('fs');
const { HasAccessToAsset } = require('../../modules/validation');

router.post("/add", [
    body("name", "Name cannot be longer than 512 characters").isLength({max: 512}),
    body("batchName", "Batch name cannot be longer than 255 characters").isLength({max: 255}),
    body("description", "Description cannot be longer than 2048 characters").isLength({max: 2048}),
    body("legal", "Legal information cannot be longer than 2048 characters").isLength({max: 2048}),
    body("assetType", "Asset type is required").notEmpty(),
    body("tags", "Tags cannot be longer than 512 characters").isLength({max: 512}),
    body("source", "Source cannot be longer than 512 characters").isLength({max: 512}),
    body("price", "Price is not a valid number").isFloat({min: 0}).optional(),
    body("licenseType", "A license is required").notEmpty()
], async (/**@type {import('express').Request} */ req, /**@type {import('express').Response} */ res,/**@type {import('express').NextFunction} */ next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({success: false, msg: errors.array().map(x => ({msg: x.msg, field: x.fields}))});
    }

    let name = req.body.name;
    let batchName = req.body.batchName;
    let description = req.body.description;
    let legalText = req.body.legal;
    let assetType = req.body.assetType;
    let tags = req.body.tags;
    let source = req.body.source;
    let price = req.body.price;
    let licenseType = req.body.licenseType;
    let support_youtube = req.body.support_youtube == "true";
    let support_twitch = req.body.support_twitch == "true";
    let nsfw = req.body.nsfw == "true";

    if (!req.files || !req.files.assets) {
        return res.status(400).json({success: false, msg: "Please select at least one file"});
    }

    if (req.files.length > 100) {
        return res.status(400).json({success: false, msg: "You can only upload up to 100 files at once"});
    }

    if (!Object.keys(assetHelpers.licenseTypes).includes(licenseType)) {
        return res.status(400).json({success: false, msg: "Invalid license"});
    }

    if (!assetHelpers.assetTypes.includes(assetType)) {
        return res.status(400).json({success: false, msg: "Invalid asset type"});
    }

    try {

        let proms = [];

        let batch = await knex("batches").insert({
            name: batchName || randomUUID(),
            added_by: req.user.id,
            asset_count: req.files.assets.length
        }, "id");

        if (!batch[0]) {
            return res.status(500).json({success: false, msg: "Failed to create asset batch"});
        }

        let failed = 0;
        let size = 0;
        let count = 0;
        let firstAsset = undefined;

        if (!Array.isArray(req.files.assets)) {
            req.files.assets = [req.files.assets]
        }

        req.files.assets.forEach(asset => {
            count++;
            proms.push(new Promise(async (resolve, reject) => {
                try {
                    let uid = randomUUID();
                    let extension = path.extname(asset.name);
                    let destPath = path.join(paths.uploads, uid + extension);

                    let newAsset = await knex("assets").insert({
                        added_by: req.user.id,
                        name: req.files.assets.length == 1 ? name || textHelpers.capitalizeString(textHelpers.RemoveExtension(asset.name)) : textHelpers.capitalizeString(textHelpers.RemoveExtension(asset.name)),
                        type: assetType,
                        batch: batch[0].id,
                        tags,
                        path: uid + extension,
                        size: asset.size,
                        extension,
                        nsfw,
                        price
                    }, "id");

                    if (!newAsset[0]) {
                        logger.error(`Failed to insert asset`);
                        failed++;
                        return resolve();
                    }

                    if (!firstAsset) {
                        firstAsset = newAsset[0].id;
                    }

                    let renderedDescription = await marked.markAndSanitize(description);
                    let shouldCompress = description && renderedDescription.length > 1000;

                    if (shouldCompress) {
                        description = textHelpers.CompressString(description, true).text;
                        renderedDescription = textHelpers.CompressString(renderedDescription, true).text;
                        if (legalText) {
                            legalText = textHelpers.CompressString(legalText, true).text;
                        }
                    }

                    let newAssetInfo = await knex("asset_infos").insert({
                        id: newAsset[0].id,
                        description,
                        rendered_description: renderedDescription,
                        legal_information: legalText,
                        compression: shouldCompress ? "gzip": "none",
                        source,
                        license: licenseType,
                        mime: asset.mimetype,
                        videos: support_youtube,
                        streams: support_twitch,
                        original_name: asset.name
                    }, "id");

                    if (!newAssetInfo[0]) {
                        await knex("assets").where({id: newAsset[0].id}).limit(1).delete();
                        logger.error(`Failed to insert asset info`);
                        failed++;
                        return resolve();
                    }

                    await asset.mv(destPath);
                    size += asset.size;

                    return resolve();

                } catch (e) {
                    logger.error(e);
                    failed++;
                    return resolve();
                }
            }))
        })

        await Promise.all(proms);

        await knex("batches").where({id: batch[0].id}).limit(1).update({size, failed_assets: failed, asset_count: count});

        if (count == 1 && firstAsset) {
            return res.status(200).json({success: true, redirect: `/assets/v/${encodeURIComponent(firstAsset)}`});
        }

        return res.status(200).json({success: true, redirect: `/assets/batches/v/${encodeURIComponent(batch[0].id)}`});

    } catch (e) {
        return next(e);
    }
    
})

router.post("/edit", [
    body("name", "Name cannot be longer than 512 characters").isLength({max: 512}),
    body("description", "Description cannot be longer than 2048 characters").isLength({max: 2048}),
    body("legal", "Legal information cannot be longer than 2048 characters").isLength({max: 2048}),
    body("assetType", "Asset type is required").notEmpty(),
    body("tags", "Tags cannot be longer than 512 characters").isLength({max: 512}),
    body("source", "Source cannot be longer than 512 characters").isLength({max: 512}),
    body("price", "Price is not a valid number").isFloat({min: 0}).optional(),
    body("licenseType", "A license is required").notEmpty(),
    body("asset", "Asset is required").notEmpty()
], async (/**@type {import('express').Request} */ req, /**@type {import('express').Response} */ res,/**@type {import('express').NextFunction} */ next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({success: false, msg: errors.array().map(x => ({msg: x.msg, field: x.fields}))});
    }

    let assetId = req.body.asset;

    let name = req.body.name;
    let description = req.body.description;
    let legalText = req.body.legal;
    let assetType = req.body.assetType;
    let tags = req.body.tags;
    let source = req.body.source;
    let price = req.body.price;
    let licenseType = req.body.licenseType;
    let support_youtube = req.body.support_youtube == "true";
    let support_twitch = req.body.support_twitch == "true";
    let nsfw = req.body.nsfw == "true";

    try {

        let assetCheck = await knex("assets").where({id: assetId}).select(["id", "added_by"]).limit(1);
        if (!assetCheck[0]) {
            return res.status(404).json({success: false, msg: "Asset not found"});
        }

        if (assetCheck[0].added_by != req.user.id && req.user.level != -1) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        let renderedDescription = await marked.markAndSanitize(description);
        let shouldCompress = description && renderedDescription.length > 1000;
        if (shouldCompress) {
            description = textHelpers.CompressString(description, true).text;
            renderedDescription = textHelpers.CompressString(renderedDescription, true).text;
            if (legalText) {
                legalText = textHelpers.CompressString(legalText, true).text;
            }
        }

        await knex("assets").where({id: assetCheck[0].id}).limit(1).update({
            name,
            type: assetType,
            tags,
            nsfw,
            price,
            updated_at: new Date()
        });

        await knex("asset_infos").where({id: assetCheck[0].id}).limit(1).update({
            description,
            rendered_description: renderedDescription,
            legal_information: legalText,
            compression: shouldCompress ? "gzip" : "none",
            license: licenseType,
            source,
            videos: support_youtube,
            streams: support_twitch
        })

        return res.status(200).json({success: true, redirect: `/assets/v/${assetCheck[0].id}`})

    } catch (e) {
        return next(e);
    }

})

router.get("/list", async (req, res, next) => {
    try {
        let start = Date.now();
        let search = req.query.q;
        let skip = req.query.skip || 0;
        let type = req.query.type;
        let ref = req.query.ref;
        let id = req.query.id;
        let batch = req.query.batch;
        let checkID = req.query.checkId == "true";

        if (Number.isNaN(skip) || skip < 0) {
            skip = 0;
        }
        let limit = req.query.limit || 50;
        if (Number.isNaN(limit) || limit < 0 || limit > 200) {
            limit = 50;
        }
        if (type && !assetHelpers.assetTypes.includes(type)) {
            type = null;
        }
        if (typeof ref !== "undefined" && Number.isNaN(ref)) {
            ref = undefined;
        }
        if (id) {
            limit = 1;
        }

        let assetQuery;

        if (type && type == "fav" && typeof ref != "undefined") {
            // TODO: check if likes are public
            assetQuery = knex("asset_likes").where({"asset_likes.user": ref})
                .innerJoin("assets", "assets.id", "=", "asset_likes.asset")
                .innerJoin("users", "users.id", "=", "assets.added_by")
                .offset(skip).limit(limit).select([
                    "assets.id", "assets.name", "assets.type", "assets.tags", "assets.created_at",
                    "users.id as author_id", "users.name as author_name", "users.username as author_username", "users.display_name as author_display_name", "users.profile_image_url as author_image",
                    "asset_likes.created_at as like_creation"
                ])
        } else {
            assetQuery = knex("assets").innerJoin("users", "users.id", "=", "assets.added_by").leftOuterJoin("asset_likes", "asset_likes.asset", "=", "assets.id").offset(skip).limit(limit).select([
                "assets.id", "assets.name", "assets.type", "assets.tags", "assets.created_at",
                "users.id as author_id", "users.name as author_name", "users.username as author_username", "users.display_name as author_display_name", "users.profile_image_url as author_image",
                "asset_likes.asset as like_id", "asset_likes.created_at as like_creation"
            ])
        }

        if (id) {
            assetQuery.where({"assets.id": id})
        }
        if (batch) {
            assetQuery.where({"assets.batch": batch})
        }

        if (search) {
            assetQuery.whereILike("assets.name", `%${search}%`)
                .orWhereILike("assets.tags", `%${search}%`)
                .orderBy("assets.name", "asc")
            if (checkID) {
                assetQuery.orWhereILike("assets.id", `%${search}%`)
            }
        } else {
            assetQuery.orderBy("assets.created_at", "desc")
        }

        if (type) {
            if (type == "user" && typeof ref !== "undefined") {
                assetQuery.where({"users.id": ref})
            } else if (type != "fav") {
                assetQuery.where({"assets.type": type});
            }
        }

        assetQuery.then((assets) => {
            return res.status(200).json({success: true, items: assets.map(x => ({
                ...x,
                liked: type == "fav" || x.like_id != null,
                is_author: x.author_id == req.user.id
            })), duration: Date.now() - start, reachedEnd: assets.length < limit});
        }).catch((err) => {
            return next(err);
        })


    } catch (e) {
        return next(e);
    }
})

router.get("/info/:id", async (req, res, next) => {
    try {

        let type = req.query.type || "none";

        if (type == "none") {
            let asset = await knex("assets").where({"assets.id": req.params.id})
            .innerJoin("batches", "batches.id", "=", "assets.batch")
            .limit(1).select([
                "assets.id", "assets.name", "assets.type", "assets.tags", "assets.created_at", "assets.extension",
                "batches.name as batch_name", "batches.id as batch_id", "batches.type as batch_type", "batches.image_url as batch_image_url", "batches.artist as batch_artist"
            ])
    
            if (!asset[0]) {
                return next();
            }
    
            return res.status(200).json({success: true, asset: asset[0]});
        } else if (type == "content") {
            let asset = await knex("assets").where({id: req.params.id, type: "text"}).select(["id", "path"]);
            if (!asset[0]) {
                return next();
            }

            let filePath = path.join(paths.uploads, asset[0].path);
            if (!fs.existsSync(filePath)) {
                return next();
            }

            let content = fs.readFileSync(filePath, "utf-8");
            content = marked.sanitizeFull(content);
            return res.status(200).json({success: true, content});
        }


    } catch (e) {
        return next(e);
    }
})

router.post("/like", async (req, res, next) => {
    let assetId = req.body.asset;
    if (!assetId) {
        return res.status(400).json({success: false, msg: "Asset required"});
    }
    try {
        let assetCheck = await knex("assets").where({id: assetId}).select("id").limit(1);
        if (!assetCheck[0]) {
            return next();
        }

        let isLiked = false;

        let isLikedCheck = await knex("asset_likes").where({user: req.user.id, asset: assetId}).limit(1);
        if (!isLikedCheck[0]) { // Like the asset
            await knex("asset_likes").insert({asset: assetId, user: req.user.id});
            await knex("asset_infos").where({id: assetId}).increment("favorites", 1);
            isLiked = true;
        } else { // Un-like the asset
            await knex("asset_likes").where({asset: assetId, user: req.user.id}).delete();
            await knex("asset_infos").where({id: assetId}).decrement("favorites", 1);
        }

        return res.status(200).json({success: true, isLiked});
    } catch (e) {
        return next(e);
    }
})

router.get("/isLiked/:id", async (req, res, next) => {
    let assetId = req.params.id;
    if (!assetId) {
        return res.status(400).json({success: false, msg: "Asset required"});
    }
    try {
        let assetCheck = await knex("assets").where({id: assetId}).select("id").limit(1);
        if (!assetCheck[0]) {
            return next();
        }

        let isLikedCheck = await knex("asset_likes").where({user: req.user.id, asset: assetId}).limit(1);
        return res.status(200).json({success: true, isLiked: isLikedCheck[0] != undefined, when: isLikedCheck[0] ? isLikedCheck[0].created_at : null});
    } catch (e) {
        return next(e);
    }
})

router.post("/delete", async (req, res, next) => {
    let assetId = req.body.asset;
    if (!assetId) {
        return res.status(400).json({success: false, msg: "Asset required"});
    }

    try {

        // Check asset ownership
        let query = {id: assetId};
        if (req.user.level !== -1) {
            query["added_by"] = req.user.id;
        }
        let asset = await knex("assets").where(query).limit(1);
        if (!asset[0]) {
            return res.status(404).json({success: false, msg: "Asset not found"});
        }

        let batchId = asset[0].batch;

        // Delete asset and file
        let assetPath = path.join(paths.uploads, asset[0].path);
        if (fs.existsSync(assetPath)) {
            fs.unlinkSync(assetPath);
        }

        await knex("assets").where({id: assetId}).delete();

        // Delete asset comments
        await knex("comments").where({target: `A-${assetId}`}).delete();

        // Update asset batch asset count
        let batchUpdate = await knex("batches").where({id: batchId}).decrement("asset_count", 1).returning(["id", "asset_count"]);
        if (batchUpdate[0].asset_count <= 0) {
            // Delete empty batch
            await knex("batches").where({id: batchId}).delete();

            // TODO: Delete batch album cover

            // Delete batch comments
            await knex("comments").where({target: `B-${batchId}`}).delete();

            return res.status(200).json({success: true, hasBatch: false});
        }

        return res.status(200).json({success: true, hasBatch: true});
        

    } catch (e) {
        return next(e);
    }
})

router.post("/rename", async (req, res, next) => {
    let asset = req.body.asset;
    let name = req.body.name;
    if (!asset) {
        return res.status(400).json({success: false, msg: "Asset not found"});
    }
    if (!name || name.length >= 255) {
        return res.status(400).json({success: false, msg: "Invalid name"});
    }
    try {
        let hasAccess = await HasAccessToAsset(req.user, asset);
        if (!hasAccess) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }
        let updated = await knex("assets").where({id: hasAccess.id}).limit(1).update({name, updated_at: new Date()}, "name");
        if (!updated[0]) {
            return res.status(500).json({success: false, msg: "Nothing changed"});
        }
        return res.status(200).json({success: true, name: updated[0].name});
    } catch (e) {
        return next(e);
    }
})

module.exports = router;
