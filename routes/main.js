const express = require('express');
const router = express.Router();

const Video = require('../models/video');
const Channel = require('../models/channel');
const logger = require('../modules/logger');
const validation = require('../modules/validation');
const channelFunctions = require('../modules/channelFunctions');
const Asset = require('../models/asset');
const path = require('path');
const fs = require('fs');
const paths = require('../modules/paths');
const marked = require('../modules/marked');
const hints = require('../modules/hints');

router.get('/', async (req, res, next) => {
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
            return next(err);
        }
        let channelIds = channels.map(x => x._id);
        Video.find({channel: {$in: channelIds}}).sort({createdAt: -1}).limit(8).exec((err, videos) => {
            if (err) {
                return next(err);
            }
            Asset.find({}).sort({createdAt: -1}).limit(10).exec((err, assets) => {
                if (err) {
                    return next(err);
                }
                res.render("index", {
                    videos,
                    assets,
                    hint: hints.getHint()
                })
            });
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

router.get("/licences", (req, res, next) => {
    let licencePath = path.join(paths.root, "licence.txt");
    if (!fs.existsSync(licencePath)) {
        return next({status: 404});
    }

    let content = fs.readFileSync(licencePath);
    let stats = fs.statSync(licencePath);
    res.render('licences', {
        content: marked.sanitizeFull(content),
        title: "Licences",
        lastChange: stats.ctime
    })
})

router.get("/licences/download", (req, res, next) => {
    let licencePath = path.join(paths.root, "licence.txt");
    if (!fs.existsSync(licencePath)) {
        return next({status: 404});
    }

    res.download(licencePath, "licences.txt")
})

module.exports = router;