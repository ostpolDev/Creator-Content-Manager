const Asset = require("../models/asset");
const Batch = require('../models/batch');

const logger = require('../modules/logger');
const { isValidObjectId } = require("mongoose");

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
    
        let batchQuery = {};

        if (searchQuery && searchQuery.trim() != "") {
            batchQuery.$or = [
                {name: {$regex: searchQuery, $options: "i"}},
                {cleanName: {$regex: searchQuery, $options: "i"}},
                {"description.raw": {$regex: searchQuery, $options: "i"}},
                {uuid: {$regex: searchQuery, $options: "i"}}
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

module.exports = {makeBoolean, getList, sorts};