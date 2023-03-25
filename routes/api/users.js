const express = require('express');
const router = express.Router();

const userFunctions = require('../../modules/userFunctions');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');
const validation = require('../../modules/validation');

const User = require('../../models/user');

router.post("/modifyFavorite", validation.ensureAuthenticated, async (req, res) => {
    let id = req.body.asset;
    let type = req.body.type;
    if (!isValidObjectId(id) || !type) {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    if (type != "add" && type != "remove") {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    let result = await userFunctions.modifyFavorite(req.user.id, id, type);
    if (result.success === false) {
        return res.status(500).json({success: false, msg: "Something went wrong"});
    }
    return res.status(200).json({success: true, isInFavorites: result.isInFav});
})

router.get('/getDisplayInfo/:name', (req, res) => {
    let name = req.params.name;
    if (!name) {
        return res.status(400).json({success: false});
    }

    User.findOne({$or: [
        {username: name},
        {safeName: name}
    ]}).select("mailHash username safeName").exec((err, user) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!user) {
            return res.status(404).json({success: false});
        }
        return res.status(200).json({success: true, info: {
            avatarUrl: "https://www.gravatar.com/avatar/"+user.mailHash,
            username: user.username,
            safeName: user.safeName,
            hash: user.mailHash,
            pageUrl: "/users/v/"+encodeURIComponent(user.safeName)
        }});
    })
})

router.get('/getCardInfo/:name', (req, res) => {
    let name = req.params.name;
    if (!name) {
        return res.status(400).json({success: false});
    }

    User.findOne({$or: [
        {username: name},
        {safeName: name}
    ]}).select("mailHash username name safeName meta.assetCount").exec((err, user) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!user) {
            return res.status(404).json({success: false});
        }
        return res.status(200).json({success: true, info: {
            avatarUrl: "https://www.gravatar.com/avatar/"+user.mailHash,
            username: user.username,
            safeName: user.safeName,
            hash: user.mailHash,
            assetCount: user.meta.assetCount,
            name: user.name,
            pageUrl: "/users/v/"+encodeURIComponent(user.safeName)
        }});
    })
})

router.get("/getUsernames", validation.ensureAuthenticated, (req, res) => {
    User.find({}).select("username id").exec((err, users) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }
        return res.status(200).json({success: true, users});
    })
})

module.exports = router;