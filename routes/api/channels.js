const express = require('express');
const router = express.Router();

const Channel = require('../../models/channel');
const Video = require('../../models/video');
const User = require('../../models/user');
const userFunctions = require('../../modules/userFunctions');
const validation = require('../../modules/validation');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');
const randomWords = require('random-words');

router.post("/switch/:id", validation.ensureAuthenticated, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        res.status(400).json({success: false, msg: "Invalid ID"});
        return;
    }

    Channel.findOne({
        _id: id,
        $or: [
            {createdBy: req.user.id},
            {access: req.user.id}
        ]
    }).select("name id").exec((err, channel) => {
        if (err) {
            res.status(500).json({success: false, msg: "Something went wrong"});
            return;
        }
        if (!channel) {
            res.status(404).json({success: false, msg: "Channel not found"});
            return;
        }
        res.cookie("channel", channel.id, {maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true})
        res.status(200).json({success: true});
    })
})

router.get('/getAccessUsers/:id', validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false});
    }

    Channel.findOne({_id: id, createdBy: req.user.id}).populate("access").exec((err, channel) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!channel) {
            return res.status(404).json({success: false});
        }

        let channelAccess = channel.access.map(x => ({id: x._id, username: x.username, safeName: x.safeName}));
        return res.status(200).json({success: true, users: channelAccess});
    })
})

router.get("/searchNewUsers/:storageId", validation.ensureAuthenticated, (req, res) => {
    let storageId = req.params.storageId;
    if (!isValidObjectId(storageId)) {
        return res.status(400).json({success: false});
    }
    let query = req.query.q;
    if (!query) {
        return res.status(400).json({success: false});
    }

    Channel.findOne({_id: storageId, createdBy: req.user.id}).select("createdBy access").exec((err, channel) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!channel) {
            return res.status(404).json({success: false});
        }

        User.find({
            _id: {$not: {$in: channel.access}, $ne: channel.createdBy},
            $or: [
            {username: {$regex: query, $options: "i"}},
            {safeName: {$regex: query, $options: "i"}},
            {name: {$regex: query, $options: "i"}}
        ]}).limit(10).select("id username safeName").exec((err, users) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, users});
        })
    })
})

router.post('/addAccess', validation.ensureAuthenticated, async (req, res) => {
    let channel = req.body.channel;
    let user = req.body.user;

    if (!isValidObjectId(channel)) {
        return res.status(400).json({success: false, msg: "Invalid channel id"});
    }

    let userExists = await userFunctions.userExists(user);
    if (!userExists) {
        return res.status(400).json({success: false, msg: "User not found"});
    }

    Channel.findOne({_id: channel, createdBy: req.user.id}).exec((err, channel) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!channel) {
            return res.status(404).json({success: false, msg: "Storage not found"});
        }
        if (channel.access.includes(user)) {
            return res.status(200).json({success: true, msg: "User already has access to this channel"});
        }
        channel.access.push(user);
        channel.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "User added to channel access list"});
        })
    })
})

router.post('/removeAccess', validation.ensureAuthenticated, async (req, res) => {
    let channel = req.body.channel;
    let user = req.body.user;

    if (!isValidObjectId(channel)) {
        return res.status(400).json({success: false, msg: "Invalid channel id"});
    }

    let userExists = await userFunctions.userExists(user);
    if (!userExists) {
        return res.status(400).json({success: false, msg: "User not found"});
    }

    Channel.findOne({_id: channel, createdBy: req.user.id}).exec((err, channel) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!channel) {
            return res.status(404).json({success: false, msg: "Storage not found"});
        }
        let index = channel.access.indexOf(user);
        if (index === -1) {
            return res.status(200).json({success: true, msg: "User is not in this channel"});
        }
        channel.access.splice(index, 1);
        channel.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, msg: "User removed from channel access list"});
        })
    })
})

router.get('/getWithAccess', validation.ensureAuthenticated, (req, res) => {

    let except = req.query.except;

    let query = {
        $or: [
            {createdBy: req.user.id},
            {access: req.user.id}
        ]
    }

    if (except && isValidObjectId(except)) {
        query._id = {$ne: except};
    }

    Channel.find(query).select("name _id customUrl").exec((err, channels) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        return res.status(200).json({success: true, channels});
    })
})

router.get("/description/:videoid", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.videoid;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid ID"});
    }

    Video.findById(id).populate("channel", "access createdBy descriptionTemplate").populate("assets", "legalInfo").populate("editor", "username").populate("starring", "username").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video.channel.access.includes(req.user.id) && video.channel.createdBy != req.user.id) {
            return res.status(403).json({success: false, msg: "Permission denied"});
        }
        if (!video.channel.descriptionTemplate || !video.channel.descriptionTemplate.text || video.channel.descriptionTemplate.text.trim() == "") {
            return res.status(404).json({success: false, msg: "No description template found for this channel"});
        }

        let text = video.channel.descriptionTemplate.text;

        try {
            text = text.replace(/{name}/gi, video.name);
            text = text.replace(/{date}/gi, formatDate(new Date()));
            text = text.replace(/{editor}/gi, video.editor.username);
            text = text.replace(/{starring}/gi, video.starring.map(x => x.username).join(", "));
            text = text.replace(/{legal}/gi, video.assets.map(x => x.legalInfo).join("\n\n"));
            text = text.replace(/{dictionary}/gi, randomWords());
            return res.status(200).json({success: true, description: text});
        } catch (e) {
            logger.error(e);
            return res.status(500).json({success: false, msg: "Something went wrong when generating the description text"});
        }



    })
})

function formatDate(date) {
    if (date == undefined) {
        return "--";
    }
    var monthNames = [
        "January", "Feburary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ];

    if (typeof date === "string") {
        date = new Date(date);
    }

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return monthNames[monthIndex] + ' ' + day + ', ' + year;
}


module.exports = router;