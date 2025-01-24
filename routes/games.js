const router = require('express').Router();
const { GetCachedNumber } = require('../modules/numberCache');
const { knex } = require('../modules/database');
const { UnzipString } = require('../modules/textHelpers');

router.get("/", async (req, res, next) => {
    try {

        const gameCount = await GetCachedNumber("game_count", async () => {
            const newCount = await knex("games").count("id as CNT");
            return newCount[0].CNT;
        })

        return res.render("games/index", {
            title: "Games",
            gameCount
        })

    } catch (e) {
        return next(e);
    }
})

router.get("/v/:id", async (req, res, next) => {
    try {

        const game = await knex("games").where({"games.id": req.params.id})
            .innerJoin("game_infos", "game_infos.id", "=", "games.id")
            .limit(1);

        if (!game[0]) {
            return next();
        }

        const decompressed = UnzipString(game[0].description, game[0].compression);
        game[0].description = decompressed;

        return res.render("games/view", {
            title: game[0].name,
            game: game[0]
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
