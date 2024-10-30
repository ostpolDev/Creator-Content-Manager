const router = require('express').Router();
const { knex } = require('../modules/database');
const { GetCachedNumber } = require('../modules/numberCache');
const { UnzipString } = require('../modules/textHelpers');
const path = require('path');
const paths = require('../modules/paths');
const fs = require('fs');
const archiver = require('archiver');
const { randomUUID } = require('crypto');
const logger = require('../modules/logger');
const { TriggerMassDownload, ParseLegalText, licenseTypes } = require('../modules/assetHelpers');

const TYPES = ["batch", "album", "single"];

router.get("/", async (req, res, next) => {
    try {
        let q = req.query.q;
        let type = req.query.type;

        let batchCount = await GetCachedNumber("batch_count", async () => {
            let newCount = await knex("batches").where("asset_count", ">", 1).count("id as CNT");
            return newCount[0].CNT;
        })

        if (!TYPES.includes(type)) {
            type = null;
        }

        res.render("batches/index", {
            title: "Batches",
            batch_count: batchCount,
            search: q,
            type,
            types: TYPES
        })
    } catch (e) {
        return next(e);
    }
})

const VIEWS = ["assets", "comments", "description"];

router.get("/v/:id", async (req, res, next) => {
    try {

        let view = req.query.view;
        if (!VIEWS.includes(view)) {
            view = VIEWS[0];
        }

        let batch = await knex("batches").where({id: req.params.id}).limit(1);

        if (!batch[0]) {
            return next();
        }

        let select = [
            "assets.id", "assets.name", "assets.added_by", "asset_infos.legal_information", "asset_infos.compression", "assets.tags", "asset_infos.license",
            "users.id as author_id", "users.username as author_username", "users.display_name as author_display_name", "users.profile_image_url as author_image"
        ]

        if (view == "description") {
            select.push("asset_infos.rendered_description");
        }

        let assetInBatch = await knex("assets").where({batch: batch[0].id})
        .innerJoin("users", "users.id", "=", "assets.added_by")
        .innerJoin("asset_infos", "asset_infos.id", "=", "assets.id")
        .limit(1).select(select)

        if (assetInBatch[0]) {
            if (assetInBatch[0].legal_information) {
                assetInBatch[0].legal_information = ParseLegalText(await UnzipString(assetInBatch[0].legal_information, assetInBatch[0].compression), assetInBatch[0]);
            }
            if (assetInBatch[0].rendered_description) {
                assetInBatch[0].rendered_description = await UnzipString(assetInBatch[0].rendered_description, assetInBatch[0].compression);
            }
        }

        res.render("batches/view", {
            title: batch[0].name,
            batch: batch[0],
            firstAsset: assetInBatch[0],
            isAuthor: assetInBatch[0].author_id == req.user.id,
            view,
            licenseTypes
        })

    } catch (e) {
        return next(e);
    }
})

router.get("/edit/:id", async (req, res, next) => {
    try {

        let batch = await knex("batches").where({id: req.params.id}).limit(1);
        if (!batch[0]) {
            return next();
        }

        if (batch[0].added_by != req.user.id && req.user.level != -1) {
            return next();
        }

        res.render("batches/edit", {
            title: `Edit ${batch[0].name}`,
            batch: batch[0],
            types: TYPES
        });

    } catch (e) {
        return next(e);
    }
})

router.get("/cover/:id", (req, res, next) => {
    let safeId = paths.MakeSafe(req.params.id);
    let targetPath = path.join(paths.covers, `${safeId}.webp`);
    if (!fs.existsSync(targetPath)) {
        return res.status(404).send();
    }
    res.set('Cache-Control', 'public, max-age=30');
    return res.sendFile(targetPath);
})

router.get("/download/:id", async (req, res, next) => {
    let batchId = req.params.id;
    try {

        let batch = await knex("batches").where({id: batchId}).limit(1).select(["id", "name"]);
        if (!batch[0]) {
            return next();
        }

        let assets = await knex("assets").where({batch: batch[0].id}).select(["id", "path", "name", "extension"]);
        if (assets.length <= 0) {
            return next();
        }

        let outputPath = path.join(paths.tmp, `${randomUUID()}.zip`);
        let outputStream = fs.createWriteStream(outputPath);
        let archive = archiver("zip");

        outputStream.on("close", async () => {
            logger.info(`Created batch archive with ${archive.pointer()} bytes`);

            let assetIds = assets.map(x => x.id);
            await knex("asset_infos").whereIn("id", assetIds).increment("downloads", 1);
            await TriggerMassDownload(assetIds, req.user.id);

            res.setHeader('Content-disposition', 'attachment; filename=' + paths.MakeSafeFile(`${batch[0].name}.zip`));
            res.setHeader('Content-type', "application/zip");
            res.setHeader('Content-length', archive.pointer());

            let readStream = fs.createReadStream(outputPath);
            readStream.pipe(res).on("finish", () => {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            })

        })

        archive.on("error", (err) => {
            return next(err);
        })
        archive.pipe(outputStream);
        assets.forEach(asset => {
            let assetPath = path.join(paths.uploads, asset.path);
            if (fs.existsSync(assetPath)) {
                archive.file(assetPath, {name: paths.MakeSafeFile(asset.name + asset.extension)});
            }
        })
        archive.finalize();

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
