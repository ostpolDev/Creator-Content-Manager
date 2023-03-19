const express = require('express');
const router = express.Router();

const validation = require('../../modules/validation');
const logger = require('../../modules/logger');

const assetFunctions = require('../../modules/assetFunctions');
const userFunctions = require('../../modules/userFunctions');
const batchFunctions = require('../../modules/batchFunctions');

const Asset = require('../../models/asset');
const Batch = require('../../models/batch');
const User = require('../../models/user');
const Video = require('../../models/video');
const Meta = require('../../models/meta');

const {body, validationResult} = require("express-validator");
const { isValidObjectId } = require('mongoose');
const renderer = require('../../modules/pugRenderer');

router.get('/getFirstInBatch/:id', (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid ID"});
    }
    
    Asset.findOne({batch: id}).exec((err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }
        return res.status(200).json({success: true, asset});
    })
})

router.get('/get', async(req, res) => {

    let assetListResult = await assetFunctions.getList(req);
    if (assetListResult.success === false) {
        return res.status(400).json({success: false, msg: assetListResult.msg});
    }

    return res.status(200).json({
        success: true, 
        items: assetListResult.assets.length,
        reachedEnd: assetListResult.assets.length < assetListResult.params.limit,
        params: assetListResult.params,
        assets: assetListResult.assets
    })

})

router.get('/get/rendered', async(req, res) => {

    let assetListResult = await assetFunctions.getList(req);
    if (assetListResult.success === false) {
        return res.status(400).json({success: false, msg: assetListResult.msg});
    }

    let renderedResult = renderer.render("assets/assetList", {
        assets: assetListResult.assets,
        field: assetListResult.params.field,
        user: req.user
    })

    if (!renderedResult) {
        return res.status(500).json({success: false, msg: "Something went wrong when rendering"});
    }

    return res.status(200).json({
        success: true, 
        items: assetListResult.assets.length,
        reachedEnd: assetListResult.assets.length < assetListResult.params.limit,
        params: assetListResult.params,
        renderedResult
    })

})

router.get('/get/info/:id', (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid ID"});
    }

    Asset.findById(id).select("name cleanName uuid meta").populate("batch", "name meta artist length isAlbum cover").exec((err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }
        if (!asset) {
            return res.status(404).json({success: false, msg: "Asset not found"});
        }
        return res.status(200).json({success: true, asset});
    })
})

router.get('/get/random/info/:category', (req, res) => {

    let category = req.params.category;
    if (!category || !assetFunctions.assetTypes.includes(category)) {
        return res.status(400).json({success: false, msg: "Invalid params"});
    }

    let query = {
        assetType: category
    }

    Asset.countDocuments(query).exec(function (err, count) {

        var random = Math.floor(Math.random() * count)
      
        Asset.findOne(query).select("_id").skip(random).exec((err, asset) => {
            if (!asset) {
                return res.status(404).json({success: false, msg: "No assets found"});
            }
            res.redirect("/api/assets/get/info/"+asset.id);
        })
    })
})

router.post("/rename", validation.ensureAuthenticated, (req, res) => {
    let name = req.body.name;
    let id = req.body.asset;

    if (!isValidObjectId(id) || !name || name.length > 256) {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    Asset.findOneAndUpdate({
        _id: id,
        createdBy: req.user.id
    }, {$set: {
        "meta.hasCustomName": true,
        "name": name
    }}).exec((err) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Could not save"});
        }
        return res.status(200).json({success: true});
    })
})

router.post("/delete/:id", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        return res.status(400).json({success: false, msg: "Invalid ID"});
    }
    

    Asset.findOneAndRemove({
        _id: id,
        createdBy: req.user.id
    }).exec((err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false, msg: "Something went wrong"});
        }

        Meta.findOneAndRemove({
            batch: asset.batch
        }).exec((err, meta) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false, msg: "Something went wrong"});
            }

            User.updateMany({favorites: id}, {$pull: {favorites: id}}, {new: true}).exec((err) => {
                if (err) {
                    logger.error(err);
                    return res.status(500).json({success: false, msg: "Something went wrong"});
                }
    
                Video.updateMany({assets: id}, {$pull: {assets: id}}, {new: true}).exec(async (err) => {
                    if (err) {
                        logger.error(err);
                        return res.status(500).json({success: false, msg: "Something went wrong"});
                    }
    
                    if (!assetFunctions.deleteFile(asset)) {
                        logger.error("Could not remove asset: " + asset.uid);
                    }
                    if (meta) {
                        if (!assetFunctions.deleteMetaFile(meta)) {
                            logger.error("Could not remove asset: " + asset.uid);
                        }
                    }

                    let assetCountResponse = await userFunctions.redoAssetCount(req.user.id);
                    if (!assetCountResponse) {
                        logger.error("Failed to update user asset count");
                    }

                    let batchUpdateResponse = await batchFunctions.deleteIfEmpty(asset.batch);
                    if (!batchUpdateResponse) {
                        logger.error("Failed to update user asset count");
                    }

                    return res.status(200).json({success: true});
                })
    
            })
        })
    })
})

router.get("/search/:videoId", validation.ensureAuthenticated, (req, res) => {
    let id = req.params.videoId;
    let query = req.query.q;
    if (!isValidObjectId(id) || !query) {
        return res.status(400).json({success: false});
    }

    Video.findOne({
        _id: id,
        createdBy: req.user.id
    }).select("assets").exec((err, video) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!video) {
            return res.status(404).json({success: false});
        }

        Asset.find({
            _id: {$not: {$in: video.assets}},
            $or: [
                {name: {$regex: query, $options: "i"}},
                {tagsString: {$regex: query, $options: "i"}}
            ]
        }).select("name meta cleanName").limit(25).exec((err, assets) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false});
            }
            return res.status(200).json({success: true, assets});
        })
    })
})

module.exports = router;