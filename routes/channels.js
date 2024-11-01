const { CHANNEL_KEYWORDS } = require('../modules/data');
const { knex } = require('../modules/database');
const { GetCachedNumber } = require('../modules/numberCache');
const { UnzipString, ParseYouTubeTags } = require('../modules/textHelpers');

const router = require('express').Router();

const FOCUS = ["add", "search"]

router.get("/", async (req, res, next) => {
    try {

        let focus = req.query.focus;
        if (!FOCUS.includes(focus)) {
            focus = null;
        }

        let channel_count = await GetCachedNumber(`${req.user.id}-channel_count`, async () => {
            let newChannelCount = await knex("channel_members").where({user: req.user.id}).count("user as CNT");
            return newChannelCount[0].CNT;
        })

        res.render("channels/index", {
            title: "Channels",
            channel_count,
            focus
        })
    } catch (e) {
        return next(e);
    }
})

const VIEWS = ["videos", "comments", "members", "description_preset"];

router.get("/v/:id", async (req, res, next) => {
    try {

        let view = req.query.view;
        if (!VIEWS.includes(view)) {
            view = VIEWS[0];
        }

        let channelQuery = {channel: req.params.id};
        if (req.user.level != -1) {
            channelQuery["user"] = req.user.id;
        }
        let channel = await knex("channel_members").where(channelQuery).limit(1)
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .innerJoin("users", "users.id", "=", "channels.added_by")
            .select([
                "channels.*",
                "users.id as author_id", "users.username as author_username", "users.display_name as author_display_name", "users.profile_image_url as author_image_url",
            ]);

        if (!channel[0]) {
            return next();
        }

        channel[0].description = UnzipString(channel[0].description, channel[0].compression);

        let diff = Date.now() - channel[0].updated_at.getTime();
        let canUpdate = diff > 1000 * 60 * 60;

        let videoCount = await GetCachedNumber(`${channel[0].id}-video_count`, async () => {
            let newVideoCount = await knex("videos").where({channel: channel[0].id}).count("id as CNT");
            return newVideoCount[0].CNT;
        })

        let commentCount = await GetCachedNumber(`C:${channel[0].id}-comment_count`, async () => {
            let newCommentCount = await knex("comments").where({target: `C:${channel[0].id}`}).count("id as CNT");
            return newCommentCount[0].CNT;
        })

        let preset;
        if (view == "description_preset") {
            let presetQuery = await knex("channel_descriptions").where({id: channel[0].id}).limit(1);
            if (presetQuery[0]) {
                presetQuery[0].description = UnzipString(presetQuery[0].description, presetQuery[0].compression);
            }
            preset = presetQuery[0].description || null;
        }
        

        return res.render("channels/view", {
            title: channel[0].name,
            channel: channel[0],
            isAuthor: channel[0].added_by == req.user.id,
            canUpdate: canUpdate,
            view,
            videoCount, commentCount,
            preset,
            keywords: CHANNEL_KEYWORDS
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
