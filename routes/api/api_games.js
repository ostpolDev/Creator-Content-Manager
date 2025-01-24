const router = require('express').Router();
const Steam = require('../../modules/steamHelper');
const { knex } = require('../../modules/database');
const { body, validationResult } = require('express-validator');
const { CompressString } = require('../../modules/textHelpers')

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
            id: newID
        });

        return res.status(200).json({success: true, id: newID});

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
    const description = req.body.description;

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
                id: newID,
                tags
            })
    
            return res.status(200).json({success: true, id: newID});

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


module.exports = router;
