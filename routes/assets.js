const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const Asset = require('../models/asset');
const Batch = require('../models/batch');

const fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp", ".ogg", ".jpeg", ".pdn"];
const assetTypes = ["music", "soundEffect", "video", "image"];
const licenceTypes = {
    "Attribution": {url: "https://creativecommons.org/licenses/by/4.0", icon: "https://licensebuttons.net/l/by/3.0/88x31.png"},
    "Attribution-ShareAlike": {url: "https://creativecommons.org/licenses/by-sa/4.0", icon: "https://licensebuttons.net/l/by-sa/3.0/88x31.png"},
    "Attribution-NoDerivs": {url: "https://creativecommons.org/licenses/by-nd/4.0", icon: "https://licensebuttons.net/l/by-nd/3.0/88x31.png"},
    "Attribution-NonCommercial": {url: "https://creativecommons.org/licenses/by-nc/4.0", icon: "https://licensebuttons.net/l/by-nc/3.0/88x31.png"},
    "Attribution-NonCommercial-ShareAlike": {url: "https://creativecommons.org/licenses/by-nc-sa/4.0", icon: "https://licensebuttons.net/l/by-nc-sa/3.0/88x31.png"},
    "Attribution-NonCommercial-NoDerivs": {url: "https://creativecommons.org/licenses/by-nc-nd/4.0", icon: "https://licensebuttons.net/l/by-nc-nd/3.0/88x31.png"},
    "CC0": {url: "https://creativecommons.org/publicdomain/zero/1.0/", icon: "https://i.creativecommons.org/p/zero/1.0/88x31.png"}
}

router.use("*", (req, res, next) => {
    res.locals.fileTypes = fileTypes;
    res.locals.assetTypes = assetTypes;
    res.locals.licenceTypes = licenceTypes;
    next();
})

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
        title: "Upload assets"
    })
})

module.exports = router;