const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const assetFunctions = require('../modules/assetFunctions');

const Asset = require('../models/asset');
const Batch = require('../models/batch');

const path = require('path');
const paths = require('../modules/paths');
const fs = require('fs');

const {body, validationResult} = require("express-validator");
const { isValidObjectId } = require('mongoose');
const batchFunctions = require('../modules/batchFunctions');
const marked = require('../modules/marked');

router.get('/', (req, res) => {
    res.render('batches/index', {
        title: "Batches",
        sorts: batchFunctions.sorts
    })
})

router.get('/v/:id', (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Batch.findById(req.params.id).populate("createdBy").exec((err, batch) => {
        if (err) {
            return next(err);
        }
        if (!batch) {
            return next({status: 404})
        }
        Asset.findOne({batch: batch.id}).exec((err, firstAsset) => {
            if (err) {
                return next(err);
            }
            res.render(batch.isAlbum ? 'batches/viewAlbum' : "batches/view", {
                title: batch.name,
                batch,
                firstAsset
            })
        })
    })
})

router.get("/settings/:id", validation.ensureAuthenticated, (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Batch.findOne({
        _id: id, createdBy: req.user.id
    }).exec((err, batch) => {
        if (err) {
            return next(err);
        }
        if (!batch) {
            return next({status: 404});
        }
        res.render("batches/settings", {
            title: "Batch settings",
            batch
        })
    })
})

router.post("/save/:id", [
    body("batchName", "Batch name cannot be longer than 256 characters").isLength({max: 256}),
    body("about", "About text cannot be longer than 10,000 characters").isLength({max: 10000}),
], validation.ensureAuthenticated, (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.array().forEach(e => {
            req.flash("error", e.msg)
        })
        return res.redirect('/assets/batches/settings/'+encodeURIComponent(req.params.id));
    }
    
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        req.flash('danger', "Batch not found");
        return res.redirect("/");
    }

    let name = req.body.batchName;
    let about = req.body.about;
    let isAlbum = req.body.album !== undefined;

    Batch.updateOne({
        _id: id,
        createdBy: req.user.id
    }, {$set: {
        "name": name,
        "customInfo.description.raw": about,
        "customInfo.description.rendered": marked.markAndSanitize(about),
        "isAlbum": isAlbum
    }}).exec((err) => {
        if (err) {
            logger.error(err);
            req.flash('danger', "Something went wrong");
        } else {
            req.flash('success', "Successfully updated batch information");
        }
        res.redirect('/assets/batches/settings/'+encodeURIComponent(id));
    })
})

router.get('/cover/:id', (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).send();
    }
    Batch.findOne({_id: id, isAlbum: true, "cover.hasCover": true}).select("cover isAlbum").exec((err, batch) => {
        if (err) {
            logger.error(err);
            return res.status(500).send();
        }
        if (!batch) {
            return res.status(404).send();
        }
        let filePath = path.join(paths.coverPath, batch.id + batch.cover.extention);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send();
        }
        return res.status(200).sendFile(filePath);
    })
})

module.exports = router;