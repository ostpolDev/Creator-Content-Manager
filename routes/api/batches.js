const express = require('express');
const router = express.Router();

const batchFunctions = require('../../modules/batchFunctions');
const renderer = require('../../modules/pugRenderer');
const logger = require('../../modules/logger');

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
        field: batchListResult.params.field
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

module.exports = router;