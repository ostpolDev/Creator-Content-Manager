const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');

const Channel = require('../models/channel');
const Video = require('../models/video');

const {body, validationResult} = require('express-validator');

const logger = require('../modules/logger');
const User = require('../models/user');
const { rateLimiterMiddleware } = require('../modules/rateLimiter');

router.get("/", validation.ensureAuthenticated, (req, res) => {
    Channel.find({$or: [
        {createdBy: req.user.id},
        {access: req.user.id}
    ]}).select("name id").exec((err, channels) => {
        if (err) {
            logger.error(err)
        }
        res.render('videos/index', {
            title: "Videos",
            channels
        })
    })
})

router.get('/add', validation.ensureAuthenticated, (req, res) => {
    User.find({}).select("username").exec((err, users) => {
        res.render('videos/add', {
            title: "Add Video",
            users
        })
    })
})

router.post('/add', rateLimiterMiddleware, [
    body("id", "ID has to be 11 characters long").isLength({min: 11, max: 11}).optional(),
    body("editor", "Editor cannot be longer than 256 characters").isLength({max: 256}).optional(),
    body("starring", "Starring members cannot be longer than 1024 characters").isLength({max: 1024}).optional(),
    body("title", "Title cannot be longer than 70 characters").isLength({max: 70}).optional()
], validation.ensureAuthenticated, (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("danger", e.msg);
        })
        res.redirect('/videos/add');
        return;
    }
})

module.exports = router;