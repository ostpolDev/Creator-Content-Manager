const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const assetFunctions = require('../modules/assetFunctions');
const userFunctions = require('../modules/userFunctions');
const videoFunctions = require('../modules/videoFunctions');
const batchFunctions = require('../modules/batchFunctions');

const Asset = require('../models/asset');
const Meta = require('../models/meta');
const User = require('../models/user');
const Batch = require('../models/batch');

const path = require('path');
const paths = require('../modules/paths');
const fs = require('fs');

const {body, validationResult} = require("express-validator");
const { isValidObjectId } = require('mongoose');
const marked = require('../modules/marked');

router.use("*", (req, res, next) => {
    res.locals.fileTypes = assetFunctions.fileTypes;
    res.locals.assetTypes = assetFunctions.assetTypes;
    res.locals.licenceTypes = assetFunctions.licenceTypes;
    res.locals.sorts = assetFunctions.sorts;
    next();
})

router.get('/', (req, res, next) => {
    Asset.countDocuments({}).exec((err, count) => {
        if (err) {
            return next(err);
        }
        let assetQuery = {};
        if (req.user && req.user.meta.preferences.disableNSFW == true) {
            assetQuery["nsfw"] = {$ne: true};
        }
        Asset.find(assetQuery).sort({createdAt: -1}).limit(10).exec((err, assets) => {
            if (err) {
                return next(err);
            }

            Asset.aggregate([
                {$match: {}},
                {$group: {
                    _id: null,
                    totalSize: {
                        $sum: "$size"
                    }
                }}
            ]).exec((err, result) => {
                if (err) {
                    logger.error(err);
                }

                Batch.find({isAlbum: true, "cover.hasCover": true}).select("name _id length").limit(4).sort({createdAt: -1}).exec((err, albums) => {
                    if (err) {
                        logger.error(err);
                    }

                    res.render('assets/index', {
                        title: "Assets",
                        count,
                        assets,
                        totalSize: result[0] ? result[0].totalSize : -1,
                        albums
                    })
                })

            })

        })
    })
})

router.get('/v/:id', (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Asset.findById(id).populate("createdBy").populate("batch").exec((err, asset) => {
        if (err) {
            return next(err);
        }
        if (!asset) {
            return next({status: 404});
        }
        Meta.findOne({batch: asset.batch._id}).select("_id").exec((err, meta) => {
            if (err) {
                next(err);
            }

            let content = "";
            if (asset.extention == ".txt" || asset.extention == ".md") {
                let filePath = path.join(paths.upload, asset.uuid + asset.extention);
                if (fs.existsSync(filePath)) {
                    content = fs.readFileSync(filePath);
                    if (asset.extention == ".md") {
                        content = marked.markAndSanitize(content);
                    } else {
                        content = marked.sanitizeFull(content);
                    }
                }
            }

            User.countDocuments({favorites: asset.id}).exec((err, favoriteCount) => {
                if (err) {
                    return next(err);
                }
                res.render('assets/view', {
                    title: asset.meta.hasCustomName ? asset.name : asset.cleanName,
                    asset,
                    dbMeta: meta,
                    favoriteCount,
                    sorts: videoFunctions.sorts,
                    content
                })
            })
        })
    })
})

router.get('/upload', validation.ensureAuthenticated, (req, res, next) => {
    res.render('assets/upload', {
        title: "Upload assets"
    })
})

