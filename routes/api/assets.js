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
        field: assetListResult.params.field
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

module.exports = router;