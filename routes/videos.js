const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');

const Channel = require('../models/channel');
const Video = require('../models/video');

const {body, validationResult} = require('express-validator');

const logger = require('../modules/logger');
const User = require('../models/user');
const rateLimiter = require('../modules/rateLimiter');
const channelFunctions = require('../modules/channelFunctions');
const videoFunctions = require('../modules/videoFunctions');
const { isValidObjectId } = require('mongoose');
const marked = require('../modules/marked');

let sorts = {
    "Title": "title",
    "Upload Date": "meta.publishedAt",
    "Added Date": "createdAt",
    "Views": "statistics.viewCount",
    "Likes": "statistics.likeCount",
    "Comments": "statistics.commentCount",
    "Category": "categoryId",
    "Made for Kids": "status.madeForKids",
    "Licence": "status.licence",
    "YouTube ID": "youtubeId"
}

router.get("/", validation.ensureAuthenticated, validation.ensureChannel, (req, res) => {
    let currentSort = req.query.sort;
    let currentOrder = req.query.order;
    let currentQuery = req.query.q;

    if (!currentSort || !Object.keys(sorts).includes(currentSort)) {
        currentSort = "Upload Date";
    }

    if (!currentOrder || (currentOrder != "1" && currentOrder != "-1")) {
        currentOrder = "-1";
    }

    currentOrder = parseInt(currentOrder);

    let videoQuery = {
        channel: res.locals.channel.id
    };

    let videoSort = {}

    let field = sorts[currentSort];

    videoSort[field] = currentOrder;

    let selects = ["title", "statistics", "isEmpty", "createdAt", "thumbnails", "meta"];
    if (!field.startsWith("statistics") && !field.startsWith("meta") && !selects.includes(field)) {
        selects.push(field);
    }

    Channel.find({$or: [
        {createdBy: req.user.id},
        {access: req.user.id}
    ]}).select("name id").exec((err, channels) => {
        if (err) {
            logger.error(err)
        }
        Video.find(videoQuery).sort(videoSort).select(selects.join(" ")).limit(40).sort({createdAt: -1}).exec((_err, videos) => {
            if (_err) {
                logger.error(_err)
            }
            res.render('videos/index', {
                title: "Videos",
                channels,
                videos,
                sorts,
                currentSort,
                currentOrder,
                currentQuery,
                field
            })
        })
    })
})

router.get('/add', validation.ensureAuthenticated, validation.ensureChannel, (req, res) => {
    User.find({}).select("username").exec((err, users) => {
        res.render('videos/add', {
            title: "Add Video",
            users
        })
    })
})

router.post('/add', rateLimiter.apiRequestRateLimiterMiddleware, [
    body("id", "ID has to be 11 characters long").optional({checkFalsy: true}).isLength({min: 11, max: 11}),
    body("editor", "Editor cannot be longer than 256 characters").isLength({max: 256}).optional(),
    body("starring", "Starring members cannot be longer than 1024 characters").isLength({max: 1024}).optional(),
    body("title", "Title cannot be longer than 70 characters").isLength({max: 70}).optional(),
    body("channel", "Channel is required").notEmpty()
], validation.ensureAuthenticated, async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/videos/add');
        return;
    }

    let id = req.body.id;
    let channel = req.body.channel;

    if (!isValidObjectId(channel)) {
        req.flash('danger', "Invalid channel");
        res.redirect('/');
        return;
    }

    let channelAccessResponse = await channelFunctions.hasAccessToChannel(channel, req.user.id);
    if (channelAccessResponse.success === false || channelAccessResponse.hasAccess === false) {
        req.flash('danger', "Invalid channel");
        res.redirect('/');
        return;
    }

    let videoCreationResponse = await videoFunctions.createVideo(id, channelAccessResponse.channel, req);
    if (videoCreationResponse.success === false) {
        req.flash('danger', videoCreationResponse.msg);
        res.redirect('/videos/add');
        return;
    }

    req.flash("success", videoCreationResponse.msg);
    res.redirect('/videos/v/'+videoCreationResponse.video.id);

})

router.get('/v/:id', validation.ensureAuthenticated, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Video.findById(id).populate("channel createdBy editor starring").exec((err, video) => {
        if (err) {
            logger.error(err);
            req.flash('danger', "Something went wrong");
            res.redirect('/videos');
            return;
        }
        if (!video) {
            return next({status: 404});
        }
        if (video.channel.createdBy == req.user.id || video.channel.access.includes(req.user.id)) {
            let description = video.description;
            if (description) {
                description = marked.sanitizeDefault(description);
            }
            res.render("videos/view", {
                title: video.title,
                video,
                description
            })
        } else {
            return next({status: 404});
        }
    })
})

module.exports = router;