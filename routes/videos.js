const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');

const Channel = require('../models/channel');
const Video = require('../models/video');

const logger = require('../modules/logger');
const User = require('../models/user');

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

module.exports = router;