const { GetVideoInfo } = require('../../modules/youtubeHelpers');
const {knex} = require('../../modules/database');
const { randomUUID } = require('crypto');
const logger = require('../../modules/logger');

const router = require('express').Router();

router.post("/add", async (req, res, next) => {
    let channelId = req.body.channel;
    let videoId = req.body.id;
    let starring = req.body.starring;
    let editors = req.body.editors;
    let name = req.body.name;

    if (!channelId) {
        return res.status(400).json({success: false, msg: "Channel required"});
    }

    if (starring && !Array.isArray(starring)) {
        return res.status(400).json({success: false, msg: "Starring format invalid"});
    }
    if (editors && !Array.isArray(editors)) {
        return res.status(400).json({success: false, msg: "Editors format invalid"});
    }

    try {

        let accessCheck = await knex("channel_members").where({channel: channelId, user: req.user.id}).select("channel").limit(1);
        if (!accessCheck[0]) {
            return res.status(404).json({success: false, msg: "Channel not found"});
        }

        let createdVideoID;

        if (videoId && videoId.trim() != "") { // Add YouTube video
            let videoResult = await GetVideoInfo(videoId);
            if (!videoResult) {
                return res.status(500).json({success: false, msg: "Something went wrong"});
            }
    
            let newVideo = await knex("videos").insert({
                ...videoResult.video,
                added_by: req.user.id,
                channel: accessCheck[0].channel
            }, "id");
    
            if (!newVideo[0]) {
                return res.status(500).json({success: false, msg: "Could not add video"});
            }
    
            await knex("video_infos").insert({
                ...videoResult.video_info,
                id: newVideo[0].id
            });

            createdVideoID = newVideo[0].id;
        } else { // Add temporary video
            let newVideo = await knex("videos").insert({
                added_by: req.user.id,
                channel: accessCheck[0].channel,
                title: name || randomUUID()
            }, "id");

            if (!newVideo[0]) {
                return res.status(500).json({success: false, msg: "Could not add video"});
            }
    
            await knex("video_infos").insert({
                id: newVideo[0].id
            })

            createdVideoID = newVideo[0].id;
        }


        let usernames = [];
        if (editors) {
            usernames.push(...editors);
        }
        if (starring) {
            usernames.push(...starring);
        }
        let usersToFetch = [...new Set(usernames)];

        let users = await knex("users").whereIn("username", usersToFetch).select(["id", "username"]);
        let members = [];
        users.forEach(user => {
            members.push({
                user: user.id,
                video: createdVideoID,
                starring: starring.includes(user.username),
                editor: editors.includes(user.username)
            })
        })

        await knex("video_members").insert(members);

        return res.status(200).json({success: true, video: createdVideoID});
        
    } catch (e) {
        return next(e);
    }
})

