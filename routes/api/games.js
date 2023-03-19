const router = require("express").Router();

const Video = require('../../models/video');
const Game = require('../../models/game');

const logger = require('../../modules/logger');
const { ensureAuthenticated } = require("../../modules/validation");
const { isValidObjectId } = require("mongoose");

router.get("/search/:videoId", ensureAuthenticated, (req, res) => {
    let id = req.params.videoId;
    let query = req.query.q;
    if (!isValidObjectId(id) || !query) {
        return res.status(400).json({success: false});
    }

    Video.findOne({
        _id: id,
        createdBy: req.user.id
    }).select("assets").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false});
        }

        Game.find({
            _id: {$not: {$in: video.games}},
            $or: [
                {name: {$regex: query, $options: "i"}},
                {appId: {$regex: query, $options: "i"}}
            ]
        }).select("name id").limit(25).exec((err, games) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, games});
        })
    })
})

module.exports = router;