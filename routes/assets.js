const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const assetFunctions = require('../modules/assetFunctions');
const userFunctions = require('../modules/userFunctions');

const Asset = require('../models/asset');
const Meta = require('../models/meta');
const User = require('../models/user');

const path = require('path');
const paths = require('../modules/paths');
const fs = require('fs');

const {body, validationResult} = require("express-validator");
const { isValidObjectId } = require('mongoose');

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

router.get('/v/:id', (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Asset.findById(id).populate("createdBy").exec((err, asset) => {
        if (err) {
            return next(err);
        }
        if (!asset) {
            return next({status: 404});
        }
        Meta.findOne({batch: asset.batch}).exec((err, meta) => {
            if (err) {
                next(err);
            }
            let metaPath;
            let metaData;
            if (meta) {
                metaPath = path.join(paths.meta, meta.uuid);
                
                if (fs.existsSync(metaPath)) {
                    metaData = JSON.parse(fs.readFileSync(metaPath));
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
                    meta: metaData,
                    favoriteCount
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
    body("legalInfo", "Legal information cannot be longer than 512 characters").isLength({max: 512}),
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

    Asset.findById(id).select("uuid extention mimetype originalName extention").exec(async (err, asset) => {
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

        await assetFunctions.updateDownloadCount(asset.id);

        res.setHeader('Content-disposition', 'attachment; filename=' + asset.originalName + asset.extention);
        res.setHeader('Content-type', asset.mimetype);

        var filestream = fs.createReadStream(filePath);
        filestream.pipe(res);

        
    })
})

router.get('/favorites/:name', async (req, res, next) => {
    let name = req.params.name;
    let userExists = await userFunctions.userNameExists(name);

    if (!userExists) {
        return next({status: 404});
    }

    res.render('assets/specialList', {
        title: name + "'s favorites",
        type: "userFav",
        user: name
    })
})

router.use("/batches", require('./batches'));

module.exports = router;