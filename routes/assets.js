const router = require('express').Router();
const { knex } = require('../modules/database');
const assetHelpers = require('../modules/assetHelpers');
const paths = require('../modules/paths');
const path = require("path");
const fs = require("fs");
const { FormatFileName, UnzipString } = require('../modules/textHelpers');
const { GetCachedNumber } = require('../modules/numberCache');

const TYPES = ["music", "effect", "image", "video", "user", "fav"];

router.get("/", async (req, res, next) => {
    try {
        let q = req.query.q;
        let type = req.query.type;

        let assetCount = await GetCachedNumber("asset_count", async () => {
            let newCount = await knex("assets").count("id as CNT");
            return newCount[0].CNT;
        })

        let totalSize = await GetCachedNumber("asset_size", async () => {
            let total = await knex("assets").sum("size");
            return Number.parseInt(total[0].sum || "0");
        })
        

        if (!TYPES.includes(type)) {
            type = null;
        }

        res.render("assets/index", {
            title: "Assets",
            asset_count: assetCount,
            search: q,
            type,
            totalSize
        })
    } catch (e) {
        return next(e);
    }
})

router.get("/add", async (req, res, next) => {
    try {
        let channelId = req.query.channel;
        
        if (!channelId || (channelId == "GLOBAL" && req.user.level != -1)) {
            return res.render("assets/add", {
                title: "Upload asset",
                fileTypes: assetHelpers.fileTypes,
                assetTypes: assetHelpers.assetTypes,
                licenseTypes: assetHelpers.licenseTypes
            })
        }

        if (req.user.level != -1) {
            let accessCheck = await knex("channel_members").where({channel: channelId, user: req.user.id}).limit(1)
                .innerJoin("channels", "channels.id", "=", "channel_members.channel")
                .select(["channels.id", "channels.name"]);
            if (!accessCheck[0]) {
                return next();
            }

            return res.render("assets/add", {
                title: "Upload asset",
                fileTypes: assetHelpers.fileTypes,
                assetTypes: assetHelpers.assetTypes,
                licenseTypes: assetHelpers.licenseTypes,
                channel: accessCheck[0]
            })
        } else if (channelId == "GLOBAL") {
            return res.render("assets/add", {
                title: "Upload asset",
                fileTypes: assetHelpers.fileTypes,
                assetTypes: assetHelpers.assetTypes,
                licenseTypes: assetHelpers.licenseTypes,
                channel: "GLOBAL"
            })
        }

        let channel = await knex("channels").where({id: channelId}).limit(1).select(["name", "id"]);
        if (!channel[0]) {
            return next();
        }

        return res.render("assets/add", {
            title: "Upload asset",
            fileTypes: assetHelpers.fileTypes,
            assetTypes: assetHelpers.assetTypes,
            licenseTypes: assetHelpers.licenseTypes,
            channel: channel[0]
        })

    } catch (e) {
        return next(e);
    }
})

router.get("/get/:id", async (req, res, next) => {
    try {

        let asset = await knex("assets").where({id: req.params.id}).limit(1).select(["id", "path"]);
        if (!asset[0]) {
            return next();
        }

        let assetFilePath = path.join(paths.uploads, asset[0].path);
        if (!fs.existsSync(assetFilePath)) {
            return next();
        }

        return res.sendFile(assetFilePath);

    } catch (e) {
        return next(e);
    }
})

router.get("/download/:id", async (req, res, next) => {
    try {

        let asset = await knex("assets")
            .innerJoin("asset_infos", "asset_infos.id", "=", "assets.id")
            .where({"assets.id": req.params.id}).limit(1)
            .select(["assets.id", "assets.path", "assets.size", "assets.extension", "asset_infos.mime", "assets.name"]);
        if (!asset[0]) {
            return next();
        }

        let assetFilePath = path.join(paths.uploads, asset[0].path);
        if (!fs.existsSync(assetFilePath)) {
            return next();
        }

        await knex("asset_infos").where({id: asset[0].id}).limit(1).increment("downloads", 1);

        await assetHelpers.TriggerDownload(asset[0].id, req.user.id);

        res.setHeader('Content-disposition', 'attachment; filename=' + FormatFileName(asset[0].name + asset[0].extension));
        res.setHeader('Content-type', asset[0].mime);
        res.setHeader('Content-length', asset[0].size);

        let stream = fs.createReadStream(assetFilePath);
        stream.pipe(res);


    } catch (e) {
        return next(e);
    }
})

const VIEWS = ["videos", "comments", "references"];

