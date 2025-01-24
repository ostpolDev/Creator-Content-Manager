const { knex } = require('../modules/database');
const { GetCachedNumber } = require('../modules/numberCache');
const { UnzipString } = require('../modules/textHelpers');
const { IDToCategory } = require('../modules/youtubeHelpers');

const router = require('express').Router();

const FOCUS = ["search", "add"];

router.get("/", async (req, res, next) => {
    try {

        let focus = req.query.focus;
        if (!FOCUS.includes(focus)) {
            focus = null;
        }

        let videoCount = await GetCachedNumber(`${req.user.id}-video_count`, async () => {
            let channels = await knex("channel_members").where({user: req.user.id}).select("channel");
            let newVideoCount = await knex("videos").whereIn("channel", channels.map(x => x.channel)).count("id as CNT");
            return newVideoCount[0].CNT;
        })

        let channels = await knex("channel_members").where({user: req.user.id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select(["channels.id", "channels.name"]);

        let channel = req.query.channel;
        
        if (channels.some(x => x.id == channel).length <= 0) {
            channel = null;
        }

        res.render("videos/index", {
            title: "Videos",
            videoCount,
            channels,
            selected_channel: channel,
            focus
        })

    } catch (e) {
        return next(e);
    }
})

const VIEWS = ["description", "assets", "comments"];

router.get("/v/:id", async (req, res, next) => {
    try {

        let view = req.query.view;
        if (!VIEWS.includes(view)) {
            view = VIEWS[0];
        }

        let video = await knex("videos").where({"videos.id": req.params.id}).limit(1)
            .innerJoin("video_infos", "video_infos.id", "=", "videos.id")
            .innerJoin("channels", "channels.id", "=", "videos.channel")
            .innerJoin("users", "users.id", "=", "videos.added_by")
            .select([
                "videos.*", "video_infos.*",
                "channels.id as channel_id", "channels.name as channel_name", "channels.image_url as channel_image_url",
                "users.display_name as author_display_name", "users.username as author_username"
            ])

        if (!video[0]) {
            return next();
        }

        if (req.user.level != -1) {
            let channelCheck = await knex("channel_members").where({user: req.user.id, channel: video[0].channel}).limit(1);
            if (!channelCheck[0]) {
                return next();
            }
        }

        video[0].rendered_description = UnzipString(video[0].rendered_description, video[0].compression);

        let subtitle = "";

        let members = await knex("video_members").where({video: video[0].id})
            .innerJoin("users", "users.id", "=", "video_members.user")
            .select([
                "video_members.starring as isStarring", "video_members.editor as isEditor",
                "users.username", "users.display_name", "users.profile_image_url"
            ]);
        
        if (members.length > 0) {
            let starring = members.filter(x => x.isStarring).map(x => x.username);
            let editors = members.filter(x => x.isEditor).map(x => x.username);
            if (starring.length > 0) {
                subtitle += `Starring ${starring.join(", ")}`
            }
            if (editors.length > 0) {
                subtitle += `${subtitle.length > 0 ? " | " : ""}Edited by ${editors.join(", ")}`;
            }
        }

        if (video[0].properties && video[0].properties.category) {
            video[0].category = IDToCategory(video[0].properties.category);
        }

        let assetCount = await GetCachedNumber(`${video[0].id}-asset_count`, async () => {
            let newCount = await knex("video_assets").where({video: video[0].id}).count("video as CNT");
            return newCount[0].CNT;
        })

        let commentCount = await GetCachedNumber(`V:${video[0].id}-comment_count`, async () => {
            let newCommentCount = await knex("comments").where({target: `V:${video[0].id}`}).count("id as CNT");
            return newCommentCount[0].CNT;
        })

        let diff = Date.now() - video[0].updated_at.getTime();
        let canUpdate = diff > 1000 * 60 * 60;

        res.render("videos/view", {
            title: video[0].title || video[0].id,
            video: video[0],
            isAuthor: video[0].added_by == req.user.id,
            subtitle,
            view,
            assetCount, commentCount,
            canUpdate
        })

    } catch (e) {
        return next(e);
    }
})

router.get("/edit/:id", async (req, res, next) => {
    try {

        let video = await knex("videos").where({"videos.id": req.params.id}).limit(1)
            .innerJoin("channels", "channels.id", "=", "videos.channel")
            .innerJoin("users", "users.id", "=", "videos.added_by")
            .select([
                "videos.*",
                "channels.id as channel_id", "channels.name as channel_name", "channels.image_url as channel_image_url",
                "users.display_name as author_display_name", "users.username as author_username"
            ])

        if (!video[0]) {
            return next();
        }

        if (req.user.level != -1) {
            let channelCheck = await knex("channel_members").where({user: req.user.id, channel: video[0].channel}).limit(1);
            if (!channelCheck[0]) {
                return next();
            }
        }

        let channels = await knex("channel_members").where({user: req.user.id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select(["channels.id", "channels.name"])

        res.render("videos/edit", {
            title: "Edit video",
            video: video[0],
            channels
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
