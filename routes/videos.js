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
const userFunctions = require('../modules/userFunctions');
const { isValidObjectId } = require('mongoose');
const marked = require('../modules/marked');

router.use("*", (req, res, next) => {
    res.locals.sorts = videoFunctions.sorts;
    next();
})

router.get("/", validation.ensureAuthenticated, validation.ensureChannel, async (req, res, next) => {
    res.render('videos/index', {
        title: "Videos",
        sorts: videoFunctions.sorts
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

    Video.findById(id).populate("channel createdBy editor starring assets").populate("games", "header developers description name").exec((err, video) => {
        if (err) {
            return next(err);
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
                description,
                assets: video.assets
            })
        } else {
            return next({status: 404});
        }
    })
})

router.get('/update/:id', validation.ensureAuthenticated, rateLimiter.apiRequestRateLimiterMiddleware, async (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    let updateVideoResult = await videoFunctions.updateVideoData(id, req);
    if (updateVideoResult.success === false) {
        req.flash('danger', updateVideoResult.msg);
    } else {
        req.flash('success', "Successfully updated video info");
    }
    res.redirect('/videos/v/'+id);
})

let settings = ["general", "assets", "games", "change channel", "delete"];

router.get('/settings/:id', validation.ensureAuthenticated, validation.ensureChannel, (req, res, next) => {
    res.redirect('/videos/settings/'+encodeURIComponent(req.params.id)+"/"+encodeURIComponent(settings[0]));
})

router.get("/settings/:id/:setting", validation.ensureAuthenticated, validation.ensureChannel, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    let setting = req.params.setting;
    if (!settings.includes(setting)) {
        return next({status: 404});
    }

    Video.findById(id).populate("channel meta.move.from meta.move.to meta.move.by").exec(async (err, video) => {
        if (err) {
            return next(err);
        }

        let accessResponse = await channelFunctions.hasAccessToChannel(video.channel.id, req.user.id);
        if (!accessResponse.success || !accessResponse.hasAccess) {
            return next({status: 404});
        }
        if (!video) {
            return next({status: 404});
        }
        res.render('videos/settings', {
            title: "Video settings",
            video,
            setting,
            settings
        })
    })
})

router.post('/settings/:id/save/general', [
    body("id", "ID has to be 11 characters long").optional({checkFalsy: true}).isLength({min: 11, max: 11}),
    body("editor", "Editor cannot be longer than 256 characters").isLength({max: 256}).optional(),
    body("starring", "Starring members cannot be longer than 1024 characters").isLength({max: 1024}).optional(),
    body("title", "Title cannot be longer than 70 characters").isLength({max: 70}).optional(),
    body("channel", "Channel is required").notEmpty()
], validation.ensureAuthenticated, async (req, res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/videos/add');
        return;
    }

    let videoId = req.params.id;

    let youtubeId = req.body.id;
    let channel = req.body.channel;

    if (!isValidObjectId(channel)) {
        req.flash('danger', "Invalid channel");
        res.redirect('/');
        return;
    }

    if (!isValidObjectId(videoId)) {
        req.flash('danger', "The internal video id is invalid");
        return res.redirect("/videos");
    }

    let channelAccessResponse = await channelFunctions.hasAccessToChannel(channel, req.user.id);
    if (channelAccessResponse.success === false || channelAccessResponse.hasAccess === false) {
        req.flash('danger', "Invalid channel");
        res.redirect('/');
        return;
    }

    Video.findById(videoId).exec(async (err, video) => {
        if (err) {
            return next(err);
        }
        if (!video) {
            req.flash('danger', "Video not found");
            return res.redirect("/videos");
        }

        try {
            if (youtubeId && youtubeId.trim() != "") {
                await videoFunctions.addYoutubeInfoToVideoModel(video, youtubeId, req);
            } else {
                video.title = req.body.title;
            }

            let editor = req.body.editor;
            let starring = req.body.starring;

            let editorString, starringString;
            if (editor) {
                let editorResponse = await userFunctions.getUsers(editor, "username");
                if (editorResponse.users) {
                    let editorNameArray = editorResponse.users.map(x => x.username);
                    editorString = editorNameArray.join(", ");
                }
            }

            if (starring) {
                let starringResponse = await userFunctions.getUsers(starring, "username");
                if (starringResponse.users) {
                    let starringNameArray = starringResponse.users.map(x => x.username);
                    starringString = starringNameArray.join(", ");
                }
            }

            video.editor = editor;
            video.starring = starring;
            video.meta.editorsString = editorString;
            video.meta.starringString = starringString;

            video.save((err) => {
                if (err) {
                    return next(err);
                }
                req.flash('success', "Successfully saved video settings");
                return res.redirect("/videos/settings/"+video.id+"/general");
            })
        } catch (e) {
            return next(e);
        }
    })

})

module.exports = router;