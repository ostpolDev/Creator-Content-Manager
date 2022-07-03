const express = require('express');
const router = express.Router();

const admzip = require('adm-zip');

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
const { Stream } = require('stream');

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

    Batch.findById(req.params.id).populate("createdBy").populate("cover.createdBy", "username safeName").exec((err, batch) => {
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
            res.render("batches/view", {
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
    body("artist", "Artist name cannot be longer than 256 characters").isLength({max: 256}),
    body("about", "About text cannot be longer than 10,000 characters").isLength({max: 10000}),
    body("price", "Price is invalid").isFloat({min: 0, max: 9999})
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
    let artist = req.body.artist;
    let price = req.body.price;

    let isPurchased = false;
    if (!isNaN(price) && price > 0.0) {
        isPurchased = true;
    }

    Batch.updateOne({
        _id: id,
        createdBy: req.user.id
    }, {$set: {
        "name": name,
        "customInfo.description.raw": about,
        "customInfo.description.rendered": marked.markAndSanitize(about),
        "isAlbum": isAlbum,
        "artist": artist,
        "purchase.price": price,
        "purchase.isPurchased": isPurchased,
        "purchase.purchasedBy": req.user.id
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

router.post('/uploadCover/:id', validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    const re = "/assets/batches/v/"+encodeURIComponent(id);
    if (!isValidObjectId(id)) {
        req.flash('danger', "Invalid ID");
        return res.redirect(re);
    }

    let file = req.files.cover;
    if (!file || !file.mimetype.startsWith("image")) {
        req.flash('danger', "Valid cover file required");
        return res.redirect(re);
    }

    Batch.findOne({
        _id: id,
        createdBy: req.user.id
    }).exec((err, batch) => {
        if (err) {
            logger.error(err);
            req.flash('danger', "Something went wrong");
            return res.redirect(re);
        }
        if (!batch) {
            req.flash('danger', "Batch not found");
            return res.redirect(re);
        }

        let extention = path.extname(file.name);
        let coverPath = path.join(paths.coverPath, batch.id + extention);
        file.mv(coverPath, (err) => {
            if (err) {
                logger.error(err);
                req.flash('danger', "Something went wrong when moving");
                return res.redirect(re);
            }

            batch.cover = {
                hasCover: true,
                createdBy: req.user.id,
                updatedAt: new Date(),
                size: file.size,
                extention,
                mimetype: file.mimetype
            }

            batch.save((err) => {
                if (err) {
                    logger.error(err);
                    req.flash('danger', "Something went wrong when saving");
                    return res.redirect(re);
                }
                req.flash('success', "Successfully uploaded cover file");
                return res.redirect(re);
            })

        })

    })
})

router.get("/download/:id", (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Asset.find({batch: id}).select("uuid extention originalName batch").populate("batch", "name").exec((err, assets) => {
        if (err) {
            return next(err);
        }
        if (assets && assets.length > 0) {
            let zip = new admzip();
            assets.forEach(a => {
                let filePath = path.join(paths.upload, a.uuid + a.extention);
                if (fs.existsSync(filePath)) {
                    let content = fs.readFileSync(filePath);
                    zip.addFile(a.originalName, content);
                }
            })

            let batchInfo = JSON.stringify(assets, null, "\t");
            let batchInfoBuffer = Buffer.from(batchInfo, "utf-8");

            zip.addFile("batchinfo.json", batchInfoBuffer);

            let buffer = zip.toBuffer();
            let readStream = new Stream.PassThrough();
            readStream.end(buffer);

            let outputName = assets[0].batch.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            res.set("Content-disposition", "attachment; filename=" + outputName + ".zip");
            res.set("Content-Type", "application/zip");

            readStream.pipe(res);
        } else {
            req.flash('info', "No assets found");
            res.redirect('/assets/batches/v/'+encodeURIComponent(id));
        }
    })
})

module.exports = router;