router.post('/upload', [
    body("name", "Name cannot be longer than 256 characters").isLength({max: 256}),
    body("batchName", "Batch name cannot be longer than 256 characters").isLength({max: 256}),
    body("about", "About text cannot be longer than 10,000 characters").isLength({max: 10000}),
    body("legalInfo", "Legal information cannot be longer than 4096 characters").isLength({max: 4096}),
    body("assetType", "Asset type is required").notEmpty().isLength({max: 128}),
    body("tags", "Tags cannot be longer than 2048 characters").isLength({max: 2048}),
    body("source", "Source has to be a valid URL").optional({checkFalsy: true}).isURL(),
    body("price", "The price has to be a valid number").optional({checkFalsy: true}).isFloat({min: 0.0, max: 1000.0}),
    body("licence", "Licence is too long").isLength({max: 512})
], validation.ensureAuthenticated, async (req, res, /**@type {import('express').NextFunction} */ next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("error", e.msg)
        })
        return res.redirect('/assets/upload');
    }

    if (!req.files || !req.files.assets) {
        req.flash('error', "At least one file is required");
        return res.redirect('/assets/upload');
    }

    let assetFileHandleResponse = await assetFunctions.handleFiles(req);
    if (assetFileHandleResponse.success === false) {
        req.flash('error', assetFileHandleResponse.msg);
        res.redirect('/assets/upload');
    } else {
        req.flash('success', "Successfully uploaded your assets");
        res.redirect('/assets/batches/v/' + assetFileHandleResponse.batchId);
    }
})

router.get('/getFile/:id', (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).send();
    }

    Asset.findById(id).select("uuid extention").exec((err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).send();
        }
        if (!asset) {
            return res.status(404).send();
        }

        let filePath = path.join(paths.upload, asset.uuid + asset.extention);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send();
        }

        return res.status(200).sendFile(filePath);
        
    })
})

router.get('/download/:id', (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).send();
    }

    Asset.findById(id).select("uuid batch extention mimetype originalName extention").exec(async (err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).send();
        }
        if (!asset) {
            return res.status(404).send();
        }

        let filePath = path.join(paths.upload, asset.uuid + asset.extention);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send();
        }

        if (req.headers.referer) {
            await assetFunctions.updateDownloadCount(asset.id);
            await batchFunctions.uploadTotalDownloads(asset.batch);
        }

        res.setHeader('Content-disposition', 'attachment; filename=' + asset.originalName);
        res.setHeader('Content-type', asset.mimetype);

        var filestream = fs.createReadStream(filePath);
        filestream.pipe(res);

        
    })
})

router.get('/favorites/:name', async (req, res, next) => {
    let name = req.params.name;

    User.findOne({$or: [
        {username: name},
        {safeName: name}
    ]}).exec((err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next({status: 404});
        }

        if ((!req.user && user.meta.preferences.hiddenFavorites) || (req.user && user.meta.preferences.hiddenFavorites && req.user.id != user.id)) {
            return next({status: 404});
        }
        res.render('assets/specialList', {
            title: name + "'s favorites",
            type: "userFav",
            userName: user.username
        })
    })
})

router.get('/user/:name', async (req, res, next) => {
    let name = req.params.name;

    User.findOne({$or: [
        {username: name},
        {safeName: name}
    ]}).exec((err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next({status: 404});
        }

        Asset.countDocuments({createdBy: user.id, nsfw: true}).exec((err, count) => {
            if (err) {
                return next(err);
            }
            res.render('assets/specialList', {
                title: user.username + "'s assets",
                type: "user",
                userName: user.username,
                nsfwCount: count
            })
        })

    })
})

router.get("/category/:cat", (req, res, next) => {
    let category = req.params.cat;
    if (!assetFunctions.assetTypes.includes(category)) {
        return next({status: 404});
    }
    Asset.countDocuments({assetType: category, nsfw: true}).exec((err, count) => {
        if (err) {
            return next(err);
        }
        res.render('assets/specialList', {
            title: capitalize(category) + " assets",
            capitalized: true,
            type: "assetType",
            assetType: category,
            nsfwCount: count
        })
    })
})

function capitalize(string) {
    return string && string.length > 1 ? string.charAt(0).toUpperCase() + string.slice(1) : string;
}

router.get('/settings/:id', validation.ensureAuthenticated, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Asset.findOne({_id: id, createdBy: req.user.id}).exec((err, asset) => {
        if (err) {
            return next(err);
        }
        if (!asset) {
            return next({status: 404});
        }
        res.render('assets/settings', {
            title: "Asset settings",
            asset
        });
    })
})

