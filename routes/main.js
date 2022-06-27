const express = require('express');
const router = express.Router();

const Video = require('../models/video');
const Channel = require('../models/channel');
const logger = require('../modules/logger');
const validation = require('../modules/validation');
const channelFunctions = require('../modules/channelFunctions');

router.get('/', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.render("indexLoggedOut");
        return;
    }

    Channel.find({
        $or: [
            {createdBy: req.user.id},
            {access: req.user.id}
        ]
    }).select("id").exec((err, channels) => {
        if (err) {
            logger.error(err);
            res.render("indexLoggedOut");
            return;
        }
        let channelIds = channels.map(x => x._id);
        Video.find({channel: {$in: channelIds}}).sort({createdAt: -1}).limit(8).exec((err, videos) => {
            if (err) {
                logger.error(err);
                res.render("indexLoggedOut");
                return;
            }
            res.render("index", {
                videos
            })
        })
    })
})

router.get('/watch', validation.ensureAuthenticated, (req, res, next) => {
    let query = req.query.v;
    if (!query) {
        return next({status: 404});
    }

    Video.findOne({youtubeId: query}).select("_id channel").exec(async (err, video) => {
        if (err) {
            return next(err);
        }
        if (!video) {
            return next({status: 404});
        }

        let accessResponse = await channelFunctions.hasAccessToChannel(video.channel, req.user.id);
        if (!accessResponse.success || !accessResponse.hasAccess) {
            return next({status: 404});
        }

        res.redirect('/videos/v/'+video.id);
    })
})

module.exports = router;