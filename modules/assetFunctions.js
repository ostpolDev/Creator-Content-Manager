const Asset = require("../models/asset");
const Batch = require('../models/batch');
const Meta = require('../models/meta');

const fileUpload = require('express-fileupload');
const uuid = require('uuid').v4;
const getMetaData = require('metadata-scraper');

const logger = require('../modules/logger');
const paths = require('../modules/paths');
const path = require("path");
const fs = require('fs');
const marked = require("../modules/marked");
const { isValidObjectId } = require("mongoose");

const commonToReplace = ["y2mate.com"];

const fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp", ".ogg", ".jpeg", ".pdn"];
const assetTypes = ["music", "soundEffect", "video", "image"];
const licenceTypes = {
    "Attribution": {url: "https://creativecommons.org/licenses/by/4.0", icon: "https://licensebuttons.net/l/by/3.0/88x31.png"},
    "Attribution-ShareAlike": {url: "https://creativecommons.org/licenses/by-sa/4.0", icon: "https://licensebuttons.net/l/by-sa/3.0/88x31.png"},
    "Attribution-NoDerivs": {url: "https://creativecommons.org/licenses/by-nd/4.0", icon: "https://licensebuttons.net/l/by-nd/3.0/88x31.png"},
    "Attribution-NonCommercial": {url: "https://creativecommons.org/licenses/by-nc/4.0", icon: "https://licensebuttons.net/l/by-nc/3.0/88x31.png"},
    "Attribution-NonCommercial-ShareAlike": {url: "https://creativecommons.org/licenses/by-nc-sa/4.0", icon: "https://licensebuttons.net/l/by-nc-sa/3.0/88x31.png"},
    "Attribution-NonCommercial-NoDerivs": {url: "https://creativecommons.org/licenses/by-nc-nd/4.0", icon: "https://licensebuttons.net/l/by-nc-nd/3.0/88x31.png"},
    "CC0": {url: "https://creativecommons.org/publicdomain/zero/1.0/", icon: "https://i.creativecommons.org/p/zero/1.0/88x31.png"}
}

const sorts = {
    "name": "name",
    "added date": "createdAt",
    "clean name": "cleanName",
    "unique id": "uuid",
    "size": "size",
    "type": "assetType",
    "file type": "mimetype",
    "extention": "extention",
    "original name": "originalName",
    "batch size": "batchSize"
}

const handleFiles = function(req) {
    return new Promise(async (res) => {

        let files = req.files.assets;
        if (!Array.isArray(files)) {
            files = [files];
        }

        let name = req.body.name;
        let batchName = req.body.batchName;
        let about = req.body.about;
        let legalInfo = req.body.legalInfo;
        let assetType = req.body.assetType;
        let tags = req.body.tags;
        let source = req.body.source;
        let price = req.body.price;
        let licence = req.body.licence;

        let canUseVideos = req.body.videos != undefined;
        let canUseStreaming = req.body.streaming != undefined;

        let isPurchased = false;
        if (!isNaN(price) && price > 0.0) {
            isPurchased = true;
        }

        if (!assetTypes.includes(assetType)) {
            return res({success: false, msg: "Invalid asset type"});
        }

        if (!Object.keys(licenceTypes).includes(licence)) {
            return res({success: false, msg: "Invalid licence"});
        }
        
        let batch = await makeBatch(req.user.id, batchName);
        if (!batch) {
            return res({success:false, msg: "Failed to create batch"});
        }

        if (!batch.skipped) {
            batch.skipped = [];
        }
        
        let meta;
        if (source) {
            meta = await makeMeta(source, batch.id);
            if (!meta) {
                return res({success: false, msg: "Could not get meta information"});
            }
        }

        let skipped = 0;
        let skippedSize = 0;
        let totalSize = 0;

        let currentIndex = 0;

        let start = new Date();

        function handleFile() {

            /**@type {fileUpload.UploadedFile} */ 
            let file = files[currentIndex];

            let uid = uuid();
            let extention = path.extname(file.name);
            let destinationPath = path.join(paths.upload, uid + extention);

            file.mv(destinationPath, (/**@type {Error} */ err) => {
                if (err) {
                    logger.error(err);
                    batch.skipped.push({
                        name: file.name,
                        reason: "Failed to move the file",
                        size: file.size,
                        mimetype: file.mimetype,
                        extention,
                        admin: {
                            error_message: err.msg || err.message,
                            error_stack: err.stack,
                            error_name: err.name
                        }
                    })
                    skipped += 1;
                    skippedSize += file.size;
                    next();
                } else { // The file is now on the server...

                    let newAsset = new Asset({
                        name: name || file.name,
                        cleanName: cleanName(file.name),
                        uuid: uid,
                        description: {
                            raw: about,
                            rendered: marked.markAndSanitize(about)
                        },
                        size: file.size,
                        mimetype: file.mimetype,
                        extention,
                        originalName: file.name,
                        createdBy: req.user.id,
                        batch: batch.id,
                        batchSize: files.length,
                        assetType,
                        legalInfo,
                        licence: licence,
                        source,
                        tags: tags.split(","),
                        tagsString: tags,
                        purchase: {
                            isPurchased,
                            price,
                            purchasedBy: req.user.id
                        },
                        unsafe: false,
                        meta: {
                            downloads: 0,
                            hasCustomName: name != undefined,
                            uploadedBy: {
                                username: req.user.username,
                                safeName: req.user.safeName
                            }
                        },
                        allowedPlatforms: {
                            videos: canUseVideos,
                            streams: canUseStreaming
                        }
                    })

                    newAsset.save((err) => {
                        if (err) {
                            logger.error(err);
                            batch.skipped.push({
                                name: file.name,
                                reason: "Failed to save the file to the database",
                                size: file.size,
                                mimetype: file.mimetype,
                                extention,
                                admin: {
                                    error_message: err.msg || err.message,
                                    error_stack: err.stack,
                                    error_name: err.name
                                }
                            })
                            skipped += 1;
                            skippedSize += file.size;

                            fs.unlinkSync(destinationPath);
                        } else {
                            totalSize += file.size;
                        }
                        next();
                    })

                }
            })
            
            function next() {
                currentIndex += 1;
                if (currentIndex >= files.length) {
                    done();
                } else {
                    handleFile();
                }
            }

        }

        function done() {
            let end = new Date();

            batch.skippedCount = skipped;
            batch.length = files.length - skipped;
            batch.attemptedLength = files.length;
            batch.fileSize = totalSize;
            batch.attemptedFileSize = totalSize + skippedSize;
            batch.missedFileSize = skippedSize;
            batch.uploadTime = {
                start,
                end,
                time: end.getTime() - start.getTime()
            }

            batch.save((err, _batch) => {
                if (err) {
                    logger.error(err);
                    // TODO: Delete all files that were uploaded;
                    return res({success: false, msg: "Failed to create the batch"})
                }
                return res({success: true, batchId: _batch.id});
            })

        }

        handleFile();

    })
}

