const express = require('express');
const router = express.Router();

const Meta = require('../../models/meta');
const Asset = require('../../models/asset');
const Batch = require('../../models/batch');
const User = require('../../models/user');

const validation = require('../../modules/validation');

const batchFunctions = require('../../modules/batchFunctions');
const assetFunctions = require('../../modules/assetFunctions');
const userFunctions = require('../../modules/userFunctions');
const renderer = require('../../modules/pugRenderer');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');

router.use("*", (req, res, next) => {
    res.locals.sorts = batchFunctions.sorts;
    next();
})

router.get('/get', async(req, res) => {

    let batchListResult = await batchFunctions.getList(req);
    if (batchListResult.success === false) {
        return res.status(400).json({success: false, msg: batchListResult.msg});
    }

    return res.status(200).json({
        success: true, 
        items: batchListResult.batches.length,
        reachedEnd: batchListResult.batches.length < batchListResult.params.limit,
        params: batchListResult.params,
        batches: batchListResult.batches
    })

})

router.get('/get/rendered', async(req, res) => {

    let batchListResult = await batchFunctions.getList(req);
    if (batchListResult.success === false) {
        return res.status(400).json({success: false, msg: batchListResult.msg});
    }

    let renderedResult = renderer.render("batches/batchList", {
        batches: batchListResult.batches,
        field: batchListResult.params.field,
        user: req.user
    })

    if (!renderedResult) {
        return res.status(500).json({success: false, msg: "Something went wrong when rendering"});
    }

    return res.status(200).json({
        success: true, 
        items: batchListResult.batches.length,
        reachedEnd: batchListResult.batches.length < batchListResult.params.limit,
        params: batchListResult.params,
        renderedResult
    })

})

router.post('/delete/:id', validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid ID"});
    }

    Batch.findOneAndRemove({
        _id: id,
        createdBy: req.user.id
    }).exec((err, batch) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong (x0)"});
        }
        if (!batch) {
            return res.status(404).json({success: false, msg: "Batch not found"});
        }

        batchFunctions.deleteCover(batch);

        Meta.findOneAndRemove({
            batch: batch.id
        }).exec(async (err, meta) => {
            if (err) {
                logger.error(err);
            }
            if (meta) {
                await assetFunctions.deleteMetaFile(meta);
            }

            Asset.find({batch: batch.id}).select("uuid extention _id").exec((err, assets) => {
                if (err) {
                    logger.error(err);
                    return res.status(500).json({success: false, msg: "Something went wrong (x1)"});
                }

                let ids = assets.map(x => x.id);

                assetFunctions.deleteManyFiles(assets);

                User.updateMany({}, {$pullAll: {favorites: ids}}, {new: true}).exec((err) => {
                    if (err) {
                        logger.error(err);
                        return res.status(500).json({success: false, msg: "Something went wrong (x3)"});
                    }
                    Asset.deleteMany({batch: batch.id}).exec(async (err) => {
                        if (err) {
                            logger.error(err);
                            return res.status(500).json({success: false, msg: "Something went wrong (x2)"});
                        }
    
                        await userFunctions.redoAssetCount(req.user.id);
    
                        return res.status(200).json({success: true});
    
                    })
                })

            })
        })
    })
})

router.post("/rename", validation.ensureAuthenticated, (req, res) => {
    let name = req.body.name;
    let id = req.body.batch;

    if (!isValidObjectId(id) || !name || name.length > 256) {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    Batch.findOneAndUpdate({
        _id: id,
        createdBy: req.user.id
    }, {$set: {
        "name": name
    }}).exec((err) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Could not save"});
        }
        return res.status(200).json({success: true});
    })
})

module.exports = router;