const router = require('express').Router();
const { knex } = require('../../modules/database');
const logger = require('../../modules/logger');
const { CompressString } = require('../../modules/textHelpers');
const YoutubeHelpers = require('../../modules/youtubeHelpers');

router.post("/add", async (req, res, next) => {
    let username = req.body.username;
    if (!username || username.trim().length <= 0 || username.length > 256) {
        return res.status(400).json({success: false, msg: "Invalid username"});
    }

    try {

        let usernameToCheck = !username.startsWith("@") ? `@${username}` : username;
        let usernameCheck = await knex("channels").where({handle: usernameToCheck}).limit(1).select("id");
        if (usernameCheck[0]) {
            return res.status(400).json({success: false, msg: "Channel already added"});
        }

        let channelInfo = await YoutubeHelpers.GetChannelInfo(username.trim(), knex);
        if (!channelInfo) {
            return res.status(404).json({success: false, msg: "Channel not found"});
        }

        let check = await knex("channels").where({id: channelInfo.id}).select("id").limit(1);
        if (check[0]) {
            return res.status(400).json({success: false, msg: "Channel already added"});
        }

        let channel = await knex("channels").insert({
            ...channelInfo,
            added_by: req.user.id
        }, "id");
        if (!channel[0]) {
            logger.error(`Could not insert channel into database: ${username}`);
            return res.status(500).json({success: false, msg: "Something went wrong"})
        }

        await knex("channel_members").insert({
            channel: channel[0].id,
            user: req.user.id,
            access: -1
        });

        return res.status(200).json({success: true, channel: channel[0].id});

    } catch (e) {
        return next(e);
    }
})

router.get("/list", async (req, res, next) => {
    let search = req.query.q;
    let limit = req.query.limit;
    let skip = req.query.skip;
    if (!limit || isNaN(limit) || limit > 200 || limit < 1) {
        limit = 50;
    }
    if (isNaN(skip) || skip < 0) {
        skip = 0;
    }

    try {

        let channelQuery = knex("channel_members")
            .where({"channel_members.user": req.user.id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .limit(limit).offset(skip).orderBy("channels.name", "asc")
            .select([
                "channels.name", "channels.id", "channels.handle", "channels.created_at", "channels.subscribers", "channels.views", "channels.added_by", "channels.image_url"
            ]);

        if (search) {
            channelQuery.whereILike("name", `%${search}%`);
        }

        channelQuery.then((channels) => {
            return res.status(200).json({success: true, items: channels.map(x => ({
                ...x,
                isAuthor: x.added_by == req.user.id
            })), reachedEnd: channels.length < limit})
        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

router.post("/refresh", async (req, res, next) => {
    let channelId = req.body.channel;
    if (!channelId) {
        return res.status(400).json({success: false, msg: "Channel required"});
    }
    try {

        if (req.user.level != -1) {
            let channelCheck = await knex("channel_members").where({channel: channelId, user: req.user.id}).limit(1).select("channel");
            if (!channelCheck[0]) {
                return res.status(404).json({success: false, msg: "Channel not found"});
            }
        }

        let channel = await knex("channels").where({id: channelId}).select(["id", "handle", "updated_at"]).limit(1);
        if (!channel[0]) {
            return res.status(404).json({success: false, msg: "Channel not found"});
        }

        let diff = Date.now() - channel[0].updated_at;
        if (diff < 1000 * 60 * 60) {
            return res.status(400).json({success: false, msg: "Please wait before updating"})
        }

        let channelInfo = await YoutubeHelpers.GetChannelInfo(channel[0].handle, knex);
        if (!channelInfo) {
            return res.status(404).json({success: false, msg: "Channel not found on Youtube"});
        }

        delete channelInfo["id"];

        await knex("channels").where({id: channel[0].id}).update({...channelInfo, updated_at: new Date()});

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.get("/members/:id", async (req, res, next) => {
    let id = req.params.id;

    try {

        let accessCheck = await knex("channel_members").where({channel: id, user: req.user.id}).limit(1)
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select([
                "channels.added_by as channel_author"
            ])
        if (!accessCheck[0] && req.user.level != -1) {
            return res.status(401).json({success: false, msg: "Access denied"});
        }

        let members = await knex("channel_members").where({channel: id}).limit(100)
            .innerJoin("users", "users.id", "=", "channel_members.user")
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select([
                "users.username", "users.display_name", "users.profile_image_url", "channel_members.access as access_level",
                "channels.id as channel_id", "users.id as user_id"
            ])

        return res.status(200).json({success: true, items: members.map(x => ({
            ...x,
            isAuthor: accessCheck[0].channel_author == x.user_id,
            isUser: x.user_id == req.user.id
        }))});

    } catch (e) {
        return next(e);
    }
})

const MODIFY_MODES = ["add", "remove"];

router.post("/modifyMember", async (req, res, next) => {
    let channelId = req.body.channel;
    let username = req.body.user;
    let mode = req.body.mode;

    if (!channelId) {
        return res.status(400).json({success: false, msg: "Channel required"});
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
                let channelAccess = await knex("channel_members").where({channel: channelId, user: req.user.id});
                if (!channelAccess[0]) {
                    return res.status(401).json({success: false, msg: "Access denied"});
                }
            } else {
                let channelAccess = await knex("channel_members").where({channel: channelId, user: req.user.id}).whereIn("access", [-1, 1]);
                if (!channelAccess[0]) {
                    return res.status(401).json({success: false, msg: "Access denied"});
                }
            }
        }

        let existingUser = await knex("channel_members").where({channel: channelId, user: user[0].id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select(["channels.added_by"])

        if (existingUser[0] && mode == "add" || !existingUser[0] && mode == "remove") {
            return res.status(200).json({success: true});
        }

        if (existingUser[0] && mode == "remove") {
            if (existingUser[0].added_by == user[0].id) {
                return res.status(403).json({success: false, msg: "Forbidden"}); 
            }
            
            await knex("channel_members").where({channel: channelId, user: user[0].id}).delete();
        } else if (!existingUser[0] && mode == "add") {
            await knex("channel_members").insert({
                channel: channelId,
                user: user[0].id
            });
        }

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

router.post("/savePreset", async (req, res, next) => {
    let channelId = req.body.channel;
    let preset = req.body.preset;

    if (!channelId) {
        return res.status(400).json({success: false, msg: "Channel required"});
    }

    if (preset && preset.length > 5000) {
        return res.status(400).json({success: false, msg: "Preset too long (max. 5000)"});
    }

    try {

        if (req.user.level != -1) {
            let channelAccess = await knex("channel_members").where({channel: channelId, user: req.user.id}).whereIn("acces", [1, -1]);
            if (!channelAccess[0]) {
                return res.status(401).json({success: false, msg: "Access denied"});
            }
        }

        let existingDescription = await knex("channel_descriptions").where({id: channelId}).select("id");
        if (!existingDescription[0]) {
            if (preset) {
                let compressed = CompressString(preset, false, knex);
                await knex("channel_descriptions").insert({
                    id: channelId,
                    description: compressed.text,
                    compression: compressed.compression
                })
            } else {
                await knex("channel_descriptions").insert({
                    id: channelId
                })
            }
        } else {
            if (preset) {
                let compressed = CompressString(preset, false, knex);
                await knex("channel_descriptions").where({id: channelId}).limit(1).update({
                    description: compressed.text || null,
                    compression: compressed.compression,
                    updated_at: new Date()
                })
            } else {
                await knex("channel_description").where({id: channelId}).limit(1).update({
                    description: null,
                    compression: "none",
                    updated_at: new Date()
                })
            }
        }

        return res.status(200).json({success: true});

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
