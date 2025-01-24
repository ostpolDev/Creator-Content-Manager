const router = require('express').Router();
const Steam = require('../../modules/steamHelper');
const { knex } = require('../../modules/database');
const { body, validationResult } = require('express-validator');
const { CompressString, UnzipString } = require('../../modules/textHelpers')
const { sanitizeFull } = require('../../modules/marked');

router.post("/addSteam", async (req, res, next) => {
    try {

        let id = req.body.id;
        if (!id) {
            return res.status(400).json({success: false, msg: "ID required"});
        }

        if (id.startsWith("http")) {
            id = Steam.GetSteamGameIDFromURL(id);
        }

        if (!id) {
            return res.status(400).json({success: false, msg: "Invalid ID or URL"});
        }

        const existing = await knex("games").where({steam_id: id}).limit(1).select("id");
        if (existing[0]) {
            return res.status(400).json({success: false, msg: "Game already exists", redirect: `/games/v/${encodeURIComponent(existing[0].id)}`});
        }

        const gameData = await Steam.GetSteamGameInfo(id);
        if (!gameData) {
            return next(new Error(`Failed to fetch new steam info for game: ${id}`));
        }

        const newID = await knex("games").insert({
            ...gameData.game,
            added_by: req.user.id
        }, "id");

        await knex("game_infos").insert({
            ...gameData.info,
            id: newID[0].id
        });

        return res.status(200).json({success: true, id: newID[0].id});

    } catch (e) {
        return next(e);
    }
})

router.post("/updateSteam", async (req, res, next) => {
    try {

        const id = req.body.id;
        if (!id) {
            return res.status(400).json({success: false, msg: "ID required"});
        }

        let steam = req.body.steam;
        if (steam) {
            if (steam.startsWith("http")) {
                steam = Steam.GetSteamGameIDFromURL(steam);
            }
            if (!steam) {
                return res.status(400).json({success: false, msg: "Invalid Steam ID or URL"});
            }
        }

        const existing = await knex("games").where({id}).limit(1).select(["id", "steam_id"]);
        if (!existing[0]) {
            return res.status(404).json({success: false, msg: "Game not found"});
        }

        const gameData = await Steam.GetSteamGameInfo(steam || existing[0].steam_id);
        if (!gameData) {
            return next(new Error(`Failed to fetch and refresh steam info for game: ${id}`));
        }

        await knex("games").where({id}).limit(1).update({
            ...gameData.game,
            updated_at: new Date()
        });

        await knex("game_infos").where({id}).limit(1).update({
            ...gameData.info
        });

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.post("/add", [
    body("name", "Name is required").notEmpty(),
    body("name", "Name has to be between 1 and 255 characters").isLength({max: 255}),
    body("description", "Description cannot be longer than 10.000 characters").isLength({max: 10000})
], async (/**@type {import('express').Request} */ req,/**@type {import('express').Response} */ res,/**@type {import('express').NextFunction} */ next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({success: false, msg: errors.array().map(x => x.msg)});
    }

    const name = req.body.name;
    const description = sanitizeFull(req.body.description);

    const compressed = CompressString(description);

    const image_url = req.body.image;
    const website = req.body.website;
    const developer = req.body.developer;
    const publisher = req.body.publisher;
    const tags = req.body.tags;

    const method = req.body.formMethod;
    const reference = req.body.reference;

    try {

        if (method == "add") {
            const newID = await knex("games").insert({
                name,
                description: compressed.text,
                compression: compressed.compression,
                added_by: req.user.id,
                image_url, website, developer, publisher
            }, "id")
    
            await knex("game_infos").insert({
                id: newID[0].id,
                tags
            })
    
            return res.status(200).json({success: true, id: newID[0].id});

        } else if (method == "edit" && typeof reference !== "undefined") {

            let editQuery = {id: reference};
            if (!req.user.level == -1) {
                editQuery["added_by"] = req.user.id;
            }

            const editedID = await knex("games").limit(1).where(editQuery).update({
                name,
                description: compressed.text,
                compression: compressed.compression,
                image_url, website, developer, publisher,
                updated_at: new Date()
            }, "id");

            if (!editedID) {
                return res.status(404).json({success: false, msg: "Game not found"});
            }

            await knex("game_infos").limit(1).where({id: reference}).update({
                tags
            });

            return res.status(200).json({success: true});

        } else {
            return res.status(400).json({success: false, msg: "Invalid method"});
        }

    } catch (e) {
        return next(e);
    }

})

router.get("/list", async (req, res, next) => {
    try {

        let search = req.query.q;
        let skip = req.query.skip || 0;
        let limit = req.query.limit || 50;
        if (Number.isNaN(limit) || limit < 0 || limit > 200) {
            limit = 50;
        }
        
        const select = [
            "games.name", "games.id", "games.steam_id", "games.image_url", "games.created_at", "games.developer"
        ];

        const query = knex("games").select(select).limit(limit).offset(skip).orderBy("games.name", "asc");

        if (search) {
            query.whereILike("games.name", `%${search}%`);
        }

        query.then((games) => {
            return res.status(200).json({success: true, items: games, reachedEnd: games.length < limit});
        }).catch((err) => {
            return next(err);
        })

    } catch (e) {
        return next(e);
    }
})


router.get("/get/:id", async (req, res, next) => {
    try {

        const game = await knex("games").where({"games.id": req.params.id}).limit(1)
            .innerJoin("game_infos", "game_infos.id", "=", "games.id")
            .select(
                ["games.id", "name", "description", "compression", "website", "developer", "publisher", "image_url", "game_infos.tags", "created_at"]
            );

        if (!game[0]) {
            return res.status(404).json({success: false, msg: "Game not found"});
        }

        const decompressed = UnzipString(game[0].description, game[0].compression);

        game[0].description = decompressed;

        return res.status(200).json({success: true, game: game[0]});

    } catch (e) {
        return next(e);
    }
})

router.post("/delete", async (req, res, next) => {
    try {
        
        const id = req.body.game;
        if (!id) {
            return res.status(400).json({success: false, msg: "Game not found"});
        }

        const deletedId = await knex("games").where({id, added_by: req.user.id}).limit(1).delete("id");
        if (!deletedId[0]) {
            return next();
        }

        await knex("game_infos").where({id: deletedId[0].id}).limit(1).delete();
        await knex("video_games").where({game: deletedId[0].id}).delete();

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
