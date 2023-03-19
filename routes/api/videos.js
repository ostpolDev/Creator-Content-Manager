const express = require('express');
const router = express.Router();

const Video = require('../../models/video');
const channelFunctions = require('../../modules/channelFunctions');
const videoFunctions = require('../../modules/videoFunctions');
const assetFunctions = require('../../modules/assetFunctions');
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

    let sizes = ["oneThird", "oneQuarter"];
    let customSize = req.query.size;
    if (customSize && !sizes.includes(customSize)) {
        customSize = undefined;
    }
    
    let renderedResult = renderer.render("videos/videoGrid", {
        videos: videoListResult.videos,
        field: videoListResult.params.field,
        currentSort: videoListResult.params.currentSort,
        videoGridSize: customSize
    });
    if (!renderedResult) {
        return res.status(500).json({success: false, msg: "Something went wrong when rendering..."});
    }

    return res.status(200).json({success: true, items: videoListResult.videos.length, reachedEnd: videoListResult.videos.length < videoListResult.params.limit, params: videoListResult.params, renderedResult});

})

router.post("/delete/:id", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Video not found"});
    }
    Video.findOneAndRemove({
        _id: id,
        createdBy: req.user.id
    }).exec((err) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }
        return res.status(200).json({success: true});
    })
})

router.get("/getAssets/:id", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false});
    }
    Video.findOne({_id: id, createdBy: req.user.id}).select("assets").populate("assets", "name cleanName meta").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false})
        }
        if (!video) {
            return res.status(404).json({success: false});
        }
        return res.status(200).json({success: true, assets: video.assets})
    })
})

router.get("/getGames/:id", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false});
    }
    Video.findOne({_id: id, createdBy: req.user.id}).select("games").populate("games", "name id").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false})
        }
        if (!video) {
            return res.status(404).json({success: false});
        }
        return res.status(200).json({success: true, assets: video.games})
    })
})

router.post('/addAsset', validation.ensureAuthenticated, async (req, res) => {
    let asset = req.body.asset;
    let video = req.body.video;

    if (!isValidObjectId(asset)) {
        return res.status(400).json({success: false, msg: "Invalid asset id"});
    }

    let assetExists = await assetFunctions.assetExists(asset);
    if (!assetExists) {
        return res.status(400).json({success: false, msg: "Asset not found"});
    }

    Video.findOne({_id: video, createdBy: req.user.id}).exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }
        if (video.assets.includes(asset)) {
            return res.status(200).json({success: true, msg: "Asset already used"});
        }
        video.assets.push(asset);
        video.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "Asset added to video"});
        })
    })
})

router.post('/removeAsset', validation.ensureAuthenticated, async (req, res) => {
    let asset = req.body.asset;
    let video = req.body.video;

    if (!isValidObjectId(asset)) {
        return res.status(400).json({success: false, msg: "Invalid asset id"});
    }

    let assetExists = await assetFunctions.assetExists(asset);
    if (!assetExists) {
        return res.status(400).json({success: false, msg: "Asset not found"});
    }

    Video.findOne({_id: video, createdBy: req.user.id}).exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }
        let index = video.assets.indexOf(asset);
        if (index === -1) {
            return res.status(200).json({success: true, msg: "Asset not found in video"});
        }
        video.assets.splice(index, 1);
        video.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "Asset removed from video"});
        })
    })
})

router.post('/addGame', validation.ensureAuthenticated, async (req, res) => {
    let game = req.body.game;
    let video = req.body.video;

    if (!isValidObjectId(game)) {
        return res.status(400).json({success: false, msg: "Invalid asset id"});
    }

    Video.findOne({_id: video, createdBy: req.user.id}).select("games name id").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }
        if (video.games.includes(game)) {
            return res.status(200).json({success: true, msg: "Asset already used"});
        }
        video.games.push(game);
        video.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "Game added to video"});
        })
    })
})

router.post('/removeGame', validation.ensureAuthenticated, async (req, res) => {
    let game = req.body.game;
    let video = req.body.video;

    if (!isValidObjectId(game)) {
        return res.status(400).json({success: false, msg: "Invalid asset id"});
    }

    Video.findOne({_id: video, createdBy: req.user.id}).select("name games id").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false, msg: "Video not found"});
        }
        let index = video.games.indexOf(game);
        if (index === -1) {
            return res.status(200).json({success: true, msg: "Asset not found in video"});
        }
        video.games.splice(index, 1);
        video.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "Game removed from video"});
        })
    })
})

router.get("/legalInfo/:id", (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid id"});
    }
    Video.findById(id).select("assets").populate("assets", "legalInfo cleanName").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }
        return res.status(200).json({success: true, info: video});
    })
})

module.exports = router;