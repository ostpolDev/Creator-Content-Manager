const express = require('express');
const router = express.Router();

const Video = require('../../models/video');
const channelFunctions = require('../../modules/channelFunctions');
const videoFunctions = require('../../modules/videoFunctions');
const validation = require('../../modules/validation');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');
const renderer = require('../../modules/pugRenderer');

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

    let videoListResult = await videoFunctions.getList(req);
    if (videoListResult.success === false) {
        return res.status(400).json({success: false, msg: videoListResult.msg});
    }

    return res.status(200).json({success: true, items: videoListResult.videos.length, reachedEnd: videoListResult.videos.length < videoListResult.params.limit, params: videoListResult.params, videos: videoListResult.videos});

})

router.get('/get/rendered', validation.ensureAuthenticated, validation.ensureChannel, async (req, res) => {

    let videoListResult = await videoFunctions.getList(req);
    if (videoListResult.success === false) {
        return res.status(400).json({success: false, msg: videoListResult.msg});
    }
    
    let renderedResult = renderer.render("videos/videoGrid", {
        videos: videoListResult.videos, 
        backendRender: true,
        field: videoListResult.params.field,
        currentSort: videoListResult.params.currentSort
    });
    if (!renderedResult) {
        return res.status(500).json({success: false, msg: "Something went wrong when rendering..."});
    }

    return res.status(200).json({success: true, items: videoListResult.videos.length, reachedEnd: videoListResult.videos.length < videoListResult.params.limit, params: videoListResult.params, renderedResult});

})

module.exports = router;