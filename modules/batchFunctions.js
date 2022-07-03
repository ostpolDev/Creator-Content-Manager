const Asset = require("../models/asset");
const Batch = require('../models/batch');

const logger = require('../modules/logger');
const { isValidObjectId, default: mongoose } = require("mongoose");

const path = require('path');
const fs = require('fs');
const paths = require('./paths');

const sorts = {
    "name": "name",
    "added date": "createdAt",
    "size": "fileSize",
    "album": "isAlbum",
    "length": "length"
}

const getList = function(req) {
    return new Promise(async (res) => {
        let currentSort = req.query.sort;
        let currentOrder = req.query.order;
        let currentQuery = req.query.q;
        let searchQuery = req.query.query;

        let skip = req.query.skip;
        let limit = req.query.limit;

        try {
            if (skip) {
                skip = parseInt(skip);
            } else {
                skip = 0;
            }

            if (limit) {
                limit = parseInt(limit);
            } else {
                limit = 10;
            }

            if (limit > 50) {
                limit = 50;
            }
        } catch (e) {
            logger.error(e);
            return res({success: false, msg: "Invalid parameters"});
        }
    
        if (!currentSort || !Object.keys(sorts).includes(currentSort)) {
            currentSort = "album";
        } else {
            currentSort = currentSort.toLowerCase()
        }
    
        if (!currentOrder || (currentOrder != "1" && currentOrder != "-1")) {
            currentOrder = "-1";
        }
    
        currentOrder = parseInt(currentOrder);
    
        let batchQuery = {length: {$gt: 1}};

        if (searchQuery && searchQuery.trim() != "") {
            batchQuery.$or = [
                {name: {$regex: searchQuery, $options: "i"}},
                {"customInfo.description.raw": {$regex: searchQuery, $options: "i"}}
            ]
        }
    
    
        let batchSort = {}
    
        let field = sorts[currentSort];
    
        batchSort[field] = currentOrder;
    
        let selects = ["name", "createdAt", "isAlbum", "customInfo", "length", "createdBy"];
        if (!selects.includes(field)) {
            selects.push(field);
        }
    
        Batch.find(batchQuery).sort(batchSort).select(selects.join(" ")).limit(limit).sort({createdAt: -1}).skip(skip).populate("createdBy", "name safeName").exec((_err, batches) => {
            if (_err) {
                return next(_err);
            }
            let params = {
                currentSort,
                currentOrder,
                currentQuery,
                field,
                batchQuery,
                batchSort,
                limit,
                skip
            }
            return res({success: true, params, batches})
        })
    })
}

const makeBoolean = function(string) {
    if (!string) {
        return undefined;
    }
    if (string == "true") {
        return true;
    } else if (string == "false") {
        return false;
    } else {
        return undefined;
    }
}

const deleteIfEmpty = function(id) {
    return new Promise((res) => {
        if (!isValidObjectId(id)) {
            return res(undefined);
        }

        Asset.countDocuments({batch: id}).exec((err, count) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            if (count <= 0) {
                Batch.findByIdAndRemove(id).exec((err, batch) => {
                    if (err) {
                        logger.error(err);
                        return res(undefined);
                    }
                    deleteCover(batch);
                    return res(true);
                })
            } else {
                return res(true);
            }
        })
    })
}

const deleteCover = function(batch) {
    let coverPath = path.join(paths.coverPath, batch.id + batch.cover.extention);
    if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
    }
}

const uploadTotalDownloads = function(batchId) {
    return new Promise((res) => {
        if (!isValidObjectId(batchId)) {
            return res(undefined);
        }

        Asset.aggregate([
            {$match: {batch: new mongoose.Types.ObjectId(batchId)}},
            {$group: {
                _id: null,
                downloads: {
                  $sum: "$meta.downloads"
                }
              }}
        ]).exec((err, result) => {
            if (err) {
                logger.error(err);
                return res(undefined);
            }
            
            Batch.findByIdAndUpdate(batchId, {$set: {totalDownloads: result[0].downloads}}).exec((err) => {
                if (err) {
                    logger.error(err);
                    return res(undefined);
                }
                return res(true);
            })

        })
    })
}

module.exports = {makeBoolean, getList, sorts, deleteIfEmpty, deleteCover, uploadTotalDownloads};