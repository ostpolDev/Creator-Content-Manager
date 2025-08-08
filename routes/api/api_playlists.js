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

router.get("/list", async (req, res, next) => {
    let search = req.query.q;
    let skip = req.query.skip || 0;
    let id = req.query.id;
    let limit = req.query.limit || 50;

    if (Number.isNaN(skip) || skip < 0) {
        skip = 0;
    }
    if (Number.isNaN(limit) || limit < 0 || limit > 200) {
        limit = 50;
    }
    if (id) {
        limit = 1;
    }

    try {

        let playlistQuery = knex("playlist_users").where({"playlist_users.user_id": req.user.id})
            .innerJoin("playlists", "playlists.id", "=", "playlist_users.id")
            .innerJoin("users", "users.id", "=", "playlists.author_id")
            .offset(skip).limit(limit).orderBy("created_at", "desc").select([
                "playlists.id", "playlists.title", "playlists.public", "playlists.created_at", "playlists.asset_count",
                "users.id as author_id", "users.username as author_username", "users.display_name as author_display_name",
                "playlist_users.type as access_type"
            ])

        if (search) {
            playlistQuery.whereILike("playlists.title", `%${search}%`);
        }

        playlistQuery.then((playlists) => {
            return res.status(200).json({success: true, playlists: playlists.map(x => ({
                ...x,
                is_author: x.author_id == req.user.id
            })), reachedEnd: playlists.length < limit});
        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
