const express = require('express');
const router = express.Router();

const Video = require('../../models/video');
const channelFunctions = require('../../modules/channelFunctions');
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

module.exports = router;