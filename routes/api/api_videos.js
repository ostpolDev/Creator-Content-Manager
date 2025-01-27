const { GetVideoInfo } = require('../../modules/youtubeHelpers');
const {knex} = require('../../modules/database');
const { randomUUID } = require('crypto');
const logger = require('../../modules/logger');
const { UnzipString } = require('../../modules/textHelpers');
const { ParseLegalText } = require('../../modules/assetHelpers');

const router = require('express').Router();

router.post("/add", async (req, res, next) => {
    let channelId = req.body.channel;
    let videoId = req.body.id;
    let starring = req.body.starring;
    let editors = req.body.editors;
    let name = req.body.name;
    let plannedReleaseDate = req.body.plannedReleaseDate;

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
                title: name || randomUUID(),
                uploaded_at: plannedReleaseDate
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

router.post("/refresh", async (req, res, next) => {

    const id = req.body.id;
    if (!id) {
        return res.status(400).json({success: false, msg: "Video ID required"});
    }

    try {

        const video = await knex("videos").where({id}).select(["updated_at", "id", "youtube_id"]).limit(1);
        if (!video[0]) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        if (!video[0].youtube_id) {
            return res.status(400).json({success: false, msg: "No YouTube ID attached to video"});
        }

        let diff = Date.now() - video[0].updated_at.getTime();
        let canUpdate = diff > 1000 * 60 * 60;

        if (!canUpdate) {
            return res.status(400).json({success: false, msg: "Please wait before refreshing the video again"});
        }

        let videoResult = await GetVideoInfo(video[0].youtube_id);
        if (!videoResult) {
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }

        await knex("videos").where({id}).limit(1).update({
            ...videoResult.video,
            updated_at: new Date()
        });

        await knex("video_infos").where({id}).limit(1).update({
            ...videoResult.video_info
        })

        return res.status(200).json({success: true});

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
    let game = req.query.game;

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
        } else if (game) {
            videoQuery = knex("video_games").where({"video_games.game": game})
                .innerJoin("videos", "videos.id", "=", "video_games.video")
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

router.get("/list/date/:year/:month", async (req, res, next) => {
    try {

        const year = req.params.year;
        const month = req.params.month;

        if (isNaN(year) || year < 0) {
            return res.status(400).json({success: false, msg: "Invalid year"});
        }
        if (isNaN(month) || year < 0) {
            return res.status(400).json({success: false, msg: "Invalid year"});
        }

        const startDate = new Date();
        startDate.setFullYear(year);
        startDate.setMonth(month);
        startDate.setDate(0);

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(1);

        const channels = await knex("channel_members").where({user: req.user.id}).select("channel");
        const channelIds = channels.map(x => x.channel);

        const videos = await knex("videos")
            .whereIn("channel", channelIds)
            .whereNotNull("uploaded_at")
            .where("uploaded_at", ">", startDate).andWhere("uploaded_at", "<", endDate)
            .select(["id", "channel", "title", "created_at", "uploaded_at as release_date"]).limit(50);

        return res.status(200).json({success: true, videos})

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

        let editors = req.body.editors;
        let starring = req.body.starring;

        let plannedRelease = req.body.plannedRelease;
        if (plannedRelease) {
            plannedRelease = new Date(plannedRelease)
        }
        
        if (editors) {
            editors = JSON.parse(editors);
        }
        if (starring) {
            starring = JSON.parse(starring);
        }

        if (starring && !Array.isArray(starring)) {
            return res.status(400).json({success: false, msg: "Starring format invalid"});
        }

        if (editors && !Array.isArray(editors)) {
            return res.status(400).json({success: false, msg: "Editors format invalid"});
        }

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

            updateBody["uploaded_at"] = plannedRelease;

            await knex("videos").where({id: video[0].id}).update(updateBody);
        }

        let usernames = [];
        if (editors) {
            usernames.push(...editors);
        }
        if (starring) {
            usernames.push(...starring);
        }
        
        if (usernames.length > 0) {
            let usersToFetch = [...new Set(usernames)];
            let users = await knex("users").whereIn("username", usersToFetch).select(["id", "username"]);
            let members = [];
            users.forEach(user => {
                members.push({
                    user: user.id,
                    video: video[0].id,
                    starring: starring.includes(user.username),
                    editor: editors.includes(user.username)
                })
            })

            await knex("video_members").where({video: video[0].id}).delete();
            await knex("video_members").insert(members);
        }

        return res.status(200).json({success: true, redirect: `/videos/v/${video[0].id}`});

    } catch (e) {
        return next(e);
    }
})

router.get("/legal/:id", async (req, res, next) => {
    try {
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

        let assetInfos = await knex("video_assets").where({video: video[0].id})
            .innerJoin("assets", "assets.id", "=", "video_assets.asset")
            .innerJoin("asset_infos", "asset_infos.id", "=", "video_assets.asset")
            .select([
                "asset_infos.compression", "asset_infos.legal_information", "video_assets.asset as asset_id",
                "assets.name", "asset_infos.license", "asset_infos.videos", "asset_infos.source"
            ])

        let legalText = [];
        let checked = [];
        let issues = {};
        assetInfos.forEach(info => {
            if (checked.includes(info.asset_id)) {
                return;
            }
            info.legal_information = ParseLegalText(UnzipString(info.legal_information, info.compression), info);

            if ((!info.legal_information || info.legal_information.trim() == "") && info.license.includes("Attribution")) {
                info.legal_information = info.name;
                if (info.source) {
                    info.legal_information += `\n${info.source}`
                }
            }
            
            legalText.push({
                id: info.asset_id,
                text: info.legal_information ? info.legal_information.trim() : null,
                name: info.name
            });

            if (info.videos == false) {
                if (!issues[info.asset_id]) {
                    issues[info.asset_id] = [];
                }
                issues[info.asset_id].push("This asset has been marked as incompatible with YouTube");
            }
            if (info.license.includes("NonCommercial")) {
                if (!issues[info.asset_id]) {
                    issues[info.asset_id] = [];
                }
                issues[info.asset_id].push("This asset's license contains a Non-commercial restriction");
            }

        })

        return res.status(200).json({success: true, infos: legalText, issues});
    } catch (e) {
        return next(e);
    }
})


router.get("/description/:id", async (req, res, next) => {
    try {

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

        let template = await knex("channel_descriptions").where({id: video[0].channel}).limit(1);
        if (!template[0]) {
            return res.status(404).json({success: false, msg: "No preset found"});
        }

        let text = UnzipString(template[0].description, template[0].compression);

        // TODO: Add game info

        let people = await knex("video_members").where({"video_members.video": video[0].id})
            .innerJoin("users", "users.id", "=", "video_members.user")
            .select(["users.id", "users.username", "users.display_name", "video_members.starring", "video_members.editor"]);

        return res.status(200).json({success: true, template: text, params: {
            editors: people.filter(x => x.editor).map(x => x.display_name).join(", "),
            starring: people.filter(x => x.starring).map(x => x.display_name).join(", "),
            title: video[0].title
        }})

    } catch (e) {
        return next(e);
    }
})

router.post("/setGame", async (req, res, next) => {

    const gameId = req.body.game;
    const videoId = req.body.video;

    if (!videoId) {
        return res.status(400).json({success: false, msg: "Video ID required"});
    }

    try {

        let game;
        if (gameId) {
            game = await knex("games").where({id: gameId}).select("id").limit(1)
        }

        const video = await knex("videos").where({id: videoId}).select(["id", "channel"]).limit(1);
        if (!video[0]) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        if (req.user.level != -1) {
            let channelCheck = await knex("channel_members").where({user: req.user.id, channel: video[0].channel}).limit(1);
            if (!channelCheck[0]) {
                return res.status(404).json({success: false, msg: "Video not found"});
            }
        }

        const existingVideoGame = await knex("video_games").where({video: video[0].id}).limit(1);
        if (existingVideoGame[0]) {
            if (!game || !game[0]) {
                await knex("video_games").where({video: video[0].id}).limit(1).delete();
            } else {
                await knex("video_games").where({video: video[0].id}).limit(1).update({game: game[0].id});
            }
        } else {
            await knex("video_games").insert({video: video[0].id, game: game[0].id});
        }

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.get("/getGame/:id", async (req, res, next) => {
    try {

        const videoGame = await knex("video_games").where({video: req.params.id}).limit(1)
            .innerJoin("games", "games.id", "=", "video_games.game")
            .select(["games.id", "games.name", "games.image_url"]);

        return res.status(200).json({success: true, game: videoGame[0]});

    } catch (e) {
        return next(e);
    }
})

router.post("/delete", async (req, res, next) => {
    const videoId = req.body.video;
    if (!videoId) {
        return res.status(400).json({success: false, msg: "Video ID required"});
    }

    try {

        const video = await knex("videos").where({id: videoId}).limit(1);
        if (!video[0]) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        if (req.user.level != -1) {
            const channelCheck = await knex("channel_members").where({user: req.user.id, channel: video[0].channel}).limit(1);
            if (!channelCheck[0]) {
                return res.status(404).json({success: false, msg: "Video not found"});
            }
        }

        // Deleting the video should cascade everything else
        await knex("videos").where({id: video[0].id}).limit(1).delete();

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
