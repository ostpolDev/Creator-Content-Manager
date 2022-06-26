const express = require('express');
const router = express.Router();

const logger = require('../modules/logger');
const validation = require('../modules/validation');
const youtube = require('../modules/youtube');
const rateLimiter = require('../modules/rateLimiter');
const userFunctions = require('../modules/userFunctions');

const {body, validationResult} = require('express-validator');

const User = require('../models/user');
const Channel = require('../models/channel');
const { isValidObjectId } = require('mongoose');

router.get('/', validation.ensureAuthenticated, (req, res) => {
    Channel.find({$or: [
        {createdBy: req.user.id},
        {access: req.user.id}
    ]}).select("name id thumbnails statistics createdBy").populate("createdBy").exec((err, channels) => {
        if (err) {
            logger.error(err);
        }
        res.render('channels/index', {
            title: "Channels",
            channels
        })
    })
})

router.get('/add', validation.ensureAuthenticated, (req, res) => {
    res.render('channels/add', {
        title: "Add channel"
    })
})

router.post('/add', validation.ensureAuthenticated, [
    body("id", "ID has to be 24 characters in length").isLength(24)
], rateLimiter.apiRequestRateLimiterMiddleware, async (/**@type {Request} */ req,/**@type {Response} */ res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/channels/add');
        return;
    }
    let id = req.body.id;

    let start = new Date();

    let youtubeCount = await userFunctions.getChannelCount(id);
    if (youtubeCount > 0) {
        req.flash('danger', "This channel already exists.");
        res.redirect('/channels/add');
        return;
    }

    let channelInfo = await youtube.getChannelInfo(encodeURIComponent(id));

    if (!channelInfo || !channelInfo.items) {
        req.flash('danger', "The channel was not found");
        res.redirect('/channels/add');
        return;
    }

    let item = channelInfo.items[0];
    if (!item) {
        req.flash('danger', "The channel was not found");
        res.redirect('/channels/add');
        return;
    }

    let end = new Date();

    let snippet = item.snippet;
    let stats = item.statistics;
    let status = item.status;

    let newChannel = new Channel({
        createdBy: req.user.id,
        name: snippet.title,
        thumbnails: snippet.thumbnails,
        youtubeId: item.id,
        url: `https://www.youtube.com/channel/${item.id}`,
        description: snippet.localized.description,
        meta: {
            requestInfo: {
                lastRequest: start,
                start,
                end,
                time: end.getTime() - start.getTime()
            }
        },
        statistics: stats,
        status
    })

    newChannel.save((err, channel) => {
        if (err) {
            logger.error(err);
            req.flash('danger', "Something went wrong. Please try again later...");
            res.redirect('/channels');
            return;
        }

        req.flash('success', "Successfully added the channel \"" + channel.name + "\"");
        res.redirect("/channels/v/"+channel.id);
    })

})

router.get('/v/:id', validation.ensureAuthenticated, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        next({status: 404});
        return;
    }

    Channel.findById(id).exec((err, channel) => {
        if (err) {
            logger.error(err);
            req.flash('danger', "Something went wrong");
            res.redirect('/channels');
            return;
        }
        if (!channel) {
            next({status: 404});
            return;
        }
        res.render("channels/view", {
            title: channel.name,
            channelToView: channel
        })
    })
})

router.post("/switch/:id", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        res.status(400).json({success: false, msg: "Invalid ID"});
        return;
    }

    Channel.findById(id).select("name id").exec((err, channel) => {
        if (err) {
            logger.error(err);
            res.status(500).json({success: false});
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

module.exports = router;