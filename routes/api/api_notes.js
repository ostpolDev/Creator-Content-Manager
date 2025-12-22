const router = require('express').Router();
const { CompressString, UnzipString } = require('../../modules/textHelpers');
const { knex } = require('../../modules/database');

router.post("/create", async (req, res, next) => {
    const asset = req.body.asset;
    const content = req.body.content;
    const title = req.body.title;

    if (!asset) {
        return res.status(400).json({success: false, msg: "Asset required"});
    }

    if (!content) {
        return res.status(400).json({success: false, msg: "Content required"});
    }

    if (title && title.length > 255) {
        return res.status(400).json({success: false, msg: "Content cannot be longer than 255 characters"});
    }

    if (content.length > 2048) {
        return res.status(400).json({success: false, msg: "Content cannot be longer than 2048 characters"});
    }

    try {

        const assetCheck = await knex("assets").where({id: asset}).select("id").limit(1);
        if (!assetCheck[0]) {
            return res.status(404).json({success: false, msg: "Asset not found"});
        }

        const zipped = CompressString(content);

        const preview = `${content.trim().replace(/[\n\r]/g, " ").substring(0, 64)}...`;
        
        const note = await knex("notes").insert({
            title,
            content: zipped.text,
            compression: zipped.compression,
            preview,
            author: req.user.id
        }, "id");

        if (!note[0]) {
            return res.status(500).json({success: false, msg: "Failed to create note"});
        }

        const assetNote = await knex("asset_notes").insert({note_id: note[0].id, asset_id: assetCheck[0].id}, "id");
        if (!assetNote[0]) {
            await knex("notes").where({id: note[0].id}).delete().limit(1);
            return res.status(500).json({success: false, msg: "Failed to link note to asset"});
        }

        return res.status(200).json({success: true, note: note[0].id});

    } catch (e) {
        return next(e);
    }

})

router.get("/list", async (req, res, next) => {
    let asset = req.query.asset;
    let limit = req.query.limit;
    let skip = req.query.skip;

    if (isNaN(limit)) {
        limit = 50;
    } else {
        limit = parseInt(limit);
    }

    if (isNaN(skip)) {
        skip = 0;
    } else {
        skip = parseInt(skip);
    }

    if (limit < 0 || limit > 100) {
        limit = 50;
    }

    if (skip < 0 || skip > Number.MAX_SAFE_INTEGER) {
        skip = 0;
    }

    try {

        if (asset) {
            const assetCheck = await knex("assets").where({id: asset}).limit(1).select("id");
            if (!assetCheck[0]) {
                return res.status(404).json({success: false, msg: "Asset not found"});
            }

            const notes = await knex("asset_notes").where({"asset_notes.asset_id": assetCheck[0].id, "notes.author": req.user.id})
                .innerJoin("notes", "notes.id", "=", "asset_notes.note_id")
                .limit(limit).offset(skip).orderBy("created_at", "asc")
                .select([
                    "notes.title", "notes.created_at", "notes.updated_at", "notes.preview"
                ]);
            
            return res.status(200).json({success: true, notes, reachedEnd: notes.length < limit});
        } else {

            const notes = await knex("notes").where({"notes.author": req.user.id})
                .limit(limit).offset(offset).orderBy("created_at", "asc")
                .select([
                    "notes.title", "notes.created_at", "notes.updated_at", "notes.preview"
                ]);

            return res.status(200).json({success: true, notes, reachedEnd: notes.length < limit});

        }

    } catch (e) {
        return next(e);
    }
})

router.get("/get/:id", async (req, res, next) => {
    const id = req.params.id;

    try {

        const note = await knex("notes").where({id, author: req.user.id}).limit(1);
        if (!note[0]) {
            return res.status(404).json({success: false, msg: "Note not found"});
        }

        const unzipped = UnzipString(note[0].content, note[0].compression);

        return res.status(200).json({success: true, note: {
            ...note[0],
            content: unzipped
        }})

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