router.post('/settings/save/:id', [
    body("name", "Name cannot be longer than 256 characters").isLength({max: 256}),
    body("about", "About text cannot be longer than 10,000 characters").isLength({max: 10000}),
    body("legalInfo", "Legal information cannot be longer than 4096 characters").isLength({max: 4096}),
    body("assetType", "Asset type is required").notEmpty().isLength({max: 128}),
    body("tags", "Tags cannot be longer than 2048 characters").isLength({max: 2048}),
    body("source", "Source has to be a valid URL").optional({checkFalsy: true}).isURL(),
    body("price", "The price has to be a valid number").optional({checkFalsy: true}).isFloat({min: 0.0, max: 1000.0}),
    body("licence", "Licence is too long").isLength({max: 512})
], validation.ensureAuthenticated, async (req, res, /**@type {import('express').NextFunction} */ next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("error", e.msg)
        })
        return res.redirect('/assets/settings/'+encodeURIComponent(req.params.id));
    }

    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Asset.findOne({
        _id: id, createdBy: req.user.id
    }).exec((err, asset) => {
        if (err) {
            return next(err);
        }
        if (!asset) {
            return next({status: 404});
        }

        let name = req.body.name.trim();
        let about = req.body.about;
        let legalInfo = req.body.legalInfo;
        let assetType = req.body.assetType;
        let tags = req.body.tags;
        let source = req.body.source;
        let price = req.body.price;
        let licence = req.body.licence;
        let nsfw = req.body.nsfw != undefined;

        let canUseVideos = req.body.videos != undefined;
        let canUseStreaming = req.body.streaming != undefined;

        let isPurchased = false;
        if (!isNaN(price) && price > 0.0) {
            isPurchased = true;
        }

        if (!assetFunctions.assetTypes.includes(assetType)) {
            return res({success: false, msg: "Invalid asset type"});
        }

        if (licence && licence != "undefined" && licence != undefined) {
            if (!Object.keys(assetFunctions.licenceTypes).includes(licence)) {
                return res({success: false, msg: "Invalid licence"});
            }
        }

        asset.name = name || asset.originalName;
        asset.description = {
            raw: about,
            rendered: marked.markAndSanitize(about)
        };
        asset.legalInfo = legalInfo;
        asset.assetType = assetType;
        asset.tagsString = tags;
        asset.tags = tags.split(",");
        asset.purchase = {
            isPurchased,
            price,
            purchasedBy: req.user.id
        };
        asset.meta.hasCustomName = name != "";
        asset.allowedPlatforms = {
            videos: canUseVideos,
            streams: canUseStreaming
        }
        asset.source = source;
        asset.licence = licence;
        asset.nsfw = nsfw;

        asset.save(async (err) => {
            if (err) {
                return next(err);
            }

            await assetFunctions.updateBatchNSFWStatus(asset.batch);

            req.flash('success', "Successfully saved asset info");
            res.redirect('/assets/v/'+asset.id);
        })



    })
})

router.get("/search", (req, res, next) => {
    let query = req.query.q;
    Asset.countDocuments({nsfw: true}).exec((err, count) => {
        if (err) {
            return next(err);
        }
        res.render('assets/specialList', {
            title: "Asset Search",
            type: "globalSearch",
            query,
            nsfwCount: count
        })
    })
})

router.get('/random', (req, res, next) => {

    Asset.countDocuments({}).exec(function (err, count) {

        var random = Math.floor(Math.random() * count)
      
        Asset.findOne({}).select("_id").skip(random).exec((err, asset) => {
            if (!asset) {
                return next({status: 404})
            }
            res.redirect('/assets/v/'+asset._id)
        })
    })
})

router.get('/random/download', (req, res, next) => {

    Asset.countDocuments({}).exec(function (err, count) {

        var random = Math.floor(Math.random() * count)
      
        Asset.findOne({}).select("_id").skip(random).exec((err, asset) => {
            if (!asset) {
                return next({status: 404})
            }
            res.redirect('/assets/download/'+asset._id)
        })
    })
})

router.use("/batches", require('./batches'));

module.exports = router;