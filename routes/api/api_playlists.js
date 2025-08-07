const router = require('express').Router();
const { knex } = require('../../modules/database');
const { markAndSanitize } = require('../../modules/marked');
const { CompressString, UnzipString } = require('../../modules/textHelpers')

router.post("/add", async (req, res, next) => {
    const name = req.body.name;
    const isPublic = req.body.public == true;
    const description = req.body.description;

    if (!name || typeof name !== "string" || name.length > 128) {
        return res.status(400).json({success: false, msg: "Invalid name"});
    }

    if (description && description.length > 2048) {
        return res.status(400).json({success: false, msg: "Description too long (max. 2048)"});
    }

    try {

        const rendered_description = await markAndSanitize(description);

        const descCompResult = CompressString(description, true);
        const renderedCompResult = CompressString(rendered_description, true);

        const createResult = await knex("playlists").insert({
            title: name,
            author_id: req.user.id,
            description: descCompResult.text,
            rendered_description: renderedCompResult.text,
            compression: renderedCompResult.compression,
            public: isPublic
        }, "id");

        if (!createResult[0]) {
            return res.status(500).json({success: false, msg: "Failed to create playlist"});
        }

        const memberResult = await knex("playlist_users").insert({
            id: createResult[0].id,
            user_id: req.user.id,
            type: 5
        }, "*")

        if (!memberResult[0]) {
            throw new Error("Failed to create playlist member");
        }

        return res.status(200).json({success: true, playlist: createResult[0].id});

    } catch (e) {
        return next(e);
    }

})

module.exports = router;
