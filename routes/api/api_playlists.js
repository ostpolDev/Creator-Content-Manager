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
            description: descCompResult ? descCompResult.text : null,
            rendered_description: renderedCompResult ? renderedCompResult.text : null,
            compression: renderedCompResult ? renderedCompResult.compression : "none",
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
    let batch = req.query.batch;
    let asset = req.query.asset;

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

        if (id) {
            playlistQuery.where({"playlists.id": id});
        }

        playlistQuery.then(async (playlists) => {

            const playlistIds = playlists.map(x => x.id);            

            if (asset) {
                const assetCheck = await knex("playlist_assets").whereIn("playlist_id", playlistIds).andWhere({asset_id: asset});
                for (let i = 0; i < playlists.length; i++) {
                    playlists[i].is_included = assetCheck.findIndex(x => x.playlist_id == playlists[i].id) !== -1;
                }

            } else if (batch) {                
                const assetCheck = await knex("playlist_assets").whereIn("playlist_id", playlistIds).andWhere({"assets.batch": batch})
                    .innerJoin("assets", "assets.id", "=", "playlist_assets.asset_id")
                    .select("playlist_assets.playlist_id");
                
                for (let i = 0; i < playlists.length; i++) {
                    playlists[i].is_included = assetCheck.findIndex(x => x.playlist_id == playlists[i].id) !== -1;
                }
            }

            return res.status(200).json({success: true, playlists: playlists.map(x => ({
                ...x,
                is_author: x.author_id == req.user.id
            })), reachedEnd: playlists.length < limit, asset, batch: asset ? "ignored" : batch});

        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

router.get("/members/:id", async (req, res, next) => {
    const playlistId = req.params.id;

    let limit = req.query.limit;
    let skip = req.query.skip;
    
    if (typeof skip === "undefined" || Number.isNaN(skip) || skip < 0) {
        skip = 0;
    }
    if (typeof limit === "undefined" || Number.isNaN(limit) || limit <= 0 || limit > 200) {
        limit = 50;
    }

    try {

        const accessCheck = await knex("playlist_users").where({id: playlistId, user_id: req.user.id}).andWhere("type", ">", 0);
        if (!accessCheck[0]) {
            return next();
        }

        const users = await knex("playlist_users").where({"playlist_users.id": playlistId})
            .innerJoin("users", "users.id", "=", "playlist_users.user_id")
            .offset(skip).limit(limit)
            .orderBy("playlist_users.type", "desc")
            .select([
                "users.id", "users.username", "users.display_name", "users.profile_image_url", "playlist_users.type as access_level"
            ])

        return res.status(200).json({
            success: true,
            items: users.map(x => ({
                ...x,
                isAuthor: x.access_level == 5,
                canRemove: x.access_level != 5 && accessCheck[0].type > 0,
                isUser: x.id == req.user.id
            })),
            reachedEnd: users.length < limit
        })

    } catch (e) {
        return next(e);
    }
})

const MODIFY_MODES = ["add", "remove"];

router.post("/modifyMember", async (req, res, next) => {
    let playlistId = req.body.playlist;
    let username = req.body.user;
    let mode = req.body.mode;

    if (!playlistId) {
        return res.status(400).json({success: false, msg: "Playlist required"});
    }
    if (!username) {
        return res.status(400).json({success: false, msg: "User required"});
    }
    if (!MODIFY_MODES.includes(mode)) {
        return res.status(400).json({success: false, msg: "Mode required"});
    }

    try {

        let user = await knex("users").where({username}).limit(1).select(["id", "username"]);
        if (!user) {
            return res.status(404).json({success: false, msg: "User not found"});
        }

        if (req.user.level != -1) {
            if (user[0].id == req.user.id) {
                let playlistAccess = await knex("playlist_users").where({"playlist_users.id": playlistId, user_id: req.user.id});
                if (!playlistAccess[0]) {
                    return res.status(401).json({success: false, msg: "Access denied"});
                }
            } else {
                let playlistAccess = await knex("playlist_users").where({"playlist_users.id": playlistId, user_id: req.user.id}).whereIn("access", [5, 1]);
                if (!playlistAccess[0]) {
                    return res.status(401).json({success: false, msg: "Access denied"});
                }
            }
        }

        let existingUser = await knex("playlist_users").where({"playlist_users.id": playlistId, user_id: user[0].id})
            .innerJoin("playlists", "playlists.id", "=", "playlist_users.id")
            .select(["playlists.author_id"])

        if (existingUser[0] && mode == "add" || !existingUser[0] && mode == "remove") {
            return res.status(200).json({success: true});
        }

        if (existingUser[0] && mode == "remove") {
            if (existingUser[0].author_id == user[0].id) {
                return res.status(403).json({success: false, msg: "Forbidden"}); 
            }
            
            await knex("playlist_users").where({"playlist_users.id": playlistId, user_id: user[0].id}).delete();
        } else if (!existingUser[0] && mode == "add") {
            await knex("playlist_users").insert({
                id: playlistId,
                user_id: user[0].id
            });
        }

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.post("/modifyAssets", async (req, res, next) => {
    const playlistId = req.body.playlist;
    let assets = req.body.assets;
    const mode = req.body.mode;

    if (!MODIFY_MODES.includes(mode)) {
        return res.status(400).json({success: false, msg: "Invalid Mode"})
    }

    if (!playlistId) {
        return res.status(400).json({success: false, msg: "Playlist required"});
    }

    if (!assets) {
        return res.status(400).json({success: false, msg: "Assets required"});
    }

    if (!Array.isArray(assets)) {
        assets = [assets];
    }

    try {

        const accessCheck = await knex("playlist_users").where({id: playlistId, user_id: req.user.id}).andWhere("type", ">", 0);
        if (!accessCheck[0]) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        if (mode == "add") {

            const validAssets = await knex("assets").whereIn("id", assets).select("id");
            if (validAssets.length <= 0)
                return res.status(200).json({success: true});

            const assetIds = validAssets.map(x => x.id);

            await knex("playlist_assets").whereIn("asset_id", assetIds).andWhere({playlist_id: accessCheck[0].id}).delete();

            await knex("playlist_assets").insert(assetIds.map(x => ({
                playlist_id: accessCheck[0].id,
                asset_id: x
            })));

        } else if (mode == "remove") {

            await knex("playlist_assets").whereIn("asset_id", assets).andWhere({playlist_id: accessCheck[0].id}).delete();

        }

        const assetCount = await knex("playlist_assets").where({playlist_id: accessCheck[0].id}).count("asset_id as CNT");
        await knex("playlists").update({asset_count: assetCount[0].CNT}).where({id: accessCheck[0].id}).limit(1);

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }

})

module.exports = router;