router.get("/v/:id", async (req, res, next) => {
    try {

        let view = req.query.view;
        if (!VIEWS.includes(view)) {
            view = VIEWS[0];
        }

        let asset = await knex("assets").where({"assets.id": req.params.id})
            .innerJoin("asset_infos", "asset_infos.id", "=", "assets.id")
            .innerJoin("users", "users.id", "=", "assets.added_by")
            .innerJoin("batches", "batches.id", "=", "assets.batch")
            .limit(1)
            .select([
                "assets.*",
                "asset_infos.*",
                "users.id as author_id", "users.username as author_username", "users.display_name as author_display_name", "users.profile_image_url as author_image_url",
                "batches.name as batch_name"
            ]);
        if (!asset[0]) {
            return next();
        }
        

        asset[0].description = UnzipString(asset[0].description, asset[0].compression);
        asset[0].rendered_description = UnzipString(asset[0].rendered_description, asset[0].compression);
        asset[0].legal_information = assetHelpers.ParseLegalText(UnzipString(asset[0].legal_information, asset[0].compression), asset[0]);
        
        let channel;
        if (asset[0].resource_id && asset[0].resource_id != "GLOBAL") {
            let channelCheck = await knex("channels").where({id: asset[0].resource_id}).limit(1).select(["name", "id"]);
            if (channelCheck[0]) {
                channel = channelCheck[0];
            }
        }

        let commentCount = await GetCachedNumber(`A:${asset[0].id}-comment_count`, async () => {
            let newCount = await knex("comments").where({target: `A:${asset[0].id}`}).count("id as CNT");
            return newCount[0].CNT;
        })

        const channels = await knex("channel_members").where({user: req.user.id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select(["channels.id", "channels.name"])

        const downloadCount = await knex("downloads").where({asset: asset[0].id}).select("count").limit(1);

        res.render("assets/view", {
            title: asset[0].name,
            asset: asset[0],
            isAuthor: asset[0].added_by == req.user.id,
            view,
            licenseTypes: assetHelpers.licenseTypes,
            channel: channel ? channel : asset[0].resource_id == "GLOBAL" ? "GLOBAL" : null,
            commentCount,
            channels,
            downloadCount: downloadCount[0] ? downloadCount[0].count : -1
        })
    } catch (e) {
        return next(e);
    }
})

router.get("/random", async (req, res, next) => {
    try {

        let type = req.query.option;
        let assetType = req.query.type;
        if (!assetHelpers.assetTypes.includes(assetType) && assetType != "musicAndEffects") {
            assetType = null;
        }

        let assetCount = await GetCachedNumber("asset_count", async () => {
            let newCount = await knex("assets").count("id as CNT");
            return newCount[0].CNT;
        })

        if (assetCount <= 0) {
            return next();
        }

        let query = {};
        if (assetType && assetType != "musicAndEffects") {
            query["type"] = assetType;
        }

        let potentialLength = knex("assets").where(query).count("id as CNT");
        if (assetType && assetType == "musicAndEffects") {
            potentialLength.where((f) => {
                f.where({type: "music"}).orWhere({type: "soundEffect"})
            })
        }

        potentialLength.then(async (length) => {

            let assetRes = knex("assets").where(query).select("id").offset(Math.floor(Math.random() * length[0].CNT)).limit(1);
            if (assetType && assetType == "musicAndEffects") {
                assetRes.where((f) => {
                    f.where({type: "music"}).orWhere({type: "soundEffect"})
                })
            }

            assetRes.then((asset) => {
                if (!asset[0]) {
                    return next();
                }
        
                if (!type) {
                    return res.redirect(`/assets/v/${asset[0].id}`);
                } else if (type == "get") {
                    return res.redirect(`/assets/get/${asset[0].id}`);
                } else if (type == "download") {
                    return res.redirect(`/assets/download/${asset[0].id}`);
                } else if (type == "info") {
                    return res.redirect(`/api/assets/info/${asset[0].id}`);
                } else {
                    return next();
                }
            }).catch(e => {
                return next(e);
            })

            }).catch(e => {
                return next(e);
            })
        
    } catch (e) {
        return next(e);
    }
})

router.get("/edit/:id", async (req, res, next) => {
    try {

        let asset = await knex("assets").where({"assets.id": req.params.id})
            .innerJoin("asset_infos", "asset_infos.id", "=", "assets.id")
            .select([
                "assets.*",
                "asset_infos.description", "asset_infos.legal_information", "asset_infos.compression",
                "asset_infos.source", "asset_infos.license", "asset_infos.videos", "asset_infos.streams", "asset_infos.original_name"
            ])

        if (!asset[0]) {
            return next();
        }

        if (asset[0].added_by != req.user.id && req.user.level !== -1) {
            return res.redirect(`/assets/v/${asset[0].id}`);
        }

        asset[0].description = UnzipString(asset[0].description, asset[0].compression);
        asset[0].legal_information = UnzipString(asset[0].legal_information, asset[0].compression);

        res.render("assets/add", {
            title: `Edit ${asset[0].name}`,
            asset: asset[0],
            fileTypes: assetHelpers.fileTypes,
            assetTypes: assetHelpers.assetTypes,
            licenseTypes: assetHelpers.licenseTypes
        })

    } catch (e) {
        return next(e);
    }
})

router.use("/batches", require('./batches'));
router.use("/playlists", require('./playlists'));

module.exports = router;
