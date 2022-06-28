const express = require('express');
const router = express.Router();

const Video = require('../../models/video');
const channelFunctions = require('../../modules/channelFunctions');
const videoFunctions = require('../../modules/videoFunctions');
const validation = require('../../modules/validation');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');

router.post("/move/:id", validation.ensureAuthenticated, (req, res, next) => {
    let channelId = req.body.channel;
    let id = req.params.id;
    if (!isValidObjectId(id) || !isValidObjectId(channelId)) {
        return res.status(400).json({success: false});
    }

    Video.findById(id).exec(async (err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        let accessResponse = await channelFunctions.hasAccessToChannel(video.channel, req.user.id);
        if (!accessResponse.success || !accessResponse.hasAccess) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }

        accessResponse = await channelFunctions.hasAccessToChannel(channelId, req.user.id);
        if (!accessResponse.success || !accessResponse.hasAccess) {
            return res.status(404).json({success: false, msg: "Channel not found"});
        }

        let oldChannel = video.channel;

        video.channel = channelId;
        video.meta.move = {
            lastMove: new Date(),
            by: req.user.id,
            from: oldChannel,
            to: channelId
        }
        video.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true});
        })

    })
})

router.get('/get', validation.ensureAuthenticated, validation.ensureChannel, async (req, res) => {
    
    let skip = req.query.skip;
    let limit = req.query.limit;

    try {
        if (skip) {
            skip = parseInt(skip);
        } else {
            skip = 0;
        }

        if (limit) {
            limit = parseInt(limit);
        } else {
            limit = 4;
        }

        if (limit > 50) {
            limit = 50;
        }
    } catch (e) {
        logger.error(e);
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    let videoListResult = await videoFunctions.getList(req, res, skip, limit);
    if (videoListResult.success === false) {
        return res.status(400).json({success: false, msg: videoListResult.msg});
    }

    return res.status(200).json({success: true, items: videoListResult.videos.length, reachedEnd: videoListResult.videos.length < limit, skip, limit, params: videoListResult.params, videos: videoListResult.videos});

})

module.exports = router;