router.get("/list", async (req, res, next) => {
    let search = req.query.q;
    let skip = req.query.skip;
    let limit = req.query.limit;
    let channel = req.query.channel;
    let asset = req.query.asset;

    if (isNaN(skip) || skip < 0) {
        skip = 0;
    }
    if (isNaN(limit) || limit < 0 || limit > 200) {
        limit = 50;
    }

    try {

        let channels = [];
        if (channel) {
            channels = [channel];
        } else {
            channels = await knex("channel_members").where({user: req.user.id}).select("channel");
            channels = channels.map(x => x.channel);
        }

        let videoQuery;

        if (asset) {
            videoQuery = knex("video_assets").where({"video_assets.asset": asset})
                .innerJoin("videos", "videos.id", "=", "video_assets.video")
                .innerJoin("channels", "channels.id", "=", "videos.channel").orderBy("videos.created_at", "desc")
                .whereIn("videos.channel", channels).limit(limit).offset(skip)
                .select([
                    "videos.id", "videos.title", "videos.created_at", "videos.thumbnail_url", "videos.added_by",
                    "channels.id as channel_id", "channels.name as channel_name"
                ])
        } else {
            videoQuery = knex("videos").whereIn("channel", channels).limit(limit).offset(skip)
                .innerJoin("channels", "channels.id", "=", "videos.channel").orderBy("created_at", "desc")
                .select([
                    "videos.id", "videos.title", "videos.created_at", "videos.thumbnail_url", "videos.added_by",
                    "channels.id as channel_id", "channels.name as channel_name"
                ])
        }

            
        if (search) {
            videoQuery.whereILike("title", `%${search}%`);
        }

        videoQuery.then((videos) => {
            return res.status(200).json({success: true, items: videos.map(x => ({
                ...x,
                isAuthor: x.added_by == req.user.id
            })), reachedEnd: videos.length < limit})
        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

const MODIFY_MODES = ["add", "remove"];

router.post("/modifyAsset", async (req, res, next) => {
    let videoId = req.body.video;
    let mode = req.body.mode;
    let assetId = req.body.asset;

    if (!videoId) {
        return res.status(400).json({success: false, msg: "Video required"});
    }

    if (!MODIFY_MODES.includes(mode)) {
        return res.status(400).json({success: false, msg: "Invalid modification mode"});
    }

    if (!assetId) {
        return res.status(400).json({success: false, msg: "Asset required"});
    }

    try {

        // Access check
        let video = await knex("videos").where({id: videoId}).limit(1).select(["id", "channel"]);
        if (!video[0]) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        if (req.user.level != -1) {
            let channelAccess = await knex("channel_members").where({channel: video[0].channel, user: req.user.id}).limit(1).select("user");
            if (!channelAccess[0]) {
                return res.status(404).json({success: false, msg: "Channel not found"});
            }
        }

        // Existing check
        let existingItem = await knex("video_assets").where({video: video[0].id, asset: assetId}).limit(1);
        if (!existingItem[0] && mode == "remove" || existingItem[0] && mode == "add") {
            return res.status(200).json({success: true});
        }

        if (!existingItem[0] && mode == "add") {
            await knex("video_assets").insert({video: video[0].id, asset: assetId});
        } else if (existingItem[0] && mode == "remove") {
            await knex("video_assets").where({video: video[0].id, asset: assetId}).delete();
        }

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.get("/assets/:id", async (req, res, next) => {
    let id = req.params.id;

    try {

        let assets = await knex("video_assets").where({video: id})
            .innerJoin("assets", "assets.id", "=", "video_assets.asset")
            .limit(100)
            .select([
                "assets.id", "assets.name", "assets.type", "assets.tags"
            ])

        return res.status(200).json({success: true, items: assets});

    } catch (e) {
        return next(e);
    }
})

router.post("/edit/:id", async (req, res, next) => {
    try {

        let channel = req.body.channel;
        let youtube = req.body.youtube;
        let title = req.body.title;

        let video = await knex("videos").where({"videos.id": req.params.id}).limit(1)
            .select([
                "videos.id", "videos.channel", "videos.youtube_id", "videos.title"
            ])

        if (req.user.level != -1) {
            let channelCheck = await knex("channel_members").where({user: req.user.id, channel: video[0].channel}).limit(1);
            if (!channelCheck[0]) {
                return res.status(404).json({success: false, msg: "Video not found"});
            }
        }

        if (channel && req.user.level != -1 && channel != video[0].channel) {
            let otherChannelCheck = await knex("channel_members").where({user: req.user.id, channel}).limit(1);
            if (!otherChannelCheck[0]) {
                return res.status(404).json({success: false, msg: "Channel not found"});
            }
        }

        if (!video[0].youtube_id && youtube || (youtube && video[0].youtube_id != youtube)) {
            logger.info(`Updating video YouTube information: ${video[0].id}`);
            
            let videoInfo = await GetVideoInfo(youtube);
            if (!videoInfo) {
                return res.status(400).json({success: false, msg: [{
                    msg: "Could not get video info",
                    field: "youtube"
                }]});
            }

            let updateBody = {
                updated_at: new Date(),
                ...videoInfo.video
            };
            if (channel && channel != video[0].channel) {
                updateBody["channel"] = channel;
            }

            await knex("videos").where({id: video[0].id}).update(updateBody)

            await knex("video_infos").where({id: video[0].id}).update({
                ...videoInfo.video_info
            })

        } else {
            let updateBody = {
                title
            };

            if (channel && channel != video[0].channel) {
                updateBody["channel"] = channel;
            }

            if (video[0].youtube_id && !youtube) {
                updateBody["youtube_id"] = null;
            }

            await knex("videos").where({id: video[0].id}).update(updateBody);
        }

        return res.status(200).json({success: true, redirect: `/videos/v/${video[0].id}`});

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
