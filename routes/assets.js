const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const assetFunctions = require('../modules/assetFunctions');

const Asset = require('../models/asset');
const Batch = require('../models/batch');


const {body, validationResult} = require("express-validator");

router.use("*", (req, res, next) => {
    res.locals.fileTypes = assetFunctions.fileTypes;
    res.locals.assetTypes = assetFunctions.assetTypes;
    res.locals.licenceTypes = assetFunctions.licenceTypes;
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

    if (!req.files && !req.files.assets) {
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

router.use("/batches", require('./batches'));

module.exports = router;