const express = require('express');
const router = express.Router();

const Video = require('../models/video');
const Channel = require('../models/channel');
const logger = require('../modules/logger');

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

module.exports = router;