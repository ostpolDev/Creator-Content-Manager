const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');
const logger = require('../modules/logger');

const assetFunctions = require('../modules/assetFunctions');

const Asset = require('../models/asset');
const Batch = require('../models/batch');

const {body, validationResult} = require("express-validator");
const { isValidObjectId } = require('mongoose');

router.get('/v/:id', (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return next({status: 404});
    }

    Batch.findById(req.params.id).populate("createdBy").exec((err, batch) => {
        if (err) {
            return next(err);
        }
        res.render(batch.isAlbum ? 'batches/viewAlbum' : "batches/view", {
            title: batch.name,
            batch
        })
    })
})

module.exports = router;