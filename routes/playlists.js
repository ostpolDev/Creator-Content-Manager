const router = require('express').Router();
const { knex } = require('../modules/database');
const { GetCachedNumber } = require('../modules/numberCache');
const { UnzipString } = require('../modules/textHelpers');

router.get("/", (req, res) => {
    res.render("playlists/index", {
        title: "Playlists"
    })
})

const VALID_VIEWS = ["assets", "members"];

router.get("/v/:id", async (req, res, next) => {
    const id = req.params.id;
    let view = req.query.view;
    if (!VALID_VIEWS.includes(view)) {
        view = VALID_VIEWS[0];
    }

    try {

        const playlist = await knex("playlists").where({"playlists.id": id})
        .innerJoin("users", "users.id", "=", "playlists.author_id")
        .select([
            "playlists.id", "playlists.title", "playlists.rendered_description", "playlists.compression", "playlists.created_at", "playlists.updated_at", "playlists.public",
            "users.id as author_id", "users.username as author_username", "users.display_name as author_display_name"
        ]).limit(1);
        if (!playlist[0]) {
            return next();
        }

        let userType = req.user.id == playlist[0].author_id ? 5 : 0;

        if (!playlist[0].public) {
            const accessCheck = await knex("playlist_users").where({id: playlist[0].id, user_id: req.user.id}).limit(1);
            if (!accessCheck[0]) {                
                return next();
            }
            userType = accessCheck[0].type;
        }

        const descUnzip = UnzipString(playlist[0].rendered_description, playlist[0].compression);

        let assetCount = await GetCachedNumber(`P:${playlist[0].id}-asset_count`, async () => {
            let newCount = await knex("playlist_assets").where({playlist_id: playlist[0].id}).count("playlist_id as CNT");
            return newCount[0].CNT;
        })

        playlist[0].rendered_description = descUnzip;

        return res.render("playlists/view", {
            playlist: playlist[0],
            title: `${playlist[0].title} - Playlist`,
            assetCount,
            isAuthor: playlist[0].author_id == req.user.id,
            userType,
            canAdd: userType > 0,
            view
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
