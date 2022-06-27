const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const Asset = require('../models/asset');
const Batch = require('../models/batch');

let fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp"];

router.get('/', (req, res, next) => {
    Asset.countDocuments({}).exec((err, count) => {
        if (err) {
            return next(err);
        }
        Asset.find({}).sort({createdAt: -1}).limit(10).exec((err, assets) => {
            if (err) {
                return next(err);
            }
            res.render('assets/index', {
                title: "Assets",
                count,
                assets
            })
        })
    })
})

router.get('/upload', validation.ensureAuthenticated, (req, res, next) => {
    res.render('assets/upload', {
        title: "Upload assets",
        fileTypes
    })
})

module.exports = router;