const makeBatch = function(userId, name) {
    return new Promise((res) => {
        let newBatch = new Batch({
            createdBy: userId,
            name: name || uuid()
        })

        newBatch.save((err, batch) => {
            if (err) {
                logger.error(err);
                return res();
            }
            return res(batch);
        })
    })
}

const makeMeta = function(url, batchId) {
    return new Promise(async (res) => {
        let start = new Date();
        let metaData = await getMetaData(url);
        if (!metaData) {
            return res();
        }

        let uid = uuid();
        let metaPath = path.join(paths.meta, uid + ".json");
        fs.writeFile(metaPath, JSON.stringify(metaData), (err) => {
            if (err) {
                logger.error(err);
                return res();
            }

            let fileInfo = fs.stat(metaPath, (err, stats) => {
                if (err) {
                    logger.error(err);
                    return res();
                }

                let end = new Date();
                
                let newMeta = new Meta({
                    batch: batchId,
                    url,
                    uuid: uid,
                    requestInfo: {
                        lastRequest: start,
                        start,
                        end,
                        time: end.getTime() - start.getTime()
                    },
                    size: stats.size
                })

                newMeta.save((err, meta) => {
                    if (err) {
                        logger.error(err);
                        return res();
                    }
                    return res(meta);
                })
            })
        })
    })
}

const cleanName = function(name) {
    if (!name) {
        return "";
    }
    name = name.replace(/_/g, " ");
    name = name.replace(path.extname(name), "");
    commonToReplace.forEach(c => {
        name = name.replace(c, "");
    })
    name = name.replace(/^[_\.\-\*]/g, " ");
    return name.trim();
}

const getList = function(req) {
    return new Promise(async (res) => {
        let currentSort = req.query.sort;
        let currentOrder = req.query.order;
        let currentQuery = req.query.q;
        let searchQuery = req.query.query;

        let batch = req.query.batch;

        let skip = req.query.skip;
        let limit = req.query.limit;

        let allowedVideos = makeBoolean(req.query.videos);
        let allowedStreams = makeBoolean(req.query.streams);

        try {
            if (skip) {
                skip = parseInt(skip);
            } else {
                skip = 0;
            }

            if (limit) {
                limit = parseInt(limit);
            } else {
                limit = 20;
            }

            if (limit > 50) {
                limit = 50;
            }
        } catch (e) {
            logger.error(e);
            return res({success: false, msg: "Invalid parameters"});
        }
    
        if (!currentSort || !Object.keys(sorts).includes(currentSort)) {
            currentSort = "added date";
        } else {
            currentSort = currentSort.toLowerCase()
        }
    
        if (!currentOrder || (currentOrder != "1" && currentOrder != "-1")) {
            currentOrder = "-1";
        }
    
        currentOrder = parseInt(currentOrder);
    
        let assetQuery = {};

        if (searchQuery && searchQuery.trim() != "") {
            assetQuery.$or = [
                {title: {$regex: searchQuery, $options: "i"}},
                {youtubeTags: {$regex: searchQuery, $options: "i"}},
                {description: {$regex: searchQuery, $options: "i"}},
                {youtubeId: {$regex: searchQuery, $options: "i"}}
            ]
        }

        if (allowedVideos !== undefined) {
            assetQuery["allowedPlatforms.videos"] = allowedVideos;
        }

        if (allowedStreams !== undefined) {
            assetQuery["allowedPlatforms.streams"] = allowedStreams;
        }

        if (isValidObjectId(batch)) {
            assetQuery.batch = batch;
        }
    
    
        let assetSort = {}
    
        let field = sorts[currentSort];
    
        assetSort[field] = currentOrder;
    
        let selects = ["name", "cleanName", "fileType", "mimetype", "meta", "createdAt", "tags", "tagsString"];
        if (!field.startsWith("meta") && !selects.includes(field)) {
            selects.push(field);
        }
    
        Asset.find(assetQuery).sort(assetSort).select(selects.join(" ")).limit(limit).sort({createdAt: -1}).skip(skip).exec((_err, assets) => {
            if (_err) {
                return next(_err);
            }
            let params = {
                currentSort,
                currentOrder,
                currentQuery,
                field,
                assetQuery,
                assetSort,
                limit,
                skip
            }
            return res({success: true, params, assets})
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

module.exports = {handleFiles, makeBatch, makeMeta, cleanName, makeBoolean, fileTypes, assetTypes, licenceTypes, getList}