const express = require('express');
const router = express.Router();

const validation = require('../../modules/validation');
const logger = require('../../modules/logger');

const assetFunctions = require('../../modules/assetFunctions');

const Asset = require('../../models/asset');
const Batch = require('../../models/batch');

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

    Asset.findById(id).select("name cleanName uuid meta").populate("batch", "name length isAlbum cover").exec((err, asset) => {
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

router.post("/rename", validation.ensureAuthenticated, (req, res) => {
    let name = req.body.name;
    let id = req.body.asset;

    if (!isValidObjectId(id) || !name || name.length > 256) {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    Asset.findById(id).select("name cleanName meta createdBy").exec((err, asset) => {
        if (err) {
            logger.error(err);
            return res.status(500).json({success: false});
        }
        if (!asset) {
            return res.status(404).json({success: false});
        }
        if (!asset.createdBy == req.user.id) {
            return res.status(403).json({success: false, msg: "Access denied"});
        }

        asset.meta.hasCustomName = true;
        asset.name = name;

        asset.save((err) => {
            if (err) {
                logger.error(err);
                return res.status(500).json({success: false, msg: "Could not save"});
            }
            return res.status(200).json({success: true});
        })
    })
})

module.exports = router;