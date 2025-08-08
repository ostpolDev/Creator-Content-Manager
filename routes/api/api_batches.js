const router = require('express').Router();
const { knex } = require('../../modules/database');
const path = require('path');
const paths = require('../../modules/paths');
const fs = require('fs');

const TYPES = ["batch", "single", "album"]

router.get("/list", async (req, res, next) => {
    try {

        let start = Date.now();
        let search = req.query.q;
        let skip = req.query.skip || 0;
        let type = req.query.type;
        let id = req.query.id;
        let limit = req.query.limit || 50;

        if (Number.isNaN(skip) || skip < 0) {
            skip = 0;
        }
        if (Number.isNaN(limit) || limit < 0 || limit > 200) {
            limit = 50;
        }
        if (!TYPES.includes(type)) {
            type = null;
        }
        if (id) {
            limit = 1;
        }

        let batchesQuery = knex("batches").where({"batches.is_resource_batch": false})
            .innerJoin("users", "users.id", "=", "batches.added_by")
            .offset(skip).limit(limit).orderBy("created_at", "desc").select([
                "batches.id", "batches.name", "batches.type", "batches.asset_count", 
                "batches.created_at", "batches.artist", "batches.image_url",
                "users.id as author_id", "users.name as author_name", "users.username as author_username", 
                "users.display_name as author_display_name", "users.profile_image_url as author_image"
            ])

        if (id) {
            batchesQuery.where({"batches.id": id});
        }
        if (search) {
            batchesQuery.whereILike("batches.name", `%${search}%`);
        }
        if (type) {
            if (type != "single") {
                batchesQuery.where({"batches.type": type});
                if (!search) {
                    batchesQuery.where("batches.asset_count", ">", 1)
                }
            }
        } else if (!search) {
            batchesQuery.where("batches.asset_count", ">", 1);
        }

        batchesQuery.then((batches) => {
            return res.status(200).json({success: true, items: batches.map(x => ({
                ...x,
                is_author: x.author_id == req.user.id
            })), duration: Date.now() - start, reachedEnd: batches.length < limit});
        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

router.post("/cover", async (req, res, next) => {
    let batchId = req.body.batch;
    if (!batchId) {
        return res.status(400).json({success: false, msg: "Batch missing"});
    }

    if (!req.files || !req.files.cover) {
        return res.status(400).json({success: false, msg: "Cover image missing"});
    }

    if (Array.isArray(req.files.cover)) {
        return res.status(400).json({success: false, msg: "Too many files"});
    }

    let name = req.body.name;
    if (name && name.length >= 255) {
        name = null;
    }

    try {

        let batchCheck = await knex("batches").where({id: batchId}).limit(1).select(["id", "added_by"]);
        if (!batchCheck[0]) {
            return res.status(404).json({success: false, msg: "Batch not found"});
        }

        if (batchCheck[0].added_by != req.user.id && req.user.level != -1) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        let fileName = `${batchCheck[0].id}.webp`;
        let targetFileDest = path.join(paths.covers, fileName);
        req.files.cover.mv(targetFileDest);

        await knex("batches").where({id: batchCheck[0].id}).limit(1).update({
            updated_at: new Date(),
            image_url: `/assets/batches/cover/${batchCheck[0].id}`,
            original_image_name: name || req.files.cover.name
        })

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.post("/cover/remove", async (req, res, next) => {
    let batchId = req.body.batch;
    if (!batchId) {
        return res.status(400).json({success: false, msg: "Batch required"});
    }

    try {

        let batch = await knex("batches").where({id: batchId}).limit(1).select(["id", "added_by"]);
        if (!batch[0]) {
            return res.status(404).json({success: false, msg: "Batch not found"});
        }

        if (batch[0].added_by != req.user.id && req.user.level != -1) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        let coverPath = path.join(paths.covers, `${batch[0].id}.webp`);
        if (fs.existsSync(coverPath)) {
            fs.unlinkSync(coverPath);
        }

        await knex("batches").where({id: batch[0].id}).limit(1).update({
            updated_at: new Date(),
            image_url: null,
            original_image_name: null
        });

        return res.status(200).json({success: true})

    } catch (e) {
        return next(e);
    }
})

router.post("/edit/:id", async (req, res, next) => {
    let name = req.body.name;
    let type = req.body.type;

    if (!TYPES.includes(type)) {
        return res.status(400).json({success: false, msg: [
            {msg: "Invalid type", field: "type"}
        ]});
    }

    if (name && name.length > 255) {
        return res.status(400).json({success: false, msg: [
            {msg: "Name too long", field: "name"}
        ]});
    }

    try {

        let batch = await knex("batches").where({id: req.params.id}).limit(1).select(["id", "added_by"]);
        if (!batch[0]) {
            return next();
        }

        if (batch[0].added_by != req.user.id && req.user.level != -1) {
            return res.status(400).json({success: false, msg: "Access denied", redirect: "/"});
        }

        await knex("batches").where({id: batch[0].id}).limit(1).update({
            updated_at: new Date(),
            name: name || batch[0].id,
            type
        })

        return res.status(200).json({success: true, redirect: `/assets/batches/v/${batch[0].id}`});

    } catch (e) {
        return next(e);
    }
})

router.post("/delete", async (req, res, next) => {
    let batchId = req.body.batch;
    if (!batchId) {
        return res.status(400).json({success: false, msg: "Batch required"});
    }

    try {

        let batch = await knex("batches").where({id: batchId}).limit(1).select(["id", "added_by"]);
        if (!batch[0]) {
            return res.status(404).json({success: false, msg: "Batch not found"});
        }

        if (batch[0].added_by != req.user.id && req.user.level != -1) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        let assets = await knex("assets").where({batch: batch[0].id}).select(["id", "path"]);
        assets.forEach(asset => {
            let assetPath = path.join(paths.uploads, asset.path);
            if (fs.existsSync(assetPath)) {
                fs.unlinkSync(assetPath);
            }
        })

        // Delete cover image
        let coverPath = path.join(paths.covers, `${batch.id}.webp`);
        if (fs.existsSync(coverPath)) {
            fs.unlinkSync(coverPath);
        }

        // Delete assets
        await knex("assets").where({batch: batch[0].id}).delete();

        // Delete comments
        await knex("comments").whereIn("target", [
            ...assets.map(x => `A-${x.id}`),
            `B-${batch[0].id}`
        ]).delete();

        // Delete batch
        await knex("batches").where({id: batch[0].id}).delete();

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.get("/all/:id", async (req, res, next) => {
    const id = req.params.id;
    try {

        const ids = (await knex("assets").where({batch: id}).select("id")).map(x => x.id);
        
        res.set('Cache-Control', 'public, max-age=512');
        return res.status(200).json({success: true, assets: ids});